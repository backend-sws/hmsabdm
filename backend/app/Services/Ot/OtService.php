<?php

namespace App\Services\Ot;

use App\Models\OperationTheatre;
use App\Models\OtSchedule;
use App\Models\OtChecklistRecord;
use App\Models\Hospital;
use App\Models\HospitalSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OtService implements OtServiceInterface
{
    /**
     * Get list of all Operation Theatres and their live status.
     */
    public function getTheatres(int $hospitalId): array
    {
        return OperationTheatre::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->withCount([
                'todaySchedules as today_surgeries_count',
                'todaySchedules as active_surgeries_count' => function ($q) {
                    $q->whereIn('status', ['in_theatre', 'recovery']);
                }
            ])
            ->orderBy('id')
            ->get()
            ->toArray();
    }

    /**
     * Get OT Schedules filtered by date, theatre, doctor, status.
     */
    public function getSchedules(int $hospitalId, array $filters = []): array
    {
        $query = OtSchedule::where('hospital_id', $hospitalId)
            ->with([
                'operationTheatre',
                'patient:id,name,uhid,gender,dob,blood_group',
                'primarySurgeon:id,name,qualification,department_id',
                'primarySurgeon.department:id,name',
                'assistantSurgeon:id,name',
                'anesthetist:id,name',
                'department:id,name',
                'ipdAdmission:id,ipd_number,ward_id,bed_id',
                'ipdAdmission.ward:id,name',
                'ipdAdmission.bed:id,bed_number',
                'checklistRecord',
            ]);

        if (!empty($filters['date'])) {
            $query->whereDate('surgery_date', $filters['date']);
        }

        if (!empty($filters['theatre_id'])) {
            $query->where('operation_theatre_id', $filters['theatre_id']);
        }

        if (!empty($filters['surgeon_id'])) {
            $query->where('primary_surgeon_id', $filters['surgeon_id']);
        }

        if (!empty($filters['patient_id'])) {
            $query->where('patient_id', $filters['patient_id']);
        }

        if (!empty($filters['ipd_admission_id'])) {
            $query->where('ipd_admission_id', $filters['ipd_admission_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderBy('surgery_date', 'asc')
            ->orderBy('scheduled_start_time', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->toArray();
    }

    /**
     * Get single OT Schedule details.
     */
    public function getSchedule(int $hospitalId, int $scheduleId): array
    {
        return OtSchedule::where('hospital_id', $hospitalId)
            ->with([
                'operationTheatre',
                'patient',
                'primarySurgeon.department',
                'assistantSurgeon',
                'anesthetist',
                'department',
                'ipdAdmission.ward',
                'ipdAdmission.bed',
                'checklistRecord',
                'createdByUser:id,name',
            ])
            ->findOrFail($scheduleId)
            ->toArray();
    }

    /**
     * Book a new surgery schedule and initialize WHO Checklist.
     */
    public function createSchedule(int $hospitalId, array $data, ?int $userId = null): array
    {
        return DB::transaction(function () use ($hospitalId, $data, $userId) {
            $year = date('Y');
            $count = OtSchedule::where('hospital_id', $hospitalId)->whereYear('created_at', $year)->count() + 1;
            $bookingNumber = sprintf("OT-%s-%04d", $year, $count);

            $validUserId = ($userId && User::where('id', $userId)->exists()) ? $userId : null;

            $schedule = OtSchedule::create([
                'hospital_id'            => $hospitalId,
                'booking_number'         => $bookingNumber,
                'operation_theatre_id'   => $data['operation_theatre_id'] ?? null,
                'ipd_admission_id'       => $data['ipd_admission_id'] ?? null,
                'patient_id'             => $data['patient_id'],
                'primary_surgeon_id'     => $data['primary_surgeon_id'],
                'assistant_surgeon_id'   => $data['assistant_surgeon_id'] ?? null,
                'anesthetist_id'         => $data['anesthetist_id'] ?? null,
                'surgical_department_id' => $data['surgical_department_id'] ?? null,
                'procedure_name'         => $data['procedure_name'],
                'procedure_code'         => $data['procedure_code'] ?? null,
                'surgery_date'           => $data['surgery_date'] ?? now()->toDateString(),
                'scheduled_start_time'   => $data['scheduled_start_time'] ?? '09:00',
                'scheduled_end_time'     => $data['scheduled_end_time'] ?? null,
                'anesthesia_type'        => $data['anesthesia_type'] ?? 'ga',
                'priority'               => strtolower($data['priority'] ?? 'elective'),
                'status'                 => strtolower($data['status'] ?? 'booked'),
                'pre_op_diagnosis'       => $data['pre_op_diagnosis'] ?? null,
                'post_op_diagnosis'      => $data['post_op_diagnosis'] ?? null,
                'scrub_nurse_name'       => $data['scrub_nurse_name'] ?? null,
                'circulating_nurse_name' => $data['circulating_nurse_name'] ?? null,
                'blood_required_units'   => $data['blood_required_units'] ?? 0,
                'special_instruments'    => $data['special_instruments'] ?? null,
                'created_by_user_id'     => $validUserId,
            ]);

            // Initialize default blank WHO Checklist Record
            OtChecklistRecord::create([
                'hospital_id'    => $hospitalId,
                'ot_schedule_id' => $schedule->id,
                'sign_in_checks' => [
                    'patient_identity_confirmed' => false,
                    'site_marked' => false,
                    'anesthesia_safety_check' => false,
                    'pulse_oximeter_functioning' => true,
                    'known_allergy' => false,
                    'allergy_details' => '',
                    'difficult_airway_risk' => false,
                    'blood_loss_risk_over_500ml' => false,
                ],
                'time_out_checks' => [
                    'team_members_introduced' => false,
                    'surgeon_anesthetist_nurse_confirm_patient_site' => false,
                    'antibiotic_prophylaxis_given_60min' => false,
                    'antibiotic_name' => '',
                    'anticipated_critical_events_reviewed' => false,
                    'sterility_indicators_confirmed' => false,
                    'essential_imaging_displayed' => false,
                ],
                'sign_out_checks' => [
                    'procedure_name_recorded' => false,
                    'instrument_swab_needle_count_correct' => false,
                    'specimen_labelled_correctly' => false,
                    'equipment_problems_addressed' => false,
                    'recovery_concerns_reviewed' => false,
                ],
            ]);

            return $schedule->load([
                'operationTheatre',
                'patient',
                'primarySurgeon',
                'assistantSurgeon',
                'anesthetist',
                'checklistRecord',
            ])->toArray();
        });
    }

    /**
     * Update schedule status, surgical progress, or operative notes.
     */
    public function updateSchedule(int $hospitalId, int $scheduleId, array $data): array
    {
        return DB::transaction(function () use ($hospitalId, $scheduleId, $data) {
            $schedule = OtSchedule::where('hospital_id', $hospitalId)->findOrFail($scheduleId);

            $updateFields = [];
            foreach ([
                'operation_theatre_id', 'assistant_surgeon_id', 'anesthetist_id',
                'procedure_name', 'procedure_code', 'surgery_date', 'scheduled_start_time',
                'scheduled_end_time', 'actual_start_time', 'actual_end_time', 'anesthesia_type',
                'priority', 'status', 'pre_op_diagnosis', 'post_op_diagnosis',
                'scrub_nurse_name', 'circulating_nurse_name', 'blood_required_units',
                'special_instruments', 'surgeon_notes', 'recovery_notes', 'pacu_discharge_time'
            ] as $field) {
                if (array_key_exists($field, $data)) {
                    $updateFields[$field] = $data[$field];
                }
            }

            if (isset($updateFields['priority'])) {
                $updateFields['priority'] = strtolower($updateFields['priority']);
            }
            if (isset($updateFields['status'])) {
                $updateFields['status'] = strtolower($updateFields['status']);
            }

            // Status transitions automatic timestamps
            if (!empty($updateFields['status'])) {
                if ($updateFields['status'] === 'in_theatre' && empty($schedule->actual_start_time)) {
                    $updateFields['actual_start_time'] = now();
                    if ($schedule->operation_theatre_id) {
                        OperationTheatre::where('id', $schedule->operation_theatre_id)->update(['status' => 'in_use']);
                    }
                } elseif ($data['status'] === 'recovery' && empty($schedule->actual_end_time)) {
                    $updateFields['actual_end_time'] = now();
                    if ($schedule->operation_theatre_id) {
                        OperationTheatre::where('id', $schedule->operation_theatre_id)->update(['status' => 'cleaning']);
                    }
                } elseif ($data['status'] === 'completed') {
                    if (empty($schedule->actual_end_time)) {
                        $updateFields['actual_end_time'] = now();
                    }
                    if (empty($schedule->pacu_discharge_time)) {
                        $updateFields['pacu_discharge_time'] = now();
                    }
                    if ($schedule->operation_theatre_id) {
                        OperationTheatre::where('id', $schedule->operation_theatre_id)->update(['status' => 'available']);
                    }
                }
            }

            $schedule->update($updateFields);

            return $schedule->fresh([
                'operationTheatre',
                'patient',
                'primarySurgeon',
                'assistantSurgeon',
                'anesthetist',
                'checklistRecord',
            ])->toArray();
        });
    }

    /**
     * Get or initialize WHO Surgical Safety Checklist for an OT schedule.
     */
    public function getChecklist(int $hospitalId, int $scheduleId): array
    {
        $schedule = OtSchedule::where('hospital_id', $hospitalId)->findOrFail($scheduleId);

        $record = OtChecklistRecord::firstOrCreate(
            ['hospital_id' => $hospitalId, 'ot_schedule_id' => $scheduleId],
            [
                'sign_in_completed' => false,
                'sign_in_checks' => [
                    'patient_identity_confirmed' => false,
                    'site_marked' => false,
                    'anesthesia_safety_check' => false,
                    'pulse_oximeter_functioning' => true,
                    'known_allergy' => false,
                    'allergy_details' => '',
                    'difficult_airway_risk' => false,
                    'blood_loss_risk_over_500ml' => false,
                ],
                'time_out_completed' => false,
                'time_out_checks' => [
                    'team_members_introduced' => false,
                    'surgeon_anesthetist_nurse_confirm_patient_site' => false,
                    'antibiotic_prophylaxis_given_60min' => false,
                    'antibiotic_name' => '',
                    'anticipated_critical_events_reviewed' => false,
                    'sterility_indicators_confirmed' => false,
                    'essential_imaging_displayed' => false,
                ],
                'sign_out_completed' => false,
                'sign_out_checks' => [
                    'procedure_name_recorded' => false,
                    'instrument_swab_needle_count_correct' => false,
                    'specimen_labelled_correctly' => false,
                    'equipment_problems_addressed' => false,
                    'recovery_concerns_reviewed' => false,
                ],
            ]
        );

        return $record->toArray();
    }

    /**
     * Save WHO Surgical Safety Checklist (Sign In, Time Out, Sign Out).
     */
    public function saveChecklist(int $hospitalId, int $scheduleId, array $data): array
    {
        $schedule = OtSchedule::where('hospital_id', $hospitalId)->findOrFail($scheduleId);

        $record = OtChecklistRecord::firstOrCreate(
            ['hospital_id' => $hospitalId, 'ot_schedule_id' => $scheduleId]
        );

        $update = [];

        // Sign In
        if (array_key_exists('sign_in_checks', $data)) {
            $update['sign_in_checks'] = $data['sign_in_checks'];
        }
        if (array_key_exists('sign_in_completed', $data)) {
            $update['sign_in_completed'] = (bool) $data['sign_in_completed'];
            if ($update['sign_in_completed'] && empty($record->sign_in_completed_at)) {
                $update['sign_in_completed_at'] = now();
            }
        }
        if (array_key_exists('sign_in_nurse_name', $data)) {
            $update['sign_in_nurse_name'] = $data['sign_in_nurse_name'];
        }
        if (array_key_exists('sign_in_anesthetist_name', $data)) {
            $update['sign_in_anesthetist_name'] = $data['sign_in_anesthetist_name'];
        }

        // Time Out
        if (array_key_exists('time_out_checks', $data)) {
            $update['time_out_checks'] = $data['time_out_checks'];
        }
        if (array_key_exists('time_out_completed', $data)) {
            $update['time_out_completed'] = (bool) $data['time_out_completed'];
            if ($update['time_out_completed'] && empty($record->time_out_completed_at)) {
                $update['time_out_completed_at'] = now();
            }
        }

        // Sign Out
        if (array_key_exists('sign_out_checks', $data)) {
            $update['sign_out_checks'] = $data['sign_out_checks'];
        }
        if (array_key_exists('sign_out_completed', $data)) {
            $update['sign_out_completed'] = (bool) $data['sign_out_completed'];
            if ($update['sign_out_completed'] && empty($record->sign_out_completed_at)) {
                $update['sign_out_completed_at'] = now();
            }
        }
        if (array_key_exists('sign_out_nurse_name', $data)) {
            $update['sign_out_nurse_name'] = $data['sign_out_nurse_name'];
        }

        $record->update($update);

        return $record->fresh()->toArray();
    }

    /**
     * Get complete printable WHO Surgical Safety Checklist & Operative Dossier.
     */
    public function getPrintData(int $hospitalId, int $scheduleId): array
    {
        $hospital = Hospital::findOrFail($hospitalId);
        $schedule = OtSchedule::where('hospital_id', $hospitalId)
            ->with([
                'operationTheatre',
                'patient',
                'primarySurgeon.department',
                'assistantSurgeon',
                'anesthetist',
                'department',
                'ipdAdmission.ward',
                'ipdAdmission.bed',
                'checklistRecord',
            ])
            ->findOrFail($scheduleId);

        $hospitalPhone = HospitalSetting::get($hospitalId, 'hospital_phone', $hospital->phone ?? '');
        $hospitalEmail = HospitalSetting::get($hospitalId, 'hospital_email', $hospital->email ?? '');

        return [
            'hospital' => [
                'name'            => $hospital->name,
                'address'         => $hospital->address,
                'city'            => $hospital->city,
                'phone'           => $hospitalPhone,
                'email'           => $hospitalEmail,
                'abdm_hip_id'     => $hospital->abdm_hip_id,
                'nabh_accredited' => true,
            ],
            'schedule'  => $schedule->toArray(),
            'checklist' => $schedule->checklistRecord ? $schedule->checklistRecord->toArray() : null,
        ];
    }
}
