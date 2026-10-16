<?php

namespace App\Services\Insurance;

use App\Models\InsurancePayer;
use App\Models\InsuranceTariffPackage;
use App\Models\PatientInsuranceDetail;
use App\Models\InsurancePreauth;
use App\Models\InsuranceClaim;
use App\Models\InsuranceNonpayableItem;
use App\Models\InsuranceArLedger;
use App\Models\InsuranceImplantApproval;
use App\Models\IpdAdmission;
use App\Models\BillingLedgerItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InsuranceService implements InsuranceServiceInterface
{
    // ─────────────────────────────────────────────────────────────────────
    // DASHBOARD
    // ─────────────────────────────────────────────────────────────────────

    public function getDashboardStats(int $hospitalId): array
    {
        $activePreauths = InsurancePreauth::where('hospital_id', $hospitalId)
            ->whereIn('status', ['submitted', 'approved', 'queried', 'query_responded'])
            ->count();

        $pendingClaims = InsuranceClaim::where('hospital_id', $hospitalId)
            ->whereNotIn('status', ['settled', 'rejected', 'written_off'])
            ->count();

        $arOutstanding = InsuranceClaim::where('hospital_id', $hospitalId)
            ->whereNotIn('status', ['settled', 'written_off'])
            ->whereNotNull('submission_date')
            ->get()
            ->sum('outstanding_amount');

        $monthlySettled = InsuranceClaim::where('hospital_id', $hospitalId)
            ->where('status', 'settled')
            ->whereBetween('settled_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->sum('settled_amount');

        // Expiring preauths (next 2 days)
        $expiringPreauths = InsurancePreauth::where('hospital_id', $hospitalId)
            ->where('status', 'approved')
            ->whereBetween('valid_till', [now()->toDateString(), now()->addDays(2)->toDateString()])
            ->count();

        // Queries awaiting hospital response
        $pendingQueries = InsurancePreauth::where('hospital_id', $hospitalId)
            ->where('status', 'queried')
            ->count();

        // Claim aging breakdown
        $aging = InsuranceClaim::where('hospital_id', $hospitalId)
            ->whereNotIn('status', ['settled', 'written_off'])
            ->whereNotNull('submission_date')
            ->get()
            ->groupBy('aging_bucket')
            ->map(fn($group) => [
                'count' => $group->count(),
                'amount' => $group->sum('outstanding_amount'),
            ]);

        // Payer-wise outstanding
        $payerWise = InsuranceClaim::where('hospital_id', $hospitalId)
            ->whereNotIn('status', ['settled', 'written_off'])
            ->whereNotNull('submission_date')
            ->with('payer:id,name,payer_type')
            ->get()
            ->groupBy('payer_id')
            ->map(fn($group) => [
                'payer' => $group->first()->payer,
                'count' => $group->count(),
                'outstanding' => $group->sum('outstanding_amount'),
            ])
            ->values();

        // Live cashless IPD admissions
        $cashlessAdmissions = IpdAdmission::where('hospital_id', $hospitalId)
            ->where('status', 'admitted')
            ->whereHas('preauths', fn($q) => $q->where('status', 'approved'))
            ->with(['patient:id,name,uhid', 'preauths' => fn($q) => $q->where('status', 'approved')->with('payer:id,name')])
            ->limit(20)
            ->get()
            ->map(fn($adm) => [
                'admission_id' => $adm->id,
                'admission_number' => $adm->ipd_number,
                'patient' => $adm->patient,
                'preauth' => $adm->preauths->first(),
                'admitted_at' => $adm->admission_date,
            ]);

        return [
            'active_preauths' => $activePreauths,
            'pending_claims' => $pendingClaims,
            'ar_outstanding' => round($arOutstanding, 2),
            'monthly_settled' => round($monthlySettled, 2),
            'expiring_preauths_alert' => $expiringPreauths,
            'pending_queries' => $pendingQueries,
            'aging_breakdown' => $aging,
            'payer_wise_outstanding' => $payerWise,
            'live_cashless_admissions' => $cashlessAdmissions,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────
    // PAYERS
    // ─────────────────────────────────────────────────────────────────────

    public function getPayers(int $hospitalId, array $filters = []): array
    {
        $q = InsurancePayer::where('hospital_id', $hospitalId);
        if (!empty($filters['payer_type'])) $q->where('payer_type', $filters['payer_type']);
        if (isset($filters['is_active'])) $q->where('is_active', $filters['is_active']);
        if (!empty($filters['search'])) $q->where('name', 'like', "%{$filters['search']}%");

        return $q->orderBy('name')->get()->toArray();
    }

    public function createPayer(int $hospitalId, array $data, int $userId): array
    {
        $payer = InsurancePayer::create(array_merge($data, ['hospital_id' => $hospitalId]));
        return ['success' => true, 'payer' => $payer->fresh()];
    }

    public function updatePayer(int $hospitalId, int $payerId, array $data): array
    {
        $payer = InsurancePayer::where('hospital_id', $hospitalId)->findOrFail($payerId);
        $payer->update($data);
        return ['success' => true, 'payer' => $payer->fresh()];
    }

    public function deletePayer(int $hospitalId, int $payerId): array
    {
        $payer = InsurancePayer::where('hospital_id', $hospitalId)->findOrFail($payerId);
        // Soft-delete: deactivate instead of hard delete
        $payer->update(['is_active' => false]);
        return ['success' => true, 'message' => 'Payer deactivated successfully.'];
    }

    public function getPayerTariffs(int $hospitalId, int $payerId): array
    {
        $payer = InsurancePayer::where('hospital_id', $hospitalId)->findOrFail($payerId);
        return $payer->tariffPackages()->with('chargeMaster:id,name')->get()->toArray();
    }

    public function saveTariffPackage(int $hospitalId, int $payerId, array $data): array
    {
        InsurancePayer::where('hospital_id', $hospitalId)->findOrFail($payerId);
        $tariff = InsuranceTariffPackage::updateOrCreate(
            ['payer_id' => $payerId, 'id' => $data['id'] ?? null],
            array_merge($data, ['payer_id' => $payerId])
        );
        return ['success' => true, 'tariff' => $tariff->fresh()];
    }

    public function deleteTariffPackage(int $hospitalId, int $payerId, int $tariffId): array
    {
        InsurancePayer::where('hospital_id', $hospitalId)->findOrFail($payerId);
        InsuranceTariffPackage::where('payer_id', $payerId)->findOrFail($tariffId)->delete();
        return ['success' => true, 'message' => 'Tariff package deleted.'];
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATIENT INSURANCE
    // ─────────────────────────────────────────────────────────────────────

    public function getPatientInsurances(int $hospitalId, int $patientId): array
    {
        return PatientInsuranceDetail::where('hospital_id', $hospitalId)
            ->where('patient_id', $patientId)
            ->where('is_active', true)
            ->with('payer:id,name,payer_type,code')
            ->orderBy('is_primary', 'desc')
            ->get()
            ->map(fn($ins) => array_merge($ins->toArray(), [
                'is_policy_active' => $ins->is_policy_active,
            ]))
            ->toArray();
    }

    public function addPatientInsurance(int $hospitalId, int $patientId, array $data, int $userId): array
    {
        // If this is set as primary, demote previous primary
        if (($data['is_primary'] ?? true)) {
            PatientInsuranceDetail::where('hospital_id', $hospitalId)
                ->where('patient_id', $patientId)
                ->where('is_active', true)
                ->update(['is_primary' => false]);
        }

        $ins = PatientInsuranceDetail::create(array_merge($data, [
            'hospital_id' => $hospitalId,
            'patient_id'  => $patientId,
            'verification_status' => 'pending',
        ]));

        return ['success' => true, 'insurance' => $ins->load('payer:id,name,payer_type')];
    }

    public function updatePatientInsurance(int $hospitalId, int $insuranceId, array $data): array
    {
        $ins = PatientInsuranceDetail::where('hospital_id', $hospitalId)->findOrFail($insuranceId);
        $ins->update($data);
        return ['success' => true, 'insurance' => $ins->fresh()->load('payer:id,name,payer_type')];
    }

    public function verifyEligibility(int $hospitalId, int $insuranceId, array $data = []): array
    {
        $ins = PatientInsuranceDetail::where('hospital_id', $hospitalId)->findOrFail($insuranceId);

        // In real integration: call TPA API / PMJAY BIS / ABHA lookup
        // For now: manual verification with notes
        $status = $data['status'] ?? 'verified';
        $ins->update([
            'verification_status' => $status,
            'verified_at' => now(),
            'verification_notes' => $data['notes'] ?? null,
            'sum_insured_remaining' => $data['sum_insured_remaining'] ?? $ins->sum_insured_remaining,
        ]);

        return [
            'success' => true,
            'insurance' => $ins->fresh()->load('payer:id,name,payer_type'),
            'message' => "Eligibility marked as {$status}.",
        ];
    }

    public function deactivatePatientInsurance(int $hospitalId, int $insuranceId): array
    {
        $ins = PatientInsuranceDetail::where('hospital_id', $hospitalId)->findOrFail($insuranceId);
        $ins->update(['is_active' => false]);
        return ['success' => true, 'message' => 'Insurance record deactivated.'];
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRE-AUTHORIZATION
    // ─────────────────────────────────────────────────────────────────────

    public function getPreauths(int $hospitalId, array $filters = []): array
    {
        $q = InsurancePreauth::where('hospital_id', $hospitalId)
            ->with([
                'payer:id,name,payer_type,code,portal_url,contact_email,contact_phone',
                'patientInsurance.patient:id,name,uhid',
                'admission.patient:id,name,uhid',
                'admission:id,ipd_number',
            ]);

        if (!empty($filters['status'])) $q->where('status', $filters['status']);
        if (!empty($filters['payer_id'])) $q->where('payer_id', $filters['payer_id']);
        if (!empty($filters['preauth_type'])) $q->where('preauth_type', $filters['preauth_type']);
        if (!empty($filters['search'])) {
            $q->where(function($sq) use ($filters) {
                $sq->where('preauth_number', 'like', "%{$filters['search']}%")
                   ->orWhere('tpa_preauth_number', 'like', "%{$filters['search']}%")
                   ->orWhere('primary_diagnosis', 'like', "%{$filters['search']}%");
            });
        }

        $perPage = $filters['per_page'] ?? 20;
        $result = $q->orderBy('created_at', 'desc')->paginate($perPage);

        return [
            'data' => $result->items(),
            'total' => $result->total(),
            'per_page' => $result->perPage(),
            'current_page' => $result->currentPage(),
            'last_page' => $result->lastPage(),
        ];
    }

    public function getPreauth(int $hospitalId, int $preauthId): array
    {
        $preauth = InsurancePreauth::where('hospital_id', $hospitalId)
            ->with([
                'payer',
                'patientInsurance.patient:id,name,uhid,phone',
                'patientInsurance.payer:id,name',
                'admission:id,ipd_number,admission_date',
                'enhancements',
                'implantApprovals',
                'claims',
            ])
            ->findOrFail($preauthId);

        return array_merge($preauth->toArray(), [
            'is_expired' => $preauth->is_expired,
            'status_color' => $preauth->status_color,
        ]);
    }

    public function createPreauth(int $hospitalId, array $data, int $userId): array
    {
        $preauthNumber = $this->generatePreauthNumber($hospitalId);

        $preauth = InsurancePreauth::create(array_merge($data, [
            'hospital_id' => $hospitalId,
            'preauth_number' => $preauthNumber,
            'status' => $data['auto_submit'] ?? false ? 'submitted' : 'draft',
            'submitted_at' => ($data['auto_submit'] ?? false) ? now() : null,
            'created_by' => $userId,
        ]));

        return ['success' => true, 'preauth' => $preauth->load('payer:id,name,payer_type')];
    }

    public function updatePreauthStatus(int $hospitalId, int $preauthId, string $status, array $data = []): array
    {
        $preauth = InsurancePreauth::where('hospital_id', $hospitalId)->findOrFail($preauthId);

        $updateData = array_merge(['status' => $status], $data);

        // Auto-set timestamps for status changes
        if ($status === 'submitted' && !$preauth->submitted_at) {
            $updateData['submitted_at'] = now();
        } elseif ($status === 'approved') {
            $updateData['approved_at'] = now();
        } elseif ($status === 'denied') {
            $updateData['denied_at'] = now();
        } elseif ($status === 'queried') {
            $updateData['query_raised_at'] = now();
        }

        $preauth->update($updateData);
        return ['success' => true, 'preauth' => $preauth->fresh()->load('payer:id,name,payer_type')];
    }

    public function respondToQuery(int $hospitalId, int $preauthId, array $data): array
    {
        $preauth = InsurancePreauth::where('hospital_id', $hospitalId)->findOrFail($preauthId);
        $preauth->update([
            'query_response' => $data['response'],
            'query_responded_at' => now(),
            'query_documents' => $data['documents'] ?? [],
            'status' => 'query_responded',
        ]);
        return ['success' => true, 'preauth' => $preauth->fresh()];
    }

    public function createEnhancement(int $hospitalId, int $parentPreauthId, array $data, int $userId): array
    {
        $parent = InsurancePreauth::where('hospital_id', $hospitalId)->findOrFail($parentPreauthId);
        $preauthNumber = $this->generatePreauthNumber($hospitalId);

        $enhancement = InsurancePreauth::create(array_merge($data, [
            'hospital_id' => $hospitalId,
            'preauth_number' => $preauthNumber,
            'payer_id' => $parent->payer_id,
            'patient_insurance_id' => $parent->patient_insurance_id,
            'admission_id' => $parent->admission_id,
            'preauth_type' => 'enhancement',
            'status' => 'submitted',
            'submitted_at' => now(),
            'parent_preauth_id' => $parentPreauthId,
            'created_by' => $userId,
        ]));

        return ['success' => true, 'preauth' => $enhancement->load('payer:id,name,payer_type')];
    }

    public function getActivePreauth(int $hospitalId, int $admissionId): ?array
    {
        $preauth = InsurancePreauth::where('hospital_id', $hospitalId)
            ->where('admission_id', $admissionId)
            ->where('status', 'approved')
            ->latest()
            ->first();

        return $preauth ? $preauth->toArray() : null;
    }

    public function addPreauthFollowup(int $hospitalId, int $preauthId, array $data, string $userName): array
    {
        $preauth = InsurancePreauth::where('hospital_id', $hospitalId)->findOrFail($preauthId);
        $existing = $preauth->followup_notes ?? [];
        $entry = [
            'id' => uniqid('note_'),
            'timestamp' => now()->toIso8601String(),
            'caller_name' => $userName,
            'contact_person' => $data['contact_person'] ?? '',
            'channel' => $data['channel'] ?? 'Phone Call',
            'status_discussed' => $data['status_discussed'] ?? '',
            'notes' => $data['notes'] ?? '',
            'next_followup_date' => $data['next_followup_date'] ?? null,
        ];
        array_unshift($existing, $entry);
        $preauth->update(['followup_notes' => $existing]);
        return ['success' => true, 'entry' => $entry, 'followup_notes' => $existing];
    }

    // ─────────────────────────────────────────────────────────────────────
    // CLAIMS
    // ─────────────────────────────────────────────────────────────────────

    public function getClaims(int $hospitalId, array $filters = []): array
    {
        $q = InsuranceClaim::where('hospital_id', $hospitalId)
            ->with([
                'payer:id,name,payer_type,code,portal_url,contact_email,contact_phone',
                'patientInsurance.patient:id,name,uhid',
                'admission:id,ipd_number',
                'preauth:id,preauth_number,approved_amount',
            ]);

        if (!empty($filters['status'])) $q->where('status', $filters['status']);
        if (!empty($filters['payer_id'])) $q->where('payer_id', $filters['payer_id']);
        if (!empty($filters['claim_type'])) $q->where('claim_type', $filters['claim_type']);
        if (!empty($filters['aging_bucket'])) {
            $buckets = ['0-30' => [0, 30], '31-60' => [31, 60], '61-90' => [61, 90], '90+' => [91, 9999]];
            if (isset($buckets[$filters['aging_bucket']])) {
                [$min, $max] = $buckets[$filters['aging_bucket']];
                $isPgsql = DB::getDriverName() === 'pgsql';
                if ($isPgsql) {
                    $q->whereNotNull('submission_date')
                      ->whereRaw('(CURRENT_DATE - submission_date::date) BETWEEN ? AND ?', [$min, $max]);
                } else {
                    $q->whereNotNull('submission_date')
                      ->whereRaw('DATEDIFF(NOW(), submission_date) BETWEEN ? AND ?', [$min, $max]);
                }
            }
        }
        if (!empty($filters['search'])) {
            $q->where(function($sq) use ($filters) {
                $sq->where('claim_number', 'like', "%{$filters['search']}%")
                   ->orWhere('tpa_claim_number', 'like', "%{$filters['search']}%");
            });
        }

        $perPage = $filters['per_page'] ?? 20;
        $result = $q->orderBy('created_at', 'desc')->paginate($perPage);

        return [
            'data' => collect($result->items())->map(fn($c) => array_merge($c->toArray(), [
                'outstanding_amount' => $c->outstanding_amount,
                'aging_days' => $c->aging_days,
                'aging_bucket' => $c->aging_bucket,
            ]))->toArray(),
            'total' => $result->total(),
            'per_page' => $result->perPage(),
            'current_page' => $result->currentPage(),
            'last_page' => $result->lastPage(),
        ];
    }

    public function getClaim(int $hospitalId, int $claimId): array
    {
        $claim = InsuranceClaim::where('hospital_id', $hospitalId)
            ->with([
                'payer', 'patientInsurance.patient',
                'admission:id,ipd_number,admission_date,discharge_date',
                'preauth:id,preauth_number,approved_amount,approved_los_days',
                'arLedger' => fn($q) => $q->orderBy('event_date'),
                'secondaryClaim.payer:id,name',
            ])
            ->findOrFail($claimId);

        return array_merge($claim->toArray(), [
            'outstanding_amount' => $claim->outstanding_amount,
            'aging_days' => $claim->aging_days,
            'aging_bucket' => $claim->aging_bucket,
        ]);
    }

    public function createClaim(int $hospitalId, array $data, int $userId): array
    {
        DB::beginTransaction();
        try {
            $claimNumber = $this->generateClaimNumber($hospitalId);

            // Auto-calculate non-payables if admission_id provided
            $nonPayableAmount = $data['non_payable_amount'] ?? 0;
            $copayAmount = 0;
            if (!empty($data['admission_id']) && !empty($data['patient_insurance_id'])) {
                $insurance = PatientInsuranceDetail::findOrFail($data['patient_insurance_id']);
                $totalBill = $data['total_bill_amount'] ?? 0;
                $copayAmount = round($totalBill * ($insurance->copay_percent / 100), 2);
            }

            $claim = InsuranceClaim::create(array_merge($data, [
                'hospital_id' => $hospitalId,
                'claim_number' => $claimNumber,
                'copay_amount' => $copayAmount,
                'non_payable_amount' => $nonPayableAmount,
                'claimed_amount' => ($data['total_bill_amount'] ?? 0) - $nonPayableAmount - $copayAmount,
                'status' => $data['auto_submit'] ?? false ? 'submitted' : 'draft',
                'submission_date' => ($data['auto_submit'] ?? false) ? now()->toDateString() : null,
                'created_by' => $userId,
            ]));

            // Add initial AR event if submitted
            if ($data['auto_submit'] ?? false) {
                InsuranceArLedger::create([
                    'claim_id' => $claim->id,
                    'hospital_id' => $hospitalId,
                    'event_type' => 'claim_submitted',
                    'amount' => $claim->claimed_amount,
                    'running_outstanding' => $claim->claimed_amount,
                    'event_date' => now()->toDateString(),
                    'created_by' => $userId,
                ]);
            }

            DB::commit();
            return ['success' => true, 'claim' => $claim->load('payer:id,name,payer_type')];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function updateClaimStatus(int $hospitalId, int $claimId, string $status, array $data = []): array
    {
        $claim = InsuranceClaim::where('hospital_id', $hospitalId)->findOrFail($claimId);
        $updateData = array_merge(['status' => $status], $data);

        if ($status === 'submitted' && !$claim->submission_date) {
            $updateData['submission_date'] = now()->toDateString();
        } elseif ($status === 'approved') {
            $updateData['approval_date'] = now()->toDateString();
        }

        $claim->update($updateData);
        return ['success' => true, 'claim' => $claim->fresh()->load('payer:id,name,payer_type')];
    }

    public function settleClaim(int $hospitalId, int $claimId, array $data, int $userId): array
    {
        DB::beginTransaction();
        try {
            $claim = InsuranceClaim::where('hospital_id', $hospitalId)->findOrFail($claimId);
            $settledAmount = $data['settled_amount'];
            $deductedAmount = ($claim->approved_amount ?? $claim->claimed_amount) - $settledAmount;

            $claim->update([
                'status' => 'settled',
                'settled_amount' => $settledAmount,
                'deducted_amount' => max(0, $deductedAmount),
                'settled_at' => now(),
                'settlement_utr' => $data['settlement_utr'] ?? null,
            ]);

            // AR ledger event
            $outstanding = max(0, $claim->outstanding_amount - $settledAmount);
            InsuranceArLedger::create([
                'claim_id' => $claimId,
                'hospital_id' => $hospitalId,
                'event_type' => 'settled',
                'amount' => $settledAmount,
                'running_outstanding' => $outstanding,
                'event_date' => now()->toDateString(),
                'transaction_ref' => $data['settlement_utr'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ]);

            DB::commit();
            return ['success' => true, 'claim' => $claim->fresh()];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function resubmitClaim(int $hospitalId, int $claimId, array $data, int $userId): array
    {
        $claim = InsuranceClaim::where('hospital_id', $hospitalId)->findOrFail($claimId);
        $claim->update([
            'status' => 'resubmitted',
            'resubmission_count' => $claim->resubmission_count + 1,
            'resubmission_notes' => $data['notes'] ?? null,
            'rejection_reason' => null,
        ]);

        InsuranceArLedger::create([
            'claim_id' => $claimId,
            'hospital_id' => $hospitalId,
            'event_type' => 'resubmitted',
            'amount' => 0,
            'running_outstanding' => $claim->outstanding_amount,
            'event_date' => now()->toDateString(),
            'notes' => "Resubmission #{$claim->resubmission_count}: " . ($data['notes'] ?? ''),
            'created_by' => $userId,
        ]);

        return ['success' => true, 'claim' => $claim->fresh()];
    }

    public function raiseGrievance(int $hospitalId, int $claimId, array $data, int $userId): array
    {
        $claim = InsuranceClaim::where('hospital_id', $hospitalId)->findOrFail($claimId);
        $claim->update([
            'status' => 'grievance_raised',
            'grievance_raised_at' => now(),
            'grievance_notes' => $data['notes'],
        ]);

        InsuranceArLedger::create([
            'claim_id' => $claimId,
            'hospital_id' => $hospitalId,
            'event_type' => 'grievance_raised',
            'amount' => 0,
            'running_outstanding' => $claim->outstanding_amount,
            'event_date' => now()->toDateString(),
            'notes' => $data['notes'],
            'created_by' => $userId,
        ]);

        return ['success' => true, 'claim' => $claim->fresh()];
    }

    public function getClaimDossier(int $hospitalId, int $claimId): array
    {
        $claim = InsuranceClaim::where('hospital_id', $hospitalId)
            ->with([
                'payer',
                'patientInsurance.patient',
                'admission.patient',
                'preauth',
                'arLedger',
            ])
            ->findOrFail($claimId);

        // Build dossier: checklist of what's available
        $admission = $claim->admission;
        $checklist = [
            'preauth_letter' => !empty($claim->preauth?->sanction_letter_path),
            'discharge_summary' => $admission && !empty($admission->discharge_summary_id),
            'final_bill' => !empty($claim->total_bill_amount),
            'lab_reports' => false, // Extend with actual check
            'pharmacy_bills' => false,
            'implant_invoice' => false,
            'doctor_notes' => false,
        ];

        return [
            'claim' => array_merge($claim->toArray(), [
                'outstanding_amount' => $claim->outstanding_amount,
                'aging_days' => $claim->aging_days,
            ]),
            'dossier_checklist' => $checklist,
            'completeness_percent' => round(count(array_filter($checklist)) / count($checklist) * 100),
        ];
    }

    public function addClaimFollowup(int $hospitalId, int $claimId, array $data, string $userName): array
    {
        $claim = InsuranceClaim::where('hospital_id', $hospitalId)->findOrFail($claimId);
        $existing = $claim->followup_notes ?? [];
        $entry = [
            'id' => uniqid('note_'),
            'timestamp' => now()->toIso8601String(),
            'caller_name' => $userName,
            'contact_person' => $data['contact_person'] ?? '',
            'channel' => $data['channel'] ?? 'Phone Call',
            'status_discussed' => $data['status_discussed'] ?? '',
            'notes' => $data['notes'] ?? '',
            'next_followup_date' => $data['next_followup_date'] ?? null,
        ];
        array_unshift($existing, $entry);
        $claim->update(['followup_notes' => $existing]);
        return ['success' => true, 'entry' => $entry, 'followup_notes' => $existing];
    }

    // ─────────────────────────────────────────────────────────────────────
    // NON-PAYABLE ITEMS
    // ─────────────────────────────────────────────────────────────────────

    public function getNonPayableItems(int $hospitalId, ?int $payerId = null): array
    {
        $q = InsuranceNonpayableItem::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->with('payer:id,name');

        if ($payerId) {
            $q->where(fn($sq) => $sq->whereNull('payer_id')->orWhere('payer_id', $payerId));
        }

        return $q->orderBy('category')->orderBy('item_name')->get()->toArray();
    }

    public function saveNonPayableItem(int $hospitalId, array $data): array
    {
        if (!empty($data['id'])) {
            $item = InsuranceNonpayableItem::where('hospital_id', $hospitalId)->findOrFail($data['id']);
            $item->update($data);
        } else {
            $item = InsuranceNonpayableItem::create(array_merge($data, ['hospital_id' => $hospitalId]));
        }
        return ['success' => true, 'item' => $item->fresh()];
    }

    public function deleteNonPayableItem(int $hospitalId, int $itemId): array
    {
        InsuranceNonpayableItem::where('hospital_id', $hospitalId)->findOrFail($itemId)
            ->update(['is_active' => false]);
        return ['success' => true, 'message' => 'Item deactivated.'];
    }

    public function detectNonPayables(int $hospitalId, int $admissionId, ?int $payerId = null): array
    {
        $nonPayableItems = InsuranceNonpayableItem::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->where(function($q) use ($payerId) {
                $q->whereNull('payer_id');
                if ($payerId) $q->orWhere('payer_id', $payerId);
            })
            ->pluck('charge_master_id')
            ->filter()
            ->toArray();

        $flaggedBillingItems = BillingLedgerItem::where('admission_id', $admissionId)
            ->whereIn('charge_master_id', $nonPayableItems)
            ->get();

        return [
            'flagged_items' => $flaggedBillingItems->toArray(),
            'total_non_payable' => $flaggedBillingItems->sum('amount'),
        ];
    }

    // ─────────────────────────────────────────────────────────────────────
    // AR LEDGER
    // ─────────────────────────────────────────────────────────────────────

    public function getArLedger(int $hospitalId, array $filters = []): array
    {
        $q = InsuranceArLedger::where('hospital_id', $hospitalId)
            ->with([
                'claim:id,claim_number,total_bill_amount,claimed_amount,approved_amount,settled_amount,status,payer_id',
                'claim.payer:id,name,code',
            ]);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $q->where(function($sq) use ($search) {
                $sq->where('transaction_ref', 'like', "%{$search}%")
                   ->orWhere('notes', 'like', "%{$search}%")
                   ->orWhereHas('claim', fn($cq) => $cq->where('claim_number', 'like', "%{$search}%"));
            });
        }

        if (!empty($filters['event_type'])) {
            $q->where('event_type', $filters['event_type']);
        }

        $ledgerEntries = $q->orderBy('created_at', 'desc')->get();

        $claimsQuery = InsuranceClaim::where('hospital_id', $hospitalId)
            ->whereNotIn('status', ['written_off'])
            ->whereNotNull('submission_date')
            ->with('payer:id,name,payer_type,code,portal_url', 'patientInsurance.patient:id,name,uhid');

        if (!empty($filters['payer_id'])) $claimsQuery->where('payer_id', $filters['payer_id']);
        if (!empty($filters['status'])) $claimsQuery->where('status', $filters['status']);

        if (!empty($filters['aging_bucket']) && $filters['aging_bucket'] !== 'all') {
            $daysRange = match($filters['aging_bucket']) {
                '0-30' => [0, 30],
                '31-60' => [31, 60],
                '61-90' => [61, 90],
                '90+' => [91, 99999],
                default => null,
            };
            if ($daysRange) {
                $claimsQuery->whereRaw('(CURRENT_DATE - submission_date::date) >= ? AND (CURRENT_DATE - submission_date::date) <= ?', $daysRange);
            }
        }

        $claims = $claimsQuery->orderBy('submission_date', 'asc')->get()->map(fn($c) => array_merge($c->toArray(), [
            'outstanding_amount' => $c->outstanding_amount,
            'aging_days' => $c->aging_days,
            'aging_bucket' => $c->aging_bucket,
        ]));

        return [
            'data' => $ledgerEntries->toArray(),
            'entries' => $ledgerEntries->toArray(),
            'claims' => $claims->toArray(),
            'summary' => $this->getArAgingSummary($hospitalId),
        ];
    }

    public function getArAgingSummary(int $hospitalId): array
    {
        $claims = InsuranceClaim::where('hospital_id', $hospitalId)
            ->whereNotIn('status', ['settled', 'written_off'])
            ->whereNotNull('submission_date')
            ->get();

        $buckets = ['0-30' => 0.0, '31-60' => 0.0, '61-90' => 0.0, '90+' => 0.0];
        $counts = ['0-30' => 0, '31-60' => 0, '61-90' => 0, '90+' => 0];

        foreach ($claims as $claim) {
            $bucket = $claim->aging_bucket;
            $buckets[$bucket] += (float) $claim->outstanding_amount;
            $counts[$bucket]++;
        }

        $agingBuckets = [];
        foreach (['0-30', '31-60', '61-90', '90+'] as $b) {
            $agingBuckets[$b] = [
                'count' => $counts[$b],
                'amount' => round($buckets[$b], 2),
            ];
        }

        return [
            'aging_buckets' => $agingBuckets,
            'totals' => $buckets,
            'counts' => $counts,
            'grand_total' => array_sum($buckets),
        ];
    }

    public function addArEvent(int $hospitalId, int $claimId, array $data, int $userId): array
    {
        $claim = InsuranceClaim::where('hospital_id', $hospitalId)->findOrFail($claimId);
        $event = InsuranceArLedger::create(array_merge($data, [
            'claim_id' => $claimId,
            'hospital_id' => $hospitalId,
            'created_by' => $userId,
        ]));
        return ['success' => true, 'event' => $event];
    }

    // ─────────────────────────────────────────────────────────────────────
    // IMPLANT APPROVALS
    // ─────────────────────────────────────────────────────────────────────

    public function getImplantApprovals(int $hospitalId, array $filters = []): array
    {
        $q = InsuranceImplantApproval::where('hospital_id', $hospitalId)
            ->with('payer:id,name', 'admission:id,ipd_number');

        if (!empty($filters['status'])) $q->where('status', $filters['status']);
        if (!empty($filters['payer_id'])) $q->where('payer_id', $filters['payer_id']);

        return $q->orderBy('created_at', 'desc')->get()->toArray();
    }

    public function createImplantApproval(int $hospitalId, array $data, int $userId): array
    {
        $approval = InsuranceImplantApproval::create(array_merge($data, [
            'hospital_id' => $hospitalId,
            'status' => 'pending',
            'submitted_at' => now(),
            'created_by' => $userId,
        ]));
        return ['success' => true, 'approval' => $approval->load('payer:id,name')];
    }

    public function updateImplantApproval(int $hospitalId, int $approvalId, array $data): array
    {
        $approval = InsuranceImplantApproval::where('hospital_id', $hospitalId)->findOrFail($approvalId);
        if ($data['status'] === 'approved') $data['approved_at'] = now();
        $approval->update($data);
        return ['success' => true, 'approval' => $approval->fresh()->load('payer:id,name')];
    }

    // ─────────────────────────────────────────────────────────────────────
    // PREAUTH EXPIRY ALERTS
    // ─────────────────────────────────────────────────────────────────────

    public function getExpiringPreauths(int $hospitalId, int $withinDays = 2): array
    {
        return InsurancePreauth::where('hospital_id', $hospitalId)
            ->where('status', 'approved')
            ->whereBetween('valid_till', [now()->toDateString(), now()->addDays($withinDays)->toDateString()])
            ->with([
                'payer:id,name',
                'patientInsurance.patient:id,name,uhid',
                'admission:id,ipd_number',
            ])
            ->orderBy('valid_till')
            ->get()
            ->toArray();
    }

    // ─────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────

    private function generatePreauthNumber(int $hospitalId): string
    {
        $year = now()->format('Y');
        $seq = InsurancePreauth::where('hospital_id', $hospitalId)
                   ->whereYear('created_at', $year)->count() + 1;
        return 'PA-' . $year . '-' . str_pad($seq, 5, '0', STR_PAD_LEFT);
    }

    private function generateClaimNumber(int $hospitalId): string
    {
        $year = now()->format('Y');
        $seq = InsuranceClaim::where('hospital_id', $hospitalId)
                   ->whereYear('created_at', $year)->count() + 1;
        return 'CLM-' . $year . '-' . str_pad($seq, 5, '0', STR_PAD_LEFT);
    }
}
