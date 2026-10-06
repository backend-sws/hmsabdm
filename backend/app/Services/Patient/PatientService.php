<?php

namespace App\Services\Patient;

use App\Models\Patient;
use App\Http\Traits\CanFilterAndPaginate;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;

class PatientService implements PatientServiceInterface
{
    use CanFilterAndPaginate;

    /**
     * Get a list of all patients with sorting, filtering, and pagination.
     */
    public function getAllPatients($request = null)
    {
        $req = $request ?? request();

        $hospitalId = $req->user()?->hospital_id ?? $req->query('hospital_id');
        $patientQuery = Patient::query()->with([
            'latestOpdVisit.department',
            'latestOpdVisit.doctor',
            'latestIpdAdmission',
        ]);

        if ($hospitalId) {
            $patientQuery->where('hospital_id', $hospitalId);
        }

        $query = QueryBuilder::for($patientQuery)
            ->allowedFilters(
                AllowedFilter::callback('uhid', fn($q, $v) => $q->where('uhid', 'ilike', "%{$v}%")),
                AllowedFilter::callback('name', fn($q, $v) => $q->where('name', 'ilike', "%{$v}%")),
                AllowedFilter::callback('mobile', fn($q, $v) => $q->where('mobile', 'ilike', "%{$v}%")),
                AllowedFilter::callback('email', fn($q, $v) => $q->where('email', 'ilike', "%{$v}%")),
                AllowedFilter::callback('abha_number', fn($q, $v) => $q->where('abha_number', 'ilike', "%{$v}%")),
                AllowedFilter::callback('abha_address', fn($q, $v) => $q->where('abha_address', 'ilike', "%{$v}%")),
                'gender',
                AllowedFilter::callback('search', fn($q, $v) => $q->where(function ($sq) use ($v) {
                    $sq->where('name', 'ilike', "%{$v}%")
                       ->orWhere('uhid', 'ilike', "%{$v}%")
                       ->orWhere('mobile', 'ilike', "%{$v}%")
                       ->orWhere('email', 'ilike', "%{$v}%")
                       ->orWhere('abha_number', 'ilike', "%{$v}%")
                       ->orWhere('abha_address', 'ilike', "%{$v}%");
                }))
            )
            ->allowedSorts('name', 'created_at', 'dob')
            ->defaultSort('-created_at');

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('uhid', 'ilike', "%{$search}%")
                  ->orWhere('name', 'ilike', "%{$search}%")
                  ->orWhere('mobile', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('abha_number', 'ilike', "%{$search}%")
                  ->orWhere('abha_address', 'ilike', "%{$search}%");
            });
        }

        if ($req && $req->filled('gender')) {
            $query->where('gender', $req->query('gender'));
        }

        if ($req && $req->filled('abha_status')) {
            $status = $req->query('abha_status');
            if ($status === 'linked') {
                $query->where(function ($q) {
                    $q->whereNotNull('abha_number')->orWhereNotNull('abha_address');
                });
            } elseif ($status === 'not_linked') {
                $query->whereNull('abha_number')->whereNull('abha_address');
            }
        }

        return $this->applyPaginationOrAll($query, $req);
    }

    /**
     * Find existing patient by ABHA, ID proof, or Mobile + Name within the hospital.
     */
    public function findExistingPatient(int $hospitalId, array $data): ?Patient
    {
        $query = Patient::where('hospital_id', $hospitalId);

        // 1. Match by ABHA Number
        if (!empty($data['abha_number'])) {
            $patient = (clone $query)->where('abha_number', $data['abha_number'])->first();
            if ($patient) return $patient;
        }

        // 2. Match by ABHA Address
        if (!empty($data['abha_address'])) {
            $patient = (clone $query)->where('abha_address', $data['abha_address'])->first();
            if ($patient) return $patient;
        }

        // 3. Match by ID Proof (e.g. PAN, Driving License, Voter ID)
        if (!empty($data['id_proof_number']) && !empty($data['id_proof_type'])) {
            $patient = (clone $query)
                ->where('id_proof_type', $data['id_proof_type'])
                ->where('id_proof_number', $data['id_proof_number'])
                ->first();
            if ($patient) return $patient;
        }

        // 4. Match by Mobile Number + Name (Case-insensitive trimmed)
        if (!empty($data['mobile']) && !empty($data['name'])) {
            $patient = (clone $query)
                ->where('mobile', $data['mobile'])
                ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($data['name']))])
                ->first();
            if ($patient) return $patient;
        }

        return null;
    }

    /**
     * Register a new patient or gracefully reuse/update an existing patient profile.
     *
     * @param array $data
     * @return Patient
     */
    public function registerPatient(array $data): Patient
    {
        $hospitalId = $data['hospital_id'] ?? request()->user()?->hospital_id ?? 1;
        $existing = $this->findExistingPatient($hospitalId, $data);

        if ($existing) {
            // Update non-empty incoming fields without overwriting with null
            $updateData = array_filter($data, fn($v) => !is_null($v) && $v !== '');
            unset($updateData['id'], $updateData['uhid'], $updateData['hospital_id']);
            if (!empty($updateData)) {
                $existing->update($updateData);
            }
            return $existing->fresh();
        }

        return Patient::create($data);
    }

    /**
     * Get patient by ID.
     *
     * @param int $id
     * @return Patient
     */
    public function getPatientById(int $id): Patient
    {
        return Patient::findOrFail($id);
    }

    public function updatePatient(int $id, array $data): Patient
    {
        $patient = Patient::findOrFail($id);

        // NHA Guideline: After ABHA verification, Name, DOB, and Gender are non-editable
        if (!empty($patient->abha_number) || !empty($patient->kyc_verified)) {
            unset($data['name'], $data['dob'], $data['gender']);
        }

        $patient->update($data);
        return $patient->fresh();
    }

    /**
     * Link an existing hospital patient with an ABHA number and profile under ABDM.
     * Enforces TAGGING_UNIQUEPATIENTID_UNIQUEABHANUMBER rule.
     */
    public function linkAbha(int $id, array $data): Patient
    {
        $patient = Patient::findOrFail($id);

        $abhaNumber = $data['abha_number'] ?? null;
        if (empty($abhaNumber)) {
            throw new \InvalidArgumentException('ABHA Number is required for linking.');
        }

        // Strict NHA Rule: Check if another patient in the hospital already uses this ABHA number
        $conflict = Patient::where('hospital_id', $patient->hospital_id)
            ->where('id', '!=', $patient->id)
            ->where('abha_number', $abhaNumber)
            ->first();

        if ($conflict) {
            throw new \InvalidArgumentException("This ABHA number ({$abhaNumber}) is already linked to another patient: {$conflict->name} (UHID: {$conflict->uhid}). Duplicate ABHA linking is prohibited by ABDM guidelines.");
        }

        $updates = [
            'abha_number'  => $abhaNumber,
            'kyc_verified' => true,
        ];

        if (!empty($data['abha_address'])) {
            $updates['abha_address'] = $data['abha_address'];
        }

        if (!empty($data['abha_card_pdf']) || !empty($data['abha_card_base64'])) {
            $card = $data['abha_card_pdf'] ?? $data['abha_card_base64'];
            $updates['abha_card_pdf'] = $card;
        }

        // Fill in missing demographics without overwriting existing data if present
        foreach (['address', 'city', 'district', 'state', 'pincode', 'photo'] as $field) {
            if (!empty($data[$field]) && empty($patient->{$field})) {
                $updates[$field] = $data[$field];
            }
        }

        $patient->update($updates);
        \Illuminate\Support\Facades\Log::info("Patient {$patient->id} ({$patient->uhid}) successfully linked to ABHA {$abhaNumber}");

        return $patient->fresh();
    }

    public function deletePatient(int $id): bool
    {
        $patient = Patient::findOrFail($id);
        return (bool) $patient->delete();
    }

    /**
     * Get 360-degree comprehensive medical history and chronological timeline for a patient.
     */
    public function getPatientHistory(int $id, ?int $hospitalId = null): array
    {
        $query = Patient::query();
        if ($hospitalId) {
            $query->where('hospital_id', $hospitalId);
        }

        $patient = $query->with([
            'latestVital',
            'opdVisits' => function ($q) {
                $q->with(['doctor', 'department', 'vitals', 'latestVital'])
                  ->orderByDesc('visit_date')
                  ->orderByDesc('id');
            },
            'ipdAdmissions' => function ($q) {
                $q->with(['doctor', 'department', 'ward', 'bed', 'vitals'])
                  ->orderByDesc('admission_date')
                  ->orderByDesc('id');
            },
            'prescriptions' => function ($q) {
                $q->with(['doctor', 'items', 'diagnoses'])
                  ->orderByDesc('id');
            },
            'vitals' => function ($q) {
                $q->orderByDesc('recorded_at')->orderByDesc('id');
            },
            'billingLedgerItems' => function ($q) {
                $q->orderByDesc('charged_at')->orderByDesc('id');
            }
        ])->findOrFail($id);

        $opdVisits = $patient->opdVisits;
        $ipdAdmissions = $patient->ipdAdmissions;
        $prescriptions = $patient->prescriptions;
        $vitals = $patient->vitals;
        $ledgerItems = $patient->billingLedgerItems;

        // Determine current admission status
        $currentAdmission = $ipdAdmissions->firstWhere('status', 'admitted');

        // Extract known unique diagnoses
        $diagnosesList = [];
        foreach ($opdVisits as $visit) {
            if (!empty($visit->diagnosis)) {
                $diagnosesList[] = trim($visit->diagnosis);
            }
        }
        foreach ($prescriptions as $rx) {
            foreach ($rx->diagnoses as $diag) {
                $diagnosesList[] = trim(($diag->icd_code ? "{$diag->icd_code} - " : "") . $diag->diagnosis_name);
            }
        }
        $knownDiagnoses = array_values(array_unique(array_filter($diagnosesList)));

        // Dates
        $allDates = [];
        foreach ($opdVisits as $v) {
            if ($v->visit_date) $allDates[] = $v->visit_date->format('Y-m-d');
        }
        foreach ($ipdAdmissions as $adm) {
            if ($adm->admission_date) $allDates[] = $adm->admission_date->format('Y-m-d');
        }
        sort($allDates);
        $firstVisitDate = !empty($allDates) ? $allDates[0] : null;
        $lastVisitDate = !empty($allDates) ? end($allDates) : null;

        // Billing Ledger totals
        $validLedger = $ledgerItems->where('status', '!=', 'cancelled');
        $totalCharged = (float) $validLedger->sum('total_amount');
        $unbilledAmount = (float) $validLedger->where('status', 'unbilled')->sum('total_amount');
        $billedAmount = (float) $validLedger->where('status', 'billed')->sum('total_amount');

        // Summary
        $summary = [
            'total_opd_visits'       => $opdVisits->count(),
            'total_ipd_admissions'   => $ipdAdmissions->count(),
            'total_prescriptions'    => $prescriptions->count(),
            'total_vitals_logged'    => $vitals->count(),
            'is_currently_admitted'  => (bool) $currentAdmission,
            'current_admission'      => $currentAdmission ? [
                'id'             => $currentAdmission->id,
                'ipd_number'     => $currentAdmission->ipd_number,
                'admission_date' => $currentAdmission->admission_date?->toIso8601String(),
                'ward'           => $currentAdmission->ward?->name,
                'bed'            => $currentAdmission->bed?->bed_number,
                'doctor'         => $currentAdmission->doctor?->name,
            ] : null,
            'latest_vital'           => $patient->latestVital,
            'first_visit_date'       => $firstVisitDate,
            'last_visit_date'        => $lastVisitDate,
            'known_diagnoses'        => $knownDiagnoses,
            'billing'                => [
                'total_charged'   => $totalCharged,
                'unbilled_amount' => $unbilledAmount,
                'billed_amount'   => $billedAmount,
                'total_entries'   => $validLedger->count(),
            ],
        ];

        // Build Chronological Timeline
        $timeline = [];

        // 1. OPD Visits
        foreach ($opdVisits as $visit) {
            $timestamp = $visit->created_at ? $visit->created_at->toIso8601String() : now()->toIso8601String();
            if ($visit->visit_date) {
                $timePart = $visit->created_at ? $visit->created_at->format('H:i:s') : '00:00:00';
                $timestamp = $visit->visit_date->format('Y-m-d') . 'T' . $timePart;
            }

            $timeline[] = [
                'event_type' => 'opd_visit',
                'id'         => $visit->id,
                'timestamp'  => $timestamp,
                'title'      => 'OPD Consultation - ' . ($visit->doctor?->name ?? 'Doctor') . ' (' . ($visit->department?->name ?? 'General') . ')',
                'badge'      => 'OPD',
                'color'      => 'blue',
                'summary'    => $visit->chief_complaint ?: ($visit->diagnosis ?: 'Routine Consultation'),
                'data'       => [
                    'opd_number'      => $visit->opd_number,
                    'queue_token'     => $visit->queue_token,
                    'status'          => $visit->status,
                    'doctor_name'     => $visit->doctor?->name,
                    'department_name' => $visit->department?->name,
                    'chief_complaint' => $visit->chief_complaint,
                    'diagnosis'       => $visit->diagnosis,
                    'notes'           => $visit->notes,
                    'fee_charged'     => $visit->fee_charged,
                    'discount'        => $visit->discount,
                    'amount_paid'     => $visit->amount_paid,
                    'payment_status'  => $visit->payment_status,
                ],
            ];
        }

        // 2. IPD Admissions
        foreach ($ipdAdmissions as $admission) {
            $timestamp = $admission->admission_date ? $admission->admission_date->toIso8601String() : ($admission->created_at?->toIso8601String() ?? now()->toIso8601String());

            $timeline[] = [
                'event_type' => 'ipd_admission',
                'id'         => $admission->id,
                'timestamp'  => $timestamp,
                'title'      => 'IPD Admission - ' . ($admission->ward?->name ?? 'Ward') . ' (Bed ' . ($admission->bed?->bed_number ?? 'N/A') . ')',
                'badge'      => 'IPD',
                'color'      => 'purple',
                'summary'    => 'Admitted for: ' . ($admission->admission_reason ?: 'Inpatient Care') . ' [' . ucfirst($admission->status) . ']',
                'data'       => [
                    'ipd_number'       => $admission->ipd_number,
                    'status'           => $admission->status,
                    'admission_type'   => $admission->admission_type,
                    'admission_reason' => $admission->admission_reason,
                    'ward_name'        => $admission->ward?->name,
                    'bed_number'       => $admission->bed?->bed_number,
                    'doctor_name'      => $admission->doctor?->name,
                    'admission_date'   => $admission->admission_date?->toIso8601String(),
                    'discharge_date'   => $admission->discharge_date?->toIso8601String(),
                    'advance_deposit'  => $admission->advance_deposit,
                    'is_mlc'           => (bool) $admission->is_mlc,
                ],
            ];
        }

        // 3. Prescriptions
        foreach ($prescriptions as $rx) {
            $timestamp = $rx->created_at ? $rx->created_at->toIso8601String() : now()->toIso8601String();

            $medicineNames = $rx->items->pluck('medicine_name')->take(3)->implode(', ');
            if ($rx->items->count() > 3) {
                $medicineNames .= ' +' . ($rx->items->count() - 3) . ' more';
            }

            $timeline[] = [
                'event_type' => 'prescription',
                'id'         => $rx->id,
                'timestamp'  => $timestamp,
                'title'      => 'Prescription ' . $rx->prescription_code . ' (' . ($rx->doctor?->name ?? 'Doctor') . ')',
                'badge'      => 'Rx',
                'color'      => 'emerald',
                'summary'    => $medicineNames ?: 'Prescribed Medicines',
                'data'       => [
                    'prescription_code' => $rx->prescription_code,
                    'doctor_name'       => $rx->doctor?->name,
                    'items_count'       => $rx->items->count(),
                    'items'             => $rx->items->map(fn($item) => [
                        'medicine_name' => $item->medicine_name,
                        'dosage'        => $item->dosage,
                        'frequency'     => $item->frequency,
                        'duration_days' => $item->duration_days,
                        'timing'        => $item->timing,
                        'instructions'  => $item->instructions,
                    ]),
                    'diagnoses'         => $rx->diagnoses->map(fn($d) => [
                        'icd_code'       => $d->icd_code,
                        'diagnosis_name' => $d->diagnosis_name,
                        'diagnosis_type' => $d->diagnosis_type,
                    ]),
                    'advice'            => $rx->advice,
                    'follow_up_date'    => $rx->follow_up_date?->format('Y-m-d'),
                ],
            ];
        }

        // 4. Vitals
        foreach ($vitals as $v) {
            $timestamp = $v->recorded_at ? $v->recorded_at->toIso8601String() : ($v->created_at?->toIso8601String() ?? now()->toIso8601String());

            $bpText = ($v->bp_systolic && $v->bp_diastolic) ? "{$v->bp_systolic}/{$v->bp_diastolic} mmHg" : null;
            $pulseText = $v->pulse ? "{$v->pulse} bpm" : null;
            $spo2Text = $v->spo2 ? "{$v->spo2}%" : null;
            $vitalsSnippet = implode(' | ', array_filter([$bpText, $pulseText, $spo2Text])) ?: 'Vitals Recorded';

            $timeline[] = [
                'event_type' => 'vital',
                'id'         => $v->id,
                'timestamp'  => $timestamp,
                'title'      => 'Vitals Check (' . $vitalsSnippet . ')',
                'badge'      => 'Vitals',
                'color'      => 'amber',
                'summary'    => $vitalsSnippet,
                'data'       => [
                    'bp_systolic'      => $v->bp_systolic,
                    'bp_diastolic'     => $v->bp_diastolic,
                    'pulse'            => $v->pulse,
                    'temperature'      => $v->temperature,
                    'spo2'             => $v->spo2,
                    'respiratory_rate' => $v->respiratory_rate,
                    'weight'           => $v->weight,
                    'height'           => $v->height,
                    'bmi'              => $v->bmi,
                    'notes'            => $v->notes,
                ],
            ];
        }

        // Sort unified timeline descending by timestamp
        usort($timeline, function ($a, $b) {
            return strcmp($b['timestamp'], $a['timestamp']);
        });

        return [
            'patient'        => new \App\Http\Resources\PatientResource($patient),
            'summary'        => $summary,
            'timeline'       => $timeline,
            'opd_visits'     => $opdVisits,
            'ipd_admissions' => $ipdAdmissions,
            'prescriptions'  => $prescriptions,
            'vitals'         => $vitals,
        ];
    }

    /**
     * Get aggregate statistics of registered patients (Total, Male, Female, Other, ABHA Linked).
     */
    public function getPatientStats($request = null): array
    {
        $req = $request ?? request();
        $hospitalId = $req->user()?->hospital_id ?? $req->query('hospital_id');

        $query = Patient::query();
        if ($hospitalId) {
            $query->where('hospital_id', $hospitalId);
        }

        $total = (clone $query)->count();
        $maleCount = (clone $query)->whereIn('gender', ['M', 'Male', 'm', 'male'])->count();
        $femaleCount = (clone $query)->whereIn('gender', ['F', 'Female', 'f', 'female'])->count();
        $otherCount = (clone $query)->whereNotIn('gender', ['M', 'Male', 'm', 'male', 'F', 'Female', 'f', 'female'])->count();
        $abhaLinked = (clone $query)->where(function ($q) {
            $q->where(function ($sub) {
                $sub->whereNotNull('abha_number')->where('abha_number', '!=', '');
            })->orWhere(function ($sub) {
                $sub->whereNotNull('abha_address')->where('abha_address', '!=', '');
            });
        })->count();

        return [
            'total'         => $total,
            'male'          => $maleCount,
            'female'        => $femaleCount,
            'other'         => $otherCount,
            'abha_linked'   => $abhaLinked,
            'abha_unlinked' => max(0, $total - $abhaLinked),
        ];
    }
}


