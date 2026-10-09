<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Models\BillingLedgerItem;
use App\Models\Invoice;
use App\Models\OpdVisit;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionInvestigation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "12. OPD Quick Billing Counter",
    description: "OPD Token Quick Bill Desk: 1-click fetch of consultation fee and doctor advised lab/radiology tests, payment collection, and instant receipt generation."
)]
class OpdBillingController extends Controller
{
    use HasApiResponse;

    /**
     * Get pending OPD orders for billing counter
     */
    public function getPendingOrders(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $search = trim($request->query('search', ''));
        $date = $request->query('date', date('Y-m-d'));
        $statusFilter = $request->query('status', 'all'); // 'all', 'pending', 'billed'

        $query = OpdVisit::where('hospital_id', $hospitalId)
            ->with([
                'patient:id,name,uhid,mobile,gender,dob',
                'doctor:id,name,department_id',
                'doctor.department:id,name',
                'prescription.investigations',
                'prescription.diagnoses',
            ]);

        // Filter by date unless search is active across all dates
        if (!empty($date) && empty($search)) {
            $query->where(function ($q) use ($date) {
                $q->whereDate('visit_date', $date)
                  ->orWhereDate('created_at', $date);
            });
        }

        // Search by Token, OPD #, Patient Name, UHID, Mobile
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('opd_number', 'ilike', "%{$search}%")
                  ->orWhere('queue_token', 'ilike', "%{$search}%")
                  ->orWhereHas('patient', function ($pq) use ($search) {
                      $pq->where('name', 'ilike', "%{$search}%")
                         ->orWhere('uhid', 'ilike', "%{$search}%")
                         ->orWhere('mobile', 'ilike', "%{$search}%");
                  });
            });
        }

        $visits = $query->orderBy('created_at', 'desc')->limit(60)->get();

        $result = $visits->map(function ($visit) {
            $rx = $visit->prescription;
            $allInvestigations = $rx ? $rx->investigations : collect([]);
            
            $unbilledInvestigations = $allInvestigations->filter(function ($inv) {
                return $inv->status !== 'billed' && empty($inv->billed_invoice_id);
            })->values();

            $billedInvestigations = $allInvestigations->filter(function ($inv) {
                return $inv->status === 'billed' || !empty($inv->billed_invoice_id);
            })->values();

            $consultationFee = (float) ($visit->fee_charged ?? 0);
            $amountPaid = (float) ($visit->amount_paid ?? 0);
            $unpaidConsultation = max(0, $consultationFee - $amountPaid);

            $hasPendingItems = $unpaidConsultation > 0 || $unbilledInvestigations->count() > 0;

            return [
                'visit_id'                  => $visit->id,
                'opd_number'                => $visit->opd_number,
                'queue_token'               => $visit->queue_token,
                'token_no'                  => (string) ($visit->queue_token ?? $visit->opd_number),
                'visit_date'                => $visit->visit_date ? $visit->visit_date->format('Y-m-d') : $visit->created_at->format('Y-m-d'),
                'visit_status'              => $visit->status,
                'patient'                   => [
                    'id'     => $visit->patient?->id,
                    'name'   => $visit->patient?->name,
                    'uhid'   => $visit->patient?->uhid,
                    'mobile' => $visit->patient?->mobile,
                    'gender' => $visit->patient?->gender,
                    'age'    => $visit->patient?->age,
                ],
                'doctor'                    => [
                    'id'         => $visit->doctor?->id,
                    'name'       => $visit->doctor?->name,
                    'department' => $visit->doctor?->department?->name,
                ],
                'consultation_fee'          => $consultationFee,
                'consultation_amount_paid'  => $amountPaid,
                'unpaid_consultation_fee'   => $unpaidConsultation,
                'consultation_payment_status'=> $visit->payment_status ?? 'pending',
                'prescription'              => $rx ? [
                    'id'                  => $rx->id,
                    'prescription_number' => $rx->prescription_number,
                    'disposition'         => $rx->disposition ?? 'home',
                    'disposition_notes'   => $rx->disposition_notes,
                    'admit_priority'      => $rx->admit_priority,
                    'recommended_ward'    => $rx->recommended_ward,
                    'diagnoses'           => $rx->diagnoses->map(fn($d) => [
                        'code' => $d->icd_code,
                        'name' => $d->diagnosis_name,
                    ]),
                ] : null,
                'unbilled_investigations'   => $unbilledInvestigations,
                'billed_investigations'     => $billedInvestigations,
                'has_pending_items'         => $hasPendingItems,
                'total_pending_amount'      => $unpaidConsultation + $unbilledInvestigations->sum('standard_rate'),
            ];
        });

        if ($statusFilter === 'pending') {
            $result = $result->filter(fn($item) => $item['has_pending_items'])->values();
        } elseif ($statusFilter === 'billed') {
            $result = $result->filter(fn($item) => !$item['has_pending_items'])->values();
        }

        return $this->successResponse($result, 'OPD pending billing orders retrieved successfully');
    }

    /**
     * Create OPD Tax Invoice & Settle Payment (1-Click OPD Quick Billing)
     */
    public function createOpdBill(Request $request)
    {
        $validated = $request->validate([
            'opd_visit_id'             => 'required|integer|exists:opd_visits,id',
            'patient_id'              => 'required|integer|exists:patients,id',
            'bill_consultation_fee'   => 'nullable|boolean',
            'consultation_fee_amount' => 'nullable|numeric|min:0',
            'investigations'          => 'nullable|array',
            'investigations.*.id'     => 'nullable|integer',
            'investigations.*.test_name' => 'required|string|max:255',
            'investigations.*.test_code' => 'nullable|string|max:100',
            'investigations.*.category'  => 'nullable|string|max:100',
            'investigations.*.rate'      => 'required|numeric|min:0',
            'custom_items'            => 'nullable|array',
            'custom_items.*.item_name'=> 'required|string|max:255',
            'custom_items.*.category' => 'nullable|string|max:100',
            'custom_items.*.unit_price'=> 'required|numeric|min:0',
            'custom_items.*.quantity' => 'nullable|numeric|min:1',
            'discount_amount'         => 'nullable|numeric|min:0',
            'discount_reason'         => 'nullable|string|max:255',
            'tax_amount'              => 'nullable|numeric|min:0',
            'payment_method'          => 'required|string|max:50',
            'payment_breakdown'       => 'nullable|array',
            'notes'                   => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id;

        $visit = OpdVisit::where('hospital_id', $hospitalId)->findOrFail($validated['opd_visit_id']);

        return DB::transaction(function () use ($hospitalId, $userId, $visit, $validated) {
            // 1. Calculate Gross Items
            $itemsToCharge = [];
            $grossTotal = 0;

            // A. Consultation fee
            $billConsultation = $validated['bill_consultation_fee'] ?? false;
            $consultationAmount = (float) ($validated['consultation_fee_amount'] ?? $visit->fee_charged ?? 0);
            if ($billConsultation && $consultationAmount > 0) {
                $itemsToCharge[] = [
                    'category'   => 'opd_consultation',
                    'item_name'  => 'OPD Doctor Consultation Fee',
                    'unit_price' => $consultationAmount,
                    'quantity'   => 1,
                    'total'      => $consultationAmount,
                    'type'       => 'consultation',
                ];
                $grossTotal += $consultationAmount;
            }

            // B. Diagnostic Investigations
            $invList = $validated['investigations'] ?? [];
            foreach ($invList as $inv) {
                $rate = (float) ($inv['rate'] ?? 0);
                $category = $inv['category'] ?? 'Pathology';
                $itemsToCharge[] = [
                    'category'   => strtolower($category) === 'radiology' ? 'radiology_charges' : 'investigation_charges',
                    'item_name'  => $inv['test_name'],
                    'unit_price' => $rate,
                    'quantity'   => 1,
                    'total'      => $rate,
                    'type'       => 'investigation',
                    'inv_id'     => $inv['id'] ?? null,
                    'rate'       => $rate,
                ];
                $grossTotal += $rate;
            }

            // C. Custom Items (Medicines, Consumables, Injections, Dressing)
            $customList = $validated['custom_items'] ?? [];
            foreach ($customList as $c) {
                $qty = (float) ($c['quantity'] ?? 1);
                $price = (float) ($c['unit_price'] ?? 0);
                $sub = $price * $qty;
                $itemsToCharge[] = [
                    'category'   => $c['category'] ?? 'hospital_services',
                    'item_name'  => $c['item_name'],
                    'unit_price' => $price,
                    'quantity'   => $qty,
                    'total'      => $sub,
                    'type'       => 'custom',
                ];
                $grossTotal += $sub;
            }

            if (count($itemsToCharge) === 0) {
                abort(422, 'No billable items selected for this invoice.');
            }

            $discount = (float) ($validated['discount_amount'] ?? 0);
            $tax = (float) ($validated['tax_amount'] ?? 0);
            $netAmount = max(0, ($grossTotal - $discount) + $tax);

            // 2. Generate Master Tax Invoice
            $invoice = Invoice::create([
                'hospital_id'        => $hospitalId,
                'patient_id'         => $validated['patient_id'],
                'encounter_type'     => 'opd',
                'encounter_id'       => $visit->id,
                'invoice_date'       => now(),
                'gross_amount'       => $grossTotal,
                'discount_amount'    => $discount,
                'discount_reason'    => $validated['discount_reason'] ?? null,
                'tax_amount'         => $tax,
                'net_amount'         => $netAmount,
                'amount_paid'        => $netAmount,
                'balance_due'        => 0,
                'payment_method'     => $validated['payment_method'],
                'payment_breakdown'  => $validated['payment_breakdown'] ?? null,
                'payment_status'     => 'paid',
                'status'             => 'issued',
                'created_by_user_id' => $userId,
                'notes'              => $validated['notes'] ?? 'OPD Counter Quick Bill Settlement',
            ]);

            // 3. Post Ledger Items & Update References
            foreach ($itemsToCharge as $charge) {
                BillingLedgerItem::create([
                    'hospital_id'        => $hospitalId,
                    'patient_id'         => $validated['patient_id'],
                    'encounter_type'     => 'opd',
                    'encounter_id'       => $visit->id,
                    'category'           => $charge['category'],
                    'item_name'          => $charge['item_name'],
                    'unit_price'         => $charge['unit_price'],
                    'quantity'           => $charge['quantity'],
                    'tax_amount'         => 0,
                    'discount_amount'    => 0,
                    'total_amount'       => $charge['total'],
                    'charged_at'         => now(),
                    'charged_by_user_id' => $userId,
                    'auto_generated'     => true,
                    'status'             => 'billed',
                    'invoice_id'         => $invoice->id,
                ]);

                // Update Investigation records as billed
                if ($charge['type'] === 'investigation' && !empty($charge['inv_id'])) {
                    PrescriptionInvestigation::where('hospital_id', $hospitalId)
                        ->where('id', $charge['inv_id'])
                        ->update([
                            'status'            => 'billed',
                            'billed_invoice_id' => $invoice->id,
                            'standard_rate'     => $charge['rate'],
                        ]);
                }
            }

            // 4. Update OPD Visit payment status if consultation fee was charged
            if ($billConsultation && $consultationAmount > 0) {
                $visit->update([
                    'amount_paid'    => ($visit->amount_paid ?? 0) + $consultationAmount,
                    'payment_status' => 'paid',
                    'payment_method' => $validated['payment_method'],
                ]);
            }

            // 5. Load complete response for receipt printing
            $invoice->load([
                'patient',
                'ledgerItems',
                'createdByUser:id,name',
            ]);

            $receipt = [
                'invoice_id'         => $invoice->id,
                'invoice_number'     => $invoice->invoice_number,
                'invoice_date'       => $invoice->invoice_date->toISOString(),
                'encounter_type'     => 'OPD',
                'token_no'           => (string) ($visit->queue_token ?? $visit->opd_number),
                'opd_number'         => $visit->opd_number,
                'patient'            => [
                    'id'             => $visit->patient?->id,
                    'name'           => $visit->patient?->name,
                    'uhid'           => $visit->patient?->uhid,
                    'mobile'         => $visit->patient?->mobile,
                    'gender'         => $visit->patient?->gender,
                    'age'            => $visit->patient?->age,
                ],
                'doctor'             => [
                    'name'           => $visit->doctor?->name,
                    'department'     => $visit->doctor?->department?->name,
                ],
                'items'              => $invoice->ledgerItems->map(fn($item) => [
                    'item_name'      => $item->item_name,
                    'category'       => $item->category,
                    'quantity'       => $item->quantity,
                    'unit_price'     => $item->unit_price,
                    'total_amount'   => $item->total_amount,
                ]),
                'gross_amount'       => $invoice->gross_amount,
                'discount_amount'    => $invoice->discount_amount,
                'discount_reason'    => $invoice->discount_reason,
                'tax_amount'         => $invoice->tax_amount,
                'net_amount'         => $invoice->net_amount,
                'amount_paid'        => $invoice->amount_paid,
                'balance_due'        => $invoice->balance_due,
                'payment_method'     => $invoice->payment_method,
                'payment_breakdown'  => $invoice->payment_breakdown,
                'billed_by'          => $invoice->createdByUser?->name ?? 'Billing Cashier',
            ];

            return $this->createdResponse($receipt, 'OPD Bill created and payment settled successfully');
        });
    }
}
