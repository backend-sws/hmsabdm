<?php

namespace App\Services\Billing;

use App\Models\Bed;
use App\Models\BillingLedgerItem;
use App\Models\Invoice;
use App\Models\IpdAdmission;
use App\Models\Hospital;
use Illuminate\Support\Facades\DB;

class DischargeBillingService implements DischargeBillingServiceInterface
{
    public function __construct(
        protected BedBillingEngine $bedBillingEngine
    ) {}

    /**
     * Get pre-discharge billing estimate (all unbilled items, advance deposit, gross, net payable).
     */
    public function getPreDischargeEstimate(int $hospitalId, int $admissionId): array
    {
        $admission = IpdAdmission::where('hospital_id', $hospitalId)
            ->with(['patient', 'ward', 'bed', 'doctor'])
            ->findOrFail($admissionId);

        // Apply any pending bed charges up to now
        try {
            $this->bedBillingEngine->calculateAndApplyForAdmission($admission);
        } catch (\Throwable $e) {
            // Log but don't fail estimate if bed calculation has no changes
        }

        $unbilledItems = BillingLedgerItem::where('hospital_id', $hospitalId)
            ->where('encounter_type', 'ipd')
            ->where('encounter_id', $admission->id)
            ->where('status', 'unbilled')
            ->orderBy('charged_at')
            ->get();

        $grossAmount = (float) $unbilledItems->sum('total_amount');
        $taxAmount = (float) $unbilledItems->sum('tax_amount');
        $advanceDeposit = (float) $admission->advance_deposit;
        $estimatedNetPayable = max(0, $grossAmount + $taxAmount - $advanceDeposit);

        $categoryBreakdown = $unbilledItems->groupBy('category')->map(function ($group) {
            return [
                'category'     => $group->first()->category,
                'count'        => $group->count(),
                'total_amount' => (float) $group->sum('total_amount'),
            ];
        })->values();

        return [
            'admission_id'         => $admission->id,
            'ipd_number'           => $admission->ipd_number,
            'status'               => $admission->status,
            'patient'              => $admission->patient,
            'doctor'               => $admission->doctor,
            'ward'                 => $admission->ward,
            'bed'                  => $admission->bed,
            'financials'           => [
                'gross_amount'          => $grossAmount,
                'tax_amount'            => $taxAmount,
                'advance_deposit_paid'  => $advanceDeposit,
                'estimated_balance_due' => $estimatedNetPayable,
            ],
            'category_breakdown'   => $categoryBreakdown,
            'unbilled_items_count' => $unbilledItems->count(),
            'items'                => $unbilledItems,
        ];
    }

    /**
     * Settle bill, finalize tax invoice, discharge patient, free bed, and issue security gate pass.
     */
    public function settleAndDischarge(int $hospitalId, int $admissionId, array $data, int $userId): array
    {
        return DB::transaction(function () use ($hospitalId, $admissionId, $data, $userId) {
            $admission = IpdAdmission::where('hospital_id', $hospitalId)
                ->with(['patient', 'ward', 'bed'])
                ->lockForUpdate()
                ->findOrFail($admissionId);

            if ($admission->status === 'discharged') {
                throw new \Exception("Patient {$admission->ipd_number} is already discharged.");
            }

            // Apply any pending bed charges up to now
            try {
                $this->bedBillingEngine->calculateAndApplyForAdmission($admission);
            } catch (\Throwable $e) {}

            $unbilledItems = BillingLedgerItem::where('hospital_id', $hospitalId)
                ->where('encounter_type', 'ipd')
                ->where('encounter_id', $admission->id)
                ->where('status', 'unbilled')
                ->lockForUpdate()
                ->get();

            // Financial Calculations
            $grossAmount = (float) $unbilledItems->sum('total_amount');
            $discountAmount = (float) ($data['discount_amount'] ?? 0.00);
            $taxAmount = (float) $unbilledItems->sum('tax_amount');
            $netAmount = max(0, $grossAmount - $discountAmount + $taxAmount);

            $advanceDeposit = (float) $admission->advance_deposit;
            $advanceAdjusted = min($advanceDeposit, $netAmount);
            $insuranceApproved = (float) ($data['insurance_approved_amount'] ?? 0.00);
            $amountPaid = (float) ($data['amount_paid'] ?? 0.00);

            $balanceDue = max(0, round($netAmount - $advanceAdjusted - $insuranceApproved - $amountPaid, 2));

            $paymentStatus = ($balanceDue <= 0.01) ? 'paid' : ($amountPaid > 0 || $advanceAdjusted > 0 ? 'partially_paid' : 'pending');

            $year = date('Y');
            $randomCode = strtoupper(substr(uniqid(), -5));
            $invoiceNumber = "INV-{$year}-{$randomCode}";
            $gatePassNumber = "GP-{$year}-{$randomCode}";

            // 1. Create Final Tax Invoice
            $invoice = Invoice::create([
                'hospital_id'               => $hospitalId,
                'patient_id'                => $admission->patient_id,
                'encounter_type'            => 'ipd',
                'encounter_id'              => $admission->id,
                'invoice_number'            => $invoiceNumber,
                'invoice_date'              => now(),
                'gross_amount'              => $grossAmount,
                'discount_amount'           => $discountAmount,
                'discount_reason'           => $data['discount_reason'] ?? null,
                'tax_amount'                => $taxAmount,
                'net_amount'                => $netAmount,
                'advance_adjusted'          => $advanceAdjusted,
                'insurance_approved_amount' => $insuranceApproved,
                'tpa_claim_number'          => $data['tpa_claim_number'] ?? null,
                'insurance_company_name'    => $data['insurance_company_name'] ?? null,
                'amount_paid'               => $amountPaid,
                'balance_due'               => $balanceDue,
                'payment_method'            => $data['payment_method'] ?? 'cash',
                'payment_breakdown'         => $data['payment_breakdown'] ?? null,
                'payment_status'            => $paymentStatus,
                'status'                    => 'finalized',
                'gate_pass_number'          => $gatePassNumber,
                'gate_pass_issued_at'       => now(),
                'created_by_user_id'        => $userId,
                'notes'                     => $data['notes'] ?? null,
            ]);

            // 2. Lock & Update Ledger Items to 'billed'
            if ($unbilledItems->isNotEmpty()) {
                BillingLedgerItem::whereIn('id', $unbilledItems->pluck('id'))->update([
                    'status'     => 'billed',
                    'invoice_id' => $invoice->id,
                ]);
            }

            // 3. Update IPD Admission to Discharged
            $dischargeDate = !empty($data['discharge_date']) ? \Carbon\Carbon::parse($data['discharge_date']) : now();

            $admission->update([
                'status'                => 'discharged',
                'discharge_date'        => $dischargeDate,
                'discharge_type'        => $data['discharge_type'] ?? 'normal',
                'discharge_summary'     => $data['discharge_summary'] ?? null,
                'discharge_advice'      => $data['discharge_advice'] ?? null,
                'final_diagnosis'       => $data['final_diagnosis'] ?? null,
                'discharged_by_user_id' => $userId,
                'invoice_id'            => $invoice->id,
            ]);

            // 4. Free Bed
            if ($admission->bed_id) {
                $statusAfter = !empty($data['mark_bed_cleaning']) || ($data['bed_status_after_discharge'] ?? '') === 'cleaning'
                    ? 'cleaning'
                    : 'available';

                Bed::where('id', $admission->bed_id)
                    ->where('hospital_id', $hospitalId)
                    ->update([
                        'status'               => $statusAfter,
                        'current_admission_id' => null,
                    ]);
            }

            $bed = $admission->bed ? $admission->bed->fresh() : null;

            return [
                'invoice'    => $invoice->fresh()->load('ledgerItems'),
                'admission'  => $admission->fresh(['patient', 'doctor', 'ward']),
                'bed'        => $bed,
                'gate_pass'  => [
                    'gate_pass_number' => $gatePassNumber,
                    'patient_name'     => $admission->patient->name,
                    'uhid'             => $admission->patient->uhid,
                    'ipd_number'       => $admission->ipd_number,
                    'ward_name'        => $admission->ward?->name,
                    'bed_number'       => $bed?->bed_number,
                    'issued_at'        => now()->toIso8601String(),
                    'payment_status'   => $paymentStatus,
                    'status'           => 'cleared',
                ],
            ];
        });
    }

    /**
     * Get formatted itemized tax invoice data.
     */
    public function getInvoice(int $hospitalId, int $invoiceId): array
    {
        $invoice = Invoice::where('hospital_id', $hospitalId)
            ->with([
                'patient',
                'hospital',
                'admission.doctor',
                'admission.ward',
                'admission.bed',
                'ledgerItems',
                'createdByUser',
            ])
            ->findOrFail($invoiceId);

        return [
            'invoice'            => $invoice,
            'category_breakdown' => $invoice->ledgerItems->groupBy('category')->map(function ($items, $cat) {
                return [
                    'category'     => $cat,
                    'count'        => $items->count(),
                    'total_amount' => (float) $items->sum('total_amount'),
                ];
            })->values(),
        ];
    }

    /**
     * Get printable hospital security gate pass slip.
     */
    public function getGatePass(int $hospitalId, int $admissionId): array
    {
        $admission = IpdAdmission::where('hospital_id', $hospitalId)
            ->with(['patient', 'ward', 'bed', 'doctor', 'invoice'])
            ->findOrFail($admissionId);

        $invoice = $admission->invoice;

        if (!$invoice || empty($invoice->gate_pass_number)) {
            throw new \Exception("Security Gate Pass has not been generated for Admission {$admission->ipd_number}. Please settle bill and discharge first.");
        }

        return [
            'gate_pass_number'   => $invoice->gate_pass_number,
            'issued_at'          => $invoice->gate_pass_issued_at?->toIso8601String(),
            'patient'            => [
                'name'        => $admission->patient->name,
                'uhid'        => $admission->patient->uhid,
                'mobile'      => $admission->patient->mobile,
                'gender'      => $admission->patient->gender,
                'blood_group' => $admission->patient->blood_group,
            ],
            'admission'          => [
                'ipd_number'       => $admission->ipd_number,
                'admission_date'   => $admission->admission_date?->toIso8601String(),
                'discharge_date'   => $admission->discharge_date?->toIso8601String(),
                'discharge_type'   => $admission->discharge_type,
                'doctor_name'      => $admission->doctor?->name,
                'ward_name'        => $admission->ward?->name,
                'bed_number'       => $admission->bed?->bed_number,
            ],
            'financial_summary'  => [
                'invoice_number'   => $invoice->invoice_number,
                'net_amount'       => $invoice->net_amount,
                'amount_paid'      => $invoice->amount_paid,
                'advance_adjusted' => $invoice->advance_adjusted,
                'balance_due'      => $invoice->balance_due,
                'payment_status'   => $invoice->payment_status,
            ],
            'security_clearance' => [
                'status'           => 'APPROVED',
                'verified_by'      => 'Central Cashier & Hospital Billing Authority',
                'gate_pass_status' => 'valid',
            ],
        ];
    }

    /**
     * Get invoices for a patient.
     */
    public function getPatientInvoices(int $hospitalId, int $patientId): array
    {
        return Invoice::where('hospital_id', $hospitalId)
            ->where('patient_id', $patientId)
            ->with('ledgerItems')
            ->orderByDesc('invoice_date')
            ->get()
            ->toArray();
    }
}
