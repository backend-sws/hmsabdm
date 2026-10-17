<?php

namespace App\Services\Emergency;

use App\Models\EmergencyTriage;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Ward;
use App\Models\Bed;
use App\Models\IpdAdmission;
use App\Models\Vital;
use App\Models\BillingLedgerItem;
use App\Models\ChargeMaster;
use App\Models\Hospital;
use Illuminate\Support\Facades\DB;

class EmergencyService implements EmergencyServiceInterface
{
    /**
     * Fast-track 5-second emergency admission and triage desk entry.
     */
    public function admitTriage(int $hospitalId, array $data, int $userId): array
    {
        return DB::transaction(function () use ($hospitalId, $data, $userId) {
            $year = date('Y');

            // 1. Resolve or Create Patient
            $patient = null;
            if (!empty($data['patient_id'])) {
                $patient = Patient::where('hospital_id', $hospitalId)->findOrFail($data['patient_id']);
            } elseif (!empty($data['uhid'])) {
                $patient = Patient::where('hospital_id', $hospitalId)->where('uhid', $data['uhid'])->firstOrFail();
            } else {
                // Generate fast-track Temporary Emergency UHID (EMG-YYYY-XXXXX)
                $lastTempCount = Patient::where('hospital_id', $hospitalId)
                    ->where('uhid', 'like', "EMG-{$year}-%")
                    ->count();
                $tempSeq = str_pad($lastTempCount + 1, 5, '0', STR_PAD_LEFT);
                $tempUhid = "EMG-{$year}-{$tempSeq}";

                $isUnknown = !empty($data['is_unknown_patient']) || empty(trim($data['patient_name'] ?? ''));
                $gender = $data['gender'] ?? 'O';
                $trimmedName = trim($data['patient_name'] ?? '');
                $patientName = !empty($trimmedName)
                    ? $trimmedName
                    : ($isUnknown ? ("Unknown " . ($gender === 'F' ? 'Female' : ($gender === 'M' ? 'Male' : 'Patient')) . " ({$tempSeq})") : 'Emergency Patient');

                $dob = null;
                if (!empty($data['approximate_age'])) {
                    $dob = now()->subYears((int) $data['approximate_age'])->toDateString();
                }

                $patient = Patient::create([
                    'hospital_id'   => $hospitalId,
                    'uhid'          => $tempUhid,
                    'name'          => $patientName,
                    'gender'        => $gender,
                    'dob'           => $dob,
                    'mobile'        => $data['mobile'] ?? null,
                    'address'       => $data['address'] ?? null,
                    'custom_fields' => [
                        'is_emergency_temp' => true,
                        'approximate_age'   => $data['approximate_age'] ?? null,
                        'brought_by'        => $data['brought_by'] ?? 'Self',
                    ],
                ]);
            }

            // 2. Resolve Doctor
            $doctor = null;
            if (!empty($data['doctor_id'])) {
                $doctor = Doctor::where('hospital_id', $hospitalId)->find($data['doctor_id']);
            } else {
                $doctor = Doctor::where('hospital_id', $hospitalId)->where('is_active', true)->first();
            }

            // 3. Instant Bed Allocation & IPD Admission (if bed requested)
            $ipdAdmission = null;
            $wardId = $data['ward_id'] ?? null;
            $bedId = $data['bed_id'] ?? null;

            if ($bedId) {
                $bed = Bed::where('hospital_id', $hospitalId)->findOrFail($bedId);
                $wardId = $wardId ?? $bed->ward_id;

                $bed->update(['status' => 'occupied']);

                $ipdAdmission = IpdAdmission::create([
                    'hospital_id'      => $hospitalId,
                    'patient_id'       => $patient->id,
                    'doctor_id'        => $doctor?->id,
                    'department_id'    => $doctor?->department_id,
                    'ward_id'          => $wardId,
                    'bed_id'           => $bed->id,
                    'admission_type'   => 'emergency',
                    'admission_reason' => $data['chief_complaint'] ?? 'Emergency Triage Admission',
                    'is_mlc'           => !empty($data['is_mlc']),
                    'mlc_details'      => !empty($data['is_mlc']) ? ($data['mlc_injuries_details'] ?? 'Medico-Legal Case') : null,
                    'status'           => 'admitted',
                    'admission_date'   => now(),
                    'advance_deposit'  => (float) ($data['advance_deposit'] ?? 0),
                ]);

                $bed->update(['current_admission_id' => $ipdAdmission->id]);
            }

            // 4. Create Emergency Triage Record
            $triage = EmergencyTriage::create([
                'hospital_id'          => $hospitalId,
                'patient_id'           => $patient->id,
                'doctor_id'            => $doctor?->id,
                'ipd_admission_id'     => $ipdAdmission?->id,
                'ward_id'              => $wardId,
                'bed_id'               => $bedId,
                'is_unknown_patient'   => !empty($data['is_unknown_patient']),
                'patient_name'         => $patient->name,
                'gender'               => $patient->gender,
                'approximate_age'      => $data['approximate_age'] ?? null,
                'brought_by'           => $data['brought_by'] ?? 'Self',
                'brought_by_contact'   => $data['brought_by_contact'] ?? null,
                'priority_level'       => $data['priority_level'] ?? 'yellow',
                'triage_category'      => $data['triage_category'] ?? 'General',
                'chief_complaint'      => $data['chief_complaint'] ?? null,
                'consciousness_level'  => $data['consciousness_level'] ?? 'alert',
                'gcs_score'            => $data['gcs_score'] ?? null,
                'initial_vitals'       => $data['initial_vitals'] ?? null,
                'is_mlc'               => !empty($data['is_mlc']),
                'police_station'       => $data['police_station'] ?? null,
                'police_officer_name'  => $data['police_officer_name'] ?? null,
                'police_buckle_number' => $data['police_buckle_number'] ?? null,
                'incident_place'       => $data['incident_place'] ?? null,
                'mlc_injuries_details' => $data['mlc_injuries_details'] ?? null,
                'status'               => 'under_treatment',
                'arrival_time'         => now(),
                'clinical_notes'       => $data['clinical_notes'] ?? null,
                'created_by_user_id'   => $userId,
            ]);

            // 5. Initial Vitals Recording (if provided)
            if (!empty($data['initial_vitals']) && is_array($data['initial_vitals'])) {
                Vital::create([
                    'hospital_id'        => $hospitalId,
                    'patient_id'         => $patient->id,
                    'encounter_type'     => 'emergency',
                    'ipd_admission_id'   => $ipdAdmission?->id,
                    'recorded_by'        => $userId ?: 1,
                    'blood_pressure_sys' => $data['initial_vitals']['bp_systolic'] ?? ($data['initial_vitals']['blood_pressure_sys'] ?? null),
                    'blood_pressure_dia' => $data['initial_vitals']['bp_diastolic'] ?? ($data['initial_vitals']['blood_pressure_dia'] ?? null),
                    'pulse_rate'         => $data['initial_vitals']['pulse'] ?? ($data['initial_vitals']['pulse_rate'] ?? null),
                    'temperature'        => $data['initial_vitals']['temperature'] ?? null,
                    'oxygen_saturation'  => $data['initial_vitals']['spo2'] ?? ($data['initial_vitals']['oxygen_saturation'] ?? null),
                    'respiratory_rate'   => $data['initial_vitals']['respiratory_rate'] ?? null,
                    'recorded_at'        => now(),
                ]);
            }


            // 6. Auto-post Emergency Tariff to Patient Running Ledger
            $tariff = ChargeMaster::where('hospital_id', $hospitalId)
                ->where('is_active', true)
                ->where(function ($q) {
                    $q->where('code', 'DOC-EMG-CALL')
                      ->orWhere('code', 'ADM-REG-FEE')
                      ->orWhere('code', 'DOC-EMG')
                      ->orWhere('code', 'ADM-EMG');
                })
                ->first();

            $chargeName = $tariff ? $tariff->name : 'Emergency Admission & Doctor Triage Fee';
            $chargeRate = $tariff ? (float) $tariff->standard_rate : 500.00;
            $chargeCategory = $tariff ? ($tariff->category?->name ?? 'administrative_charges') : 'administrative_charges';

            BillingLedgerItem::create([
                'hospital_id'        => $hospitalId,
                'patient_id'         => $patient->id,
                'encounter_type'     => 'emergency',
                'encounter_id'       => $triage->id,
                'charge_id'          => $tariff?->id,
                'category'           => $chargeCategory,
                'item_name'          => $chargeName,
                'unit_price'         => $chargeRate,
                'quantity'           => 1.0,
                'tax_amount'         => 0.00,
                'total_amount'       => $chargeRate,
                'charged_at'         => now(),
                'charged_by_user_id' => $userId,
                'auto_generated'     => true,
                'notes'              => "Auto-applied on emergency triage ({$triage->priority_level})",
                'status'             => 'unbilled',
            ]);


            return $triage->load(['patient', 'doctor', 'ward', 'bed', 'ipdAdmission'])->toArray();
        });
    }

    /**
     * Post-stabilization patient identity linking.
     */
    public function linkPatient(int $hospitalId, int $triageId, array $data): array
    {
        return DB::transaction(function () use ($hospitalId, $triageId, $data) {
            $triage = EmergencyTriage::where('hospital_id', $hospitalId)->findOrFail($triageId);

            $targetPatient = null;
            if (!empty($data['target_patient_id'])) {
                $targetPatient = Patient::where('hospital_id', $hospitalId)->findOrFail($data['target_patient_id']);
            } elseif (!empty($data['uhid'])) {
                $targetPatient = Patient::where('hospital_id', $hospitalId)->where('uhid', $data['uhid'])->first();
            }

            if ($targetPatient) {
                // Link emergency records to the existing target patient
                $oldPatientId = $triage->patient_id;
                $triage->update([
                    'patient_id'         => $targetPatient->id,
                    'patient_name'       => $targetPatient->name,
                    'gender'             => $targetPatient->gender,
                    'is_unknown_patient' => false,
                ]);

                if ($triage->ipd_admission_id) {
                    IpdAdmission::where('id', $triage->ipd_admission_id)->update([
                        'patient_id' => $targetPatient->id,
                    ]);
                }

                Vital::where('encounter_type', 'emergency')
                    ->where('encounter_id', $triage->id)
                    ->update(['patient_id' => $targetPatient->id]);

                BillingLedgerItem::where('encounter_type', 'emergency')
                    ->where('encounter_id', $triage->id)
                    ->update(['patient_id' => $targetPatient->id]);

            } else {
                // Upgrade current temp patient profile with verified KYC / ABHA demographics
                $patient = Patient::where('hospital_id', $hospitalId)->findOrFail($triage->patient_id);
                $updateData = array_filter($data, fn($v) => !is_null($v) && $v !== '');
                
                // Clear temporary flag
                $customFields = $patient->custom_fields ?? [];
                $customFields['is_emergency_temp'] = false;
                $customFields['verified_at'] = now()->toIso8601String();
                $updateData['custom_fields'] = $customFields;
                
                $patient->update($updateData);

                $triage->update([
                    'patient_name'       => $patient->name,
                    'gender'             => $patient->gender,
                    'is_unknown_patient' => false,
                ]);
            }

            return $triage->fresh(['patient', 'doctor', 'ward', 'bed', 'ipdAdmission'])->toArray();
        });
    }

    /**
     * Generate official Police Intimation Memo (MLC Slip).
     */
    public function getMlcSlip(int $hospitalId, int $triageId): array
    {
        $triage = EmergencyTriage::where('hospital_id', $hospitalId)
            ->with(['patient', 'doctor', 'ward', 'bed'])
            ->findOrFail($triageId);

        if (!$triage->is_mlc) {
            throw new \Exception('This emergency case is not registered as a Medico-Legal Case (MLC).');
        }

        $hospital = Hospital::find($hospitalId);

        return [
            'hospital' => [
                'name'         => $hospital->name,
                'code'         => $hospital->code,
                'abdm_hip_id'  => $hospital->abdm_hip_id,
            ],
            'mlc_details' => [
                'mlc_number'           => $triage->mlc_number,
                'triage_number'        => $triage->triage_number,
                'arrival_time'         => $triage->arrival_time?->toIso8601String(),
                'police_station'       => $triage->police_station ?: 'Local Police Station',
                'police_officer_name'  => $triage->police_officer_name,
                'police_buckle_number' => $triage->police_buckle_number,
                'incident_place'       => $triage->incident_place,
                'injuries_description' => $triage->mlc_injuries_details ?: $triage->chief_complaint,
            ],
            'patient' => [
                'uhid'            => $triage->patient?->uhid,
                'name'            => $triage->patient_name,
                'gender'          => $triage->gender,
                'approximate_age' => $triage->approximate_age,
                'address'         => $triage->patient?->address,
                'brought_by'      => $triage->brought_by,
                'brought_by_phone'=> $triage->brought_by_contact,
            ],
            'clinical_assessment' => [
                'consciousness_level' => $triage->consciousness_level,
                'gcs_score'           => $triage->gcs_score,
                'initial_vitals'      => $triage->initial_vitals,
                'priority_level'      => $triage->priority_level,
                'examining_doctor'    => $triage->doctor?->name ?? 'Casualty Medical Officer (CMO)',
                'doctor_reg_no'       => $triage->doctor?->hpr_id,
            ],
            'declaration' => "This is to officially intimate that the above named patient was brought to this hospital under emergency conditions with injuries of medico-legal nature. Necessary emergency medical care has been initiated.",
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get list of emergency triages with dashboard priority counters and filters.
     */
    public function getTriagesList(int $hospitalId, $request = null): array
    {
        $query = EmergencyTriage::where('hospital_id', $hospitalId)
            ->with(['patient', 'doctor', 'ward', 'bed', 'ipdAdmission'])
            ->orderByDesc('arrival_time');

        if ($request) {
            if ($request->filled('priority_level')) {
                $query->where('priority_level', $request->query('priority_level'));
            }
            if ($request->filled('status')) {
                $query->where('status', $request->query('status'));
            }
            if ($request->filled('is_mlc')) {
                $query->where('is_mlc', filter_var($request->query('is_mlc'), FILTER_VALIDATE_BOOLEAN));
            }
            if ($request->filled('search')) {
                $search = $request->query('search');
                $query->where(function ($q) use ($search) {
                    $q->where('triage_number', 'ilike', "%{$search}%")
                      ->orWhere('mlc_number', 'ilike', "%{$search}%")
                      ->orWhere('patient_name', 'ilike', "%{$search}%");
                });
            }
        }

        // Live Triage Dashboard Counters
        $counters = [
            'total_today'    => EmergencyTriage::where('hospital_id', $hospitalId)->whereDate('arrival_time', today())->count(),
            'red_priority'   => EmergencyTriage::where('hospital_id', $hospitalId)->where('priority_level', 'red')->where('status', 'under_treatment')->count(),
            'yellow_priority'=> EmergencyTriage::where('hospital_id', $hospitalId)->where('priority_level', 'yellow')->where('status', 'under_treatment')->count(),
            'green_priority' => EmergencyTriage::where('hospital_id', $hospitalId)->where('priority_level', 'green')->where('status', 'under_treatment')->count(),
            'active_in_er'   => EmergencyTriage::where('hospital_id', $hospitalId)->where('status', 'under_treatment')->count(),
            'mlc_cases'      => EmergencyTriage::where('hospital_id', $hospitalId)->where('is_mlc', true)->count(),
        ];

        $triages = $query->paginate($request?->query('per_page', 20) ?? 20);

        return [
            'counters' => $counters,
            'triages'  => $triages,
        ];
    }

    /**
     * Update clinical status of an emergency triage.
     */
    public function updateTriageStatus(int $hospitalId, int $triageId, string $status, ?string $notes = null, array $extra = []): array
    {
        return DB::transaction(function () use ($hospitalId, $triageId, $status, $notes, $extra) {
            $triage = EmergencyTriage::where('hospital_id', $hospitalId)->findOrFail($triageId);

            $updateData = ['status' => $status];
            if ($notes) {
                $updateData['clinical_notes'] = ($triage->clinical_notes ? $triage->clinical_notes . "\n" : '') . "[" . now()->toDateTimeString() . "] " . $notes;
            }

            if ($status === 'stabilized') {
                $updateData['stabilized_at'] = now();
            } elseif ($status === 'admitted_to_ipd') {
                if (empty($triage->ipd_admission_id) && !empty($extra['bed_id'])) {
                    $bed = Bed::where('hospital_id', $hospitalId)->findOrFail($extra['bed_id']);
                    $wardId = $extra['ward_id'] ?? $bed->ward_id;
                    $bed->update(['status' => 'occupied']);

                    $ipdAdmission = IpdAdmission::create([
                        'hospital_id'      => $hospitalId,
                        'patient_id'       => $triage->patient_id,
                        'doctor_id'        => $triage->doctor_id,
                        'department_id'    => $triage->doctor?->department_id,
                        'ward_id'          => $wardId,
                        'bed_id'           => $bed->id,
                        'admission_type'   => 'emergency',
                        'admission_reason' => $triage->chief_complaint ?? 'Admitted from Emergency Casualty',
                        'is_mlc'           => !empty($triage->is_mlc),
                        'mlc_details'      => $triage->mlc_injuries_details,
                        'status'           => 'admitted',
                        'admission_date'   => now(),
                        'advance_deposit'  => (float) ($extra['advance_deposit'] ?? 0),
                    ]);

                    $bed->update(['current_admission_id' => $ipdAdmission->id]);
                    $updateData['ipd_admission_id'] = $ipdAdmission->id;
                    $updateData['ward_id'] = $wardId;
                    $updateData['bed_id'] = $bed->id;
                }
            } elseif ($status === 'discharged' || $status === 'transferred_external') {
                $updateData['discharged_at'] = now();
                // Free the bed if currently occupied
                if ($triage->bed_id) {
                    Bed::where('id', $triage->bed_id)->update(['status' => 'available', 'current_admission_id' => null]);
                }
                if ($triage->ipd_admission_id) {
                    IpdAdmission::where('id', $triage->ipd_admission_id)->update(['status' => 'discharged', 'discharge_date' => now()]);
                }
            }

            $triage->update($updateData);

            return $triage->fresh(['patient', 'doctor', 'ward', 'bed', 'ipdAdmission'])->toArray();
        });
    }

    /**
     * Generate official Emergency Discharge & Transfer / Referral Summary Slip.
     */
    public function getDischargeSlip(int $hospitalId, int $triageId): array
    {
        $triage = EmergencyTriage::where('hospital_id', $hospitalId)
            ->with(['patient', 'doctor', 'ward', 'bed'])
            ->findOrFail($triageId);

        $hospital = Hospital::find($hospitalId);

        // Fetch latest vitals for discharge summary
        $latestVital = Vital::where('hospital_id', $hospitalId)
            ->where('patient_id', $triage->patient_id)
            ->where('encounter_type', 'emergency')
            ->orderByDesc('recorded_at')
            ->first();

        return [
            'hospital' => [
                'name'         => $hospital->name,
                'code'         => $hospital->code,
                'abdm_hip_id'  => $hospital->abdm_hip_id,
                'address'      => $hospital->address ?? 'Emergency & Trauma Department',
            ],
            'triage' => [
                'id'                   => $triage->id,
                'triage_number'        => $triage->triage_number,
                'priority_level'       => $triage->priority_level,
                'triage_category'      => $triage->triage_category,
                'status'               => $triage->status,
                'arrival_time'         => $triage->arrival_time?->toIso8601String(),
                'stabilized_at'        => $triage->stabilized_at?->toIso8601String(),
                'discharged_at'        => $triage->discharged_at?->toIso8601String() ?? now()->toIso8601String(),
                'chief_complaint'      => $triage->chief_complaint,
                'clinical_notes'       => $triage->clinical_notes,
                'is_mlc'               => $triage->is_mlc,
                'mlc_number'           => $triage->mlc_number,
            ],
            'patient' => [
                'id'              => $triage->patient_id,
                'uhid'            => $triage->patient?->uhid,
                'name'            => $triage->patient_name,
                'gender'          => $triage->gender,
                'approximate_age' => $triage->approximate_age,
                'mobile'          => $triage->patient?->mobile,
                'address'         => $triage->patient?->address,
                'brought_by'      => $triage->brought_by,
                'brought_by_phone'=> $triage->brought_by_contact,
            ],
            'discharge_vitals' => $latestVital ? [
                'bp'          => "{$latestVital->blood_pressure_sys}/{$latestVital->blood_pressure_dia}",
                'pulse'       => $latestVital->pulse_rate,
                'spo2'        => $latestVital->oxygen_saturation,
                'temperature' => $latestVital->temperature,
                'resp_rate'   => $latestVital->respiratory_rate,
            ] : ($triage->initial_vitals ?? null),
            'doctor' => [
                'name'           => $triage->doctor?->name ?? 'Casualty Medical Officer (CMO)',
                'specialization' => $triage->doctor?->specialization ?? 'Emergency Medicine',
                'hpr_id'         => $triage->doctor?->hpr_id,
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Record new continuous bedside vitals for an active casualty triage.
     */
    public function recordVitals(int $hospitalId, int $triageId, array $data, int $userId): array
    {
        return DB::transaction(function () use ($hospitalId, $triageId, $data, $userId) {
            $triage = EmergencyTriage::where('hospital_id', $hospitalId)->findOrFail($triageId);

            $vital = Vital::create([
                'hospital_id'        => $hospitalId,
                'patient_id'         => $triage->patient_id,
                'encounter_type'     => 'emergency',
                'encounter_id'       => $triage->id,
                'ipd_admission_id'   => $triage->ipd_admission_id,
                'recorded_by'        => $userId ?: 1,
                'blood_pressure_sys' => $data['blood_pressure_sys'] ?? ($data['bp_systolic'] ?? null),
                'blood_pressure_dia' => $data['blood_pressure_dia'] ?? ($data['bp_diastolic'] ?? null),
                'pulse_rate'         => $data['pulse_rate'] ?? ($data['pulse'] ?? null),
                'temperature'        => $data['temperature'] ?? null,
                'oxygen_saturation'  => $data['oxygen_saturation'] ?? ($data['spo2'] ?? null),
                'respiratory_rate'   => $data['respiratory_rate'] ?? null,
                'blood_glucose'      => $data['blood_glucose'] ?? null,
                'custom_vitals'      => [
                    'gcs_score'  => $data['gcs_score'] ?? null,
                    'pain_score' => $data['pain_score'] ?? null,
                    'notes'      => $data['notes'] ?? null,
                ],
                'recorded_at'        => now(),
            ]);

            // Update latest vitals on triage record as well
            $updatedVitals = array_merge($triage->initial_vitals ?? [], [
                'bp_systolic'      => $vital->blood_pressure_sys,
                'bp_diastolic'     => $vital->blood_pressure_dia,
                'pulse'            => $vital->pulse_rate,
                'spo2'             => $vital->oxygen_saturation,
                'temperature'      => $vital->temperature,
                'respiratory_rate' => $vital->respiratory_rate,
                'last_updated_at'  => now()->toIso8601String(),
            ]);

            $updatePayload = ['initial_vitals' => $updatedVitals];
            if (!empty($data['gcs_score'])) {
                $updatePayload['gcs_score'] = (int) $data['gcs_score'];
            }
            if (!empty($data['consciousness_level'])) {
                $updatePayload['consciousness_level'] = $data['consciousness_level'];
            }

            $triage->update($updatePayload);

            return $vital->toArray();
        });
    }

    /**
     * Get historical sequence of vitals recorded for this emergency encounter.
     */
    public function getVitals(int $hospitalId, int $triageId): array
    {
        $triage = EmergencyTriage::where('hospital_id', $hospitalId)->findOrFail($triageId);

        $vitals = Vital::where('hospital_id', $hospitalId)
            ->where('patient_id', $triage->patient_id)
            ->where('encounter_type', 'emergency')
            ->orderByDesc('recorded_at')
            ->get();

        return [
            'triage_id'      => $triage->id,
            'triage_number'  => $triage->triage_number,
            'initial_vitals' => $triage->initial_vitals,
            'history'        => $vitals->toArray(),
        ];
    }

    /**
     * Add CMO / Doctor's provisional diagnosis and emergency clinical notes.
     */
    public function addClinicalNotes(int $hospitalId, int $triageId, array $data, int $userId): array
    {
        return DB::transaction(function () use ($hospitalId, $triageId, $data, $userId) {
            $triage = EmergencyTriage::where('hospital_id', $hospitalId)->findOrFail($triageId);

            $timestamp = now()->format('Y-m-d H:i');
            $user = \App\Models\User::find($userId);
            $userName = $user ? $user->name : "Staff #{$userId}";

            $noteLines = [];
            if (!empty($data['provisional_diagnosis'])) {
                $noteLines[] = "PROVISIONAL DIAGNOSIS: " . trim($data['provisional_diagnosis']);
            }
            if (!empty($data['treatment_given'])) {
                $treatmentText = is_array($data['treatment_given']) ? implode(', ', $data['treatment_given']) : $data['treatment_given'];
                $noteLines[] = "INTERVENTIONS: " . trim($treatmentText);
            }
            if (!empty($data['doctor_notes'])) {
                $noteLines[] = "DOCTOR NOTES: " . trim($data['doctor_notes']);
            }

            $entry = "[{$timestamp} by {$userName}]\n" . implode("\n", $noteLines);
            $newClinicalNotes = $triage->clinical_notes ? ($triage->clinical_notes . "\n\n" . $entry) : $entry;

            $updateData = ['clinical_notes' => $newClinicalNotes];
            if (!empty($data['doctor_id'])) {
                $updateData['doctor_id'] = $data['doctor_id'];
            }

            $triage->update($updateData);

            return $triage->fresh(['patient', 'doctor', 'ward', 'bed'])->toArray();
        });
    }

    /**
     * Collect and record an emergency advance deposit with receipt generation.
     */
    public function collectDeposit(int $hospitalId, int $triageId, array $data, int $userId): array
    {
        return DB::transaction(function () use ($hospitalId, $triageId, $data, $userId) {
            $triage = EmergencyTriage::where('hospital_id', $hospitalId)->findOrFail($triageId);
            $amount = (float) ($data['amount'] ?? 0);
            if ($amount <= 0) {
                throw new \InvalidArgumentException('Deposit amount must be greater than zero.');
            }

            $year = date('Y');
            $lastRec = BillingLedgerItem::where('hospital_id', $hospitalId)
                ->where('notes', 'like', "EMG-DEP-{$year}-%")
                ->count();
            $recSeq = str_pad($lastRec + 1, 5, '0', STR_PAD_LEFT);
            $receiptNumber = "EMG-DEP-{$year}-{$recSeq}";

            $paymentMethod = $data['payment_method'] ?? 'cash';
            $transactionRef = $data['transaction_ref'] ?? null;

            // Record into ledger as credit / advance payment
            $ledgerItem = BillingLedgerItem::create([
                'hospital_id'        => $hospitalId,
                'patient_id'         => $triage->patient_id,
                'encounter_type'     => 'emergency',
                'encounter_id'       => $triage->id,
                'category'           => 'payment_deposit',
                'item_name'          => 'Emergency Advance Deposit',
                'unit_price'         => -$amount,
                'quantity'           => 1.0,
                'total_amount'       => -$amount,
                'charged_at'         => now(),
                'charged_by_user_id' => $userId,
                'auto_generated'     => false,
                'notes'              => "{$receiptNumber} | Mode: " . strtoupper($paymentMethod) . ($transactionRef ? " (Ref: {$transactionRef})" : ""),
                'status'             => 'paid',
            ]);

            // Update triage advance deposit if IPD admission exists or update record
            if ($triage->ipd_admission_id) {
                $admission = IpdAdmission::find($triage->ipd_admission_id);
                if ($admission) {
                    $admission->increment('advance_deposit', $amount);
                }
            }

            $hospital = Hospital::find($hospitalId);

            return [
                'receipt_number' => $receiptNumber,
                'hospital'       => [
                    'name'    => $hospital->name,
                    'code'    => $hospital->code,
                    'address' => $hospital->address ?? 'Emergency & Trauma Department',
                ],
                'patient' => [
                    'name' => $triage->patient_name,
                    'uhid' => $triage->patient?->uhid,
                ],
                'triage_number'  => $triage->triage_number,
                'amount'         => $amount,
                'payment_method' => $paymentMethod,
                'transaction_ref'=> $transactionRef,
                'collected_by'   => \App\Models\User::find($userId)?->name ?? "Staff #{$userId}",
                'collected_at'   => now()->toIso8601String(),
                'ledger_item_id' => $ledgerItem->id,
            ];
        });
    }
}
