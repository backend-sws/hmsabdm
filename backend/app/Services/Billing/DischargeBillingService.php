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
            ->with(['ledgerItems', 'createdByUser', 'patient'])
            ->orderByDesc('invoice_date')
            ->get()
            ->toArray();
    }

    /**
     * Get paginated global invoices list with filters, search, and revenue KPI totals.
     */
    public function getInvoices(int $hospitalId, array $filters): array
    {
        $query = Invoice::where('hospital_id', $hospitalId)
            ->with([
                'patient',
                'admission.ward',
                'admission.bed',
                'admission.doctor',
                'createdByUser',
                'ledgerItems',
            ]);

        // Search by Invoice #, Patient Name, UHID, or Mobile
        if (!empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('invoice_number', 'LIKE', "%{$term}%")
                  ->orWhere('gate_pass_number', 'LIKE', "%{$term}%")
                  ->orWhereHas('patient', function ($pq) use ($term) {
                      $pq->where('name', 'LIKE', "%{$term}%")
                         ->orWhere('uhid', 'LIKE', "%{$term}%")
                         ->orWhere('mobile', 'LIKE', "%{$term}%");
                  });
            });
        }

        // Filter by Payment Status
        if (!empty($filters['payment_status']) && $filters['payment_status'] !== 'all') {
            $query->where('payment_status', $filters['payment_status']);
        }

        // Filter by Encounter Type
        if (!empty($filters['encounter_type']) && $filters['encounter_type'] !== 'all') {
            $query->where('encounter_type', $filters['encounter_type']);
        }

        // Filter by Date Range
        if (!empty($filters['date_from'])) {
            $query->whereDate('invoice_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('invoice_date', '<=', $filters['date_to']);
        }

        // Summary KPI Aggregations across all matching records
        $summaryQuery = clone $query;
        $totalGross = (float) $summaryQuery->sum('gross_amount');
        $totalDiscount = (float) $summaryQuery->sum('discount_amount');
        $totalNet = (float) $summaryQuery->sum('net_amount');
        $totalAdvanceAdjusted = (float) $summaryQuery->sum('advance_adjusted');
        $totalInsuranceApproved = (float) $summaryQuery->sum('insurance_approved_amount');
        $totalPaid = (float) $summaryQuery->sum('amount_paid');
        $totalBalanceDue = (float) $summaryQuery->sum('balance_due');
        $totalCount = (int) $summaryQuery->count();

        // Pagination
        $perPage = max(1, min(100, (int) ($filters['per_page'] ?? 15)));
        $page = max(1, (int) ($filters['page'] ?? 1));

        $invoices = $query->orderByDesc('invoice_date')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        return [
            'data'       => $invoices,
            'summary'    => [
                'total_invoices_count'      => $totalCount,
                'total_gross_amount'        => round($totalGross, 2),
                'total_discount_amount'     => round($totalDiscount, 2),
                'total_net_amount'          => round($totalNet, 2),
                'total_advance_adjusted'    => round($totalAdvanceAdjusted, 2),
                'total_insurance_approved'  => round($totalInsuranceApproved, 2),
                'total_amount_paid'         => round($totalPaid, 2),
                'total_balance_due'         => round($totalBalanceDue, 2),
            ],
            'pagination' => [
                'current_page' => $page,
                'per_page'     => $perPage,
                'total'        => $totalCount,
                'last_page'    => (int) ceil($totalCount / $perPage),
            ],
        ];
    }

    /**
     * Get Cashier Day-End closing reconciliation summary.
     */
    public function getDayEndSummary(int $hospitalId, string $date, ?int $userId): array
    {
        $targetDate = !empty($date) ? \Carbon\Carbon::parse($date)->toDateString() : now()->toDateString();

        $invoiceQuery = Invoice::where('hospital_id', $hospitalId)
            ->whereDate('invoice_date', $targetDate)
            ->with(['patient', 'createdByUser']);

        if ($userId) {
            $invoiceQuery->where('created_by_user_id', $userId);
        }

        $invoices = $invoiceQuery->get();

        // 1. Financial Totals
        $grossBilled = (float) $invoices->sum('gross_amount');
        $discountsGiven = (float) $invoices->sum('discount_amount');
        $taxTotal = (float) $invoices->sum('tax_amount');
        $netBilled = (float) $invoices->sum('net_amount');
        $totalPaid = (float) $invoices->sum('amount_paid');
        $advanceAdjusted = (float) $invoices->sum('advance_adjusted');
        $insuranceCredit = (float) $invoices->sum('insurance_approved_amount');
        $balanceDue = (float) $invoices->sum('balance_due');

        // 2. Breakdown by Payment Mode
        $modeBreakdown = [
            'cash'          => 0.0,
            'upi'           => 0.0,
            'card'          => 0.0,
            'bank_transfer' => 0.0,
            'insurance'     => $insuranceCredit,
            'other'         => 0.0,
        ];

        foreach ($invoices as $inv) {
            $method = strtolower($inv->payment_method ?? 'cash');
            if (isset($modeBreakdown[$method])) {
                $modeBreakdown[$method] += (float) $inv->amount_paid;
            } else {
                $modeBreakdown['other'] += (float) $inv->amount_paid;
            }
        }

        // 3. Breakdown by Department / Encounter
        $deptBreakdown = $invoices->groupBy('encounter_type')->map(function ($items, $type) {
            return [
                'encounter_type' => $type,
                'count'          => $items->count(),
                'net_amount'     => (float) $items->sum('net_amount'),
                'amount_paid'    => (float) $items->sum('amount_paid'),
            ];
        })->values();

        // 4. Advance Deposits Collected on that Date
        $depositQuery = BillingLedgerItem::where('hospital_id', $hospitalId)
            ->where('category', 'payment_deposit')
            ->whereDate('charged_at', $targetDate)
            ->with(['patient', 'chargedBy']);

        if ($userId) {
            $depositQuery->where('charged_by_user_id', $userId);
        }

        $deposits = $depositQuery->get();
        $totalDepositsCollected = (float) abs($deposits->sum('total_amount'));

        // 5. Staff / Cashier Wise Collections
        $cashierBreakdown = $invoices->groupBy('created_by_user_id')->map(function ($items) {
            $first = $items->first();
            return [
                'user_id'     => $first->created_by_user_id,
                'user_name'   => $first->createdByUser?->name ?? 'Cashier Desk',
                'invoices'    => $items->count(),
                'net_billed'  => (float) $items->sum('net_amount'),
                'amount_paid' => (float) $items->sum('amount_paid'),
            ];
        })->values();

        // Hospital Metadata
        $hospital = Hospital::find($hospitalId);

        return [
            'date'                     => $targetDate,
            'hospital'                 => [
                'name'        => $hospital?->name ?? 'Hospital Care',
                'code'        => $hospital?->code ?? 'HOSP',
                'abdm_hip_id' => $hospital?->abdm_hip_id ?? 'HIP-DEFAULT',
                'address'     => $hospital?->address ?? '',
                'city'        => $hospital?->city ?? '',
                'state'       => $hospital?->state ?? '',
                'pincode'     => $hospital?->pincode ?? '',
            ],
            'financial_totals'         => [
                'total_invoices'           => $invoices->count(),
                'gross_billed'             => round($grossBilled, 2),
                'discounts_given'          => round($discountsGiven, 2),
                'tax_total'                => round($taxTotal, 2),
                'net_billed'               => round($netBilled, 2),
                'advance_adjusted'         => round($advanceAdjusted, 2),
                'insurance_credit'         => round($insuranceCredit, 2),
                'total_collections'        => round($totalPaid, 2),
                'balance_outstanding'      => round($balanceDue, 2),
                'advance_deposits_day'     => round($totalDepositsCollected, 2),
                'grand_total_cash_drawer'  => round($modeBreakdown['cash'], 2),
                'grand_total_digital'      => round($modeBreakdown['upi'] + $modeBreakdown['card'] + $modeBreakdown['bank_transfer'], 2),
            ],
            'payment_mode_breakdown'   => $modeBreakdown,
            'department_breakdown'     => $deptBreakdown,
            'cashier_breakdown'        => $cashierBreakdown,
            'recent_deposits'          => $deposits->map(function ($d) {
                return [
                    'id'             => $d->id,
                    'patient_name'   => $d->patient?->name,
                    'uhid'           => $d->patient?->uhid,
                    'amount'         => abs($d->total_amount),
                    'voucher_title'  => $d->item_name,
                    'charged_at'     => $d->charged_at?->toIso8601String(),
                    'collected_by'   => $d->chargedBy?->name ?? 'Cashier',
                ];
            }),
            'generated_at'             => now()->toIso8601String(),
        ];
    }

    /**
     * Collect advance deposit for IPD/OPD/Emergency encounter and generate printable deposit voucher.
     */
    public function collectAdvanceDeposit(int $hospitalId, array $data, int $userId): array
    {
        return DB::transaction(function () use ($hospitalId, $data, $userId) {
            $patientId = (int) $data['patient_id'];
            $amount = abs((float) $data['amount']);
            $encounterType = $data['encounter_type'] ?? 'ipd';
            $encounterId = !empty($data['encounter_id']) ? (int) $data['encounter_id'] : null;
            $paymentMethod = $data['payment_method'] ?? 'cash';
            $reference = $data['transaction_reference'] ?? null;
            $notes = $data['notes'] ?? null;

            $patient = \App\Models\Patient::where('hospital_id', $hospitalId)->findOrFail($patientId);

            $year = date('Y');
            $randomCode = strtoupper(substr(uniqid(), -5));
            $voucherNumber = "DEP-{$year}-{$randomCode}";

            // If IPD, sync advance deposit with IpdAdmission
            $admission = null;
            if ($encounterType === 'ipd') {
                if ($encounterId) {
                    $admission = IpdAdmission::where('hospital_id', $hospitalId)->find($encounterId);
                } else {
                    $admission = IpdAdmission::where('hospital_id', $hospitalId)
                        ->where('patient_id', $patientId)
                        ->where('status', 'admitted')
                        ->latest()
                        ->first();
                }

                if ($admission) {
                    $admission->increment('advance_deposit', $amount);
                    $encounterId = $admission->id;
                }
            }

            // Post negative credit entry in BillingLedgerItem
            $ledgerItem = BillingLedgerItem::create([
                'hospital_id'         => $hospitalId,
                'patient_id'          => $patientId,
                'encounter_type'      => $encounterType,
                'encounter_id'        => $encounterId,
                'category'            => 'payment_deposit',
                'item_name'           => "Advance Deposit Voucher ({$voucherNumber})",
                'unit_price'          => -$amount,
                'quantity'            => 1,
                'tax_amount'          => 0.00,
                'discount_amount'     => 0.00,
                'total_amount'        => -$amount,
                'charged_at'          => now(),
                'charged_by_user_id'  => $userId,
                'auto_generated'      => false,
                'notes'               => "Payment Mode: {$paymentMethod}. Ref: {$reference}. {$notes}",
                'status'              => 'unbilled',
            ]);

            $hospital = Hospital::find($hospitalId);
            $cashier = \App\Models\User::find($userId);

            return [
                'voucher_number'        => $voucherNumber,
                'ledger_item_id'        => $ledgerItem->id,
                'receipt_date'          => now()->toIso8601String(),
                'amount'                => $amount,
                'amount_in_words'       => $this->amountToWords($amount),
                'payment_method'        => strtoupper($paymentMethod),
                'transaction_reference' => $reference,
                'encounter_type'        => strtoupper($encounterType),
                'encounter_id'          => $encounterId,
                'ipd_number'            => $admission?->ipd_number,
                'ward_name'             => $admission?->ward?->name,
                'bed_number'            => $admission?->bed?->bed_number,
                'total_advance_balance' => $admission ? (float) $admission->advance_deposit : $amount,
                'notes'                 => $notes,
                'patient'               => [
                    'id'           => $patient->id,
                    'name'         => $patient->name,
                    'uhid'         => $patient->uhid,
                    'mobile'       => $patient->mobile,
                    'gender'       => $patient->gender,
                    'age'          => $patient->age_display ?? $patient->age,
                    'abha_number'  => $patient->abha_number,
                    'abha_address' => $patient->abha_address,
                ],
                'hospital'              => [
                    'name'        => $hospital?->name ?? 'Hospital Care',
                    'code'        => $hospital?->code ?? 'HOSP',
                    'abdm_hip_id' => $hospital?->abdm_hip_id ?? 'HIP-DEFAULT',
                    'address'     => $hospital?->address ?? '',
                    'phone'       => $hospital?->phone ?? '',
                ],
                'cashier'               => [
                    'id'   => $cashier?->id ?? $userId,
                    'name' => $cashier?->name ?? 'Billing Cashier',
                ],
            ];
        });
    }

    /**
     * Get queue of admitted IPD patients awaiting final discharge settlement.
     */
    public function getPendingDischargeAdmissions(int $hospitalId, array $filters): array
    {
        $query = IpdAdmission::where('hospital_id', $hospitalId)
            ->whereIn('status', ['admitted', 'discharge_planned'])
            ->with(['patient', 'ward', 'bed', 'doctor']);

        if (!empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('ipd_number', 'LIKE', "%{$term}%")
                  ->orWhereHas('patient', function ($pq) use ($term) {
                      $pq->where('name', 'LIKE', "%{$term}%")
                         ->orWhere('uhid', 'LIKE', "%{$term}%")
                         ->orWhere('mobile', 'LIKE', "%{$term}%");
                  });
            });

        }

        if (!empty($filters['ward_id'])) {
            $query->where('ward_id', $filters['ward_id']);
        }

        $admissions = $query->orderBy('admission_date')->get();

        return $admissions->map(function ($adm) use ($hospitalId) {
            $unbilled = BillingLedgerItem::where('hospital_id', $hospitalId)
                ->where('encounter_type', 'ipd')
                ->where('encounter_id', $adm->id)
                ->where('status', 'unbilled')
                ->get();

            $grossAmount = (float) $unbilled->sum('total_amount');
            $taxAmount = (float) $unbilled->sum('tax_amount');
            $advanceDeposit = (float) $adm->advance_deposit;
            $estimatedDue = max(0, $grossAmount + $taxAmount - $advanceDeposit);

            $admitDate = $adm->admission_date ? \Carbon\Carbon::parse($adm->admission_date) : now();
            $daysAdmitted = max(1, (int) $admitDate->diffInDays(now()) + 1);

            return [
                'id'                   => $adm->id,
                'ipd_number'           => $adm->ipd_number,
                'status'               => $adm->status,
                'admission_date'       => $adm->admission_date?->toIso8601String(),
                'days_admitted'        => $daysAdmitted,
                'patient'              => $adm->patient,
                'ward'                 => $adm->ward,
                'bed'                  => $adm->bed,
                'doctor'               => $adm->doctor,
                'unbilled_items_count' => $unbilled->count(),
                'gross_amount'         => round($grossAmount, 2),
                'tax_amount'           => round($taxAmount, 2),
                'advance_deposit_paid' => round($advanceDeposit, 2),
                'estimated_due'        => round($estimatedDue, 2),
                'discharge_ready'      => $adm->status === 'discharge_planned',
            ];
        })->toArray();
    }

    /**
     * Issue refund / credit note voucher for patient overpayment or cancellation.
     */
    public function issueRefund(int $hospitalId, array $data, int $userId): array
    {
        return DB::transaction(function () use ($hospitalId, $data, $userId) {
            $patientId = (int) $data['patient_id'];
            $amount = abs((float) $data['amount']);
            $reason = $data['reason'] ?? 'Advance Deposit Balance Refund';
            $refundMethod = $data['refund_method'] ?? 'cash';
            $reference = $data['transaction_reference'] ?? null;
            $encounterType = $data['encounter_type'] ?? 'ipd';
            $encounterId = !empty($data['encounter_id']) ? (int) $data['encounter_id'] : null;

            $patient = \App\Models\Patient::where('hospital_id', $hospitalId)->findOrFail($patientId);

            $year = date('Y');
            $randomCode = strtoupper(substr(uniqid(), -5));
            $creditNoteNumber = "CRN-{$year}-{$randomCode}";

            // Post debit entry to record refund paid to patient
            $ledgerItem = BillingLedgerItem::create([
                'hospital_id'        => $hospitalId,
                'patient_id'         => $patientId,
                'encounter_type'     => $encounterType,
                'encounter_id'       => $encounterId,
                'category'           => 'refund',
                'item_name'          => "Patient Refund Voucher ({$creditNoteNumber}) - {$reason}",
                'unit_price'         => $amount,
                'quantity'           => 1,
                'tax_amount'         => 0.00,
                'discount_amount'    => 0.00,
                'total_amount'       => $amount,
                'charged_at'         => now(),
                'charged_by_user_id' => $userId,
                'auto_generated'     => false,
                'notes'              => "Refund Mode: {$refundMethod}. Ref: {$reference}",
                'status'             => 'billed',
            ]);

            $hospital = Hospital::find($hospitalId);
            $cashier = \App\Models\User::find($userId);

            return [
                'credit_note_number'    => $creditNoteNumber,
                'refund_date'           => now()->toIso8601String(),
                'amount_refunded'       => $amount,
                'amount_in_words'       => $this->amountToWords($amount),
                'reason'                => $reason,
                'refund_method'         => strtoupper($refundMethod),
                'transaction_reference' => $reference,
                'patient'               => [
                    'name'         => $patient->name,
                    'uhid'         => $patient->uhid,
                    'mobile'       => $patient->mobile,
                    'abha_number'  => $patient->abha_number,
                    'abha_address' => $patient->abha_address,
                ],
                'hospital'              => [
                    'name'        => $hospital?->name ?? 'Hospital Care',
                    'abdm_hip_id' => $hospital?->abdm_hip_id ?? 'HIP-DEFAULT',
                ],
                'authorized_by'         => $cashier?->name ?? 'Billing Officer',
            ];
        });
    }

    /**
     * Converts a numeric currency amount to words (Indian numbering system).
     */
    protected function amountToWords(float $number): string
    {
        $no = (int) floor($number);
        $point = (int) round(($number - $no) * 100);
        $words = [
            0 => '', 1 => 'One', 2 => 'Two', 3 => 'Three', 4 => 'Four', 5 => 'Five',
            6 => 'Six', 7 => 'Seven', 8 => 'Eight', 9 => 'Nine', 10 => 'Ten',
            11 => 'Eleven', 12 => 'Twelve', 13 => 'Thirteen', 14 => 'Fourteen', 15 => 'Fifteen',
            16 => 'Sixteen', 17 => 'Seventeen', 18 => 'Eighteen', 19 => 'Nineteen',
            20 => 'Twenty', 30 => 'Thirty', 40 => 'Forty', 50 => 'Fifty',
            60 => 'Sixty', 70 => 'Seventy', 80 => 'Eighty', 90 => 'Ninety',
        ];

        $digits = ['', 'Hundred', 'Thousand', 'Lakh', 'Crore'];
        $res = [];
        $crore = (int) floor($no / 10000000);
        $no %= 10000000;
        $lakh = (int) floor($no / 100000);
        $no %= 100000;
        $thousand = (int) floor($no / 1000);
        $no %= 1000;
        $hundred = (int) floor($no / 100);
        $no %= 100;

        if ($crore > 0) $res[] = ($words[$crore] ?? $crore) . ' Crore';
        if ($lakh > 0) $res[] = ($lakh > 20 ? ($words[(int) ($lakh / 10) * 10] . ' ' . $words[$lakh % 10]) : $words[$lakh]) . ' Lakh';
        if ($thousand > 0) $res[] = ($thousand > 20 ? ($words[(int) ($thousand / 10) * 10] . ' ' . $words[$thousand % 10]) : $words[$thousand]) . ' Thousand';
        if ($hundred > 0) $res[] = $words[$hundred] . ' Hundred';
        if ($no > 0) $res[] = ($no > 20 ? ($words[(int) ($no / 10) * 10] . ' ' . $words[$no % 10]) : $words[$no]);

        $rupees = empty($res) ? 'Zero Rupees' : implode(' ', array_filter($res)) . ' Rupees';
        if ($point > 0) {
            $pWords = $point > 20 ? ($words[(int) ($point / 10) * 10] . ' ' . $words[$point % 10]) : $words[$point];
            return $rupees . ' and ' . $pWords . ' Paise Only';
        }

        return $rupees . ' Only';
    }
}

