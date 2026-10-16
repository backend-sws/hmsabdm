<?php

namespace App\Services\Ipd;

use App\Models\Bed;
use App\Models\CounterQueue;
use App\Models\IpdAdmission;
use App\Models\Patient;
use App\Models\Ward;
use App\Models\IpdIntakeOutput;
use App\Models\IpdMarAdministration;
use App\Models\IpdShiftHandover;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\BillingLedgerItem;
use App\Models\IpdDischargeSummary;
use App\Models\Hospital;
use App\Models\HospitalSetting;
use App\Services\Patient\PatientServiceInterface;
use App\Http\Traits\CanFilterAndPaginate;
use Illuminate\Support\Facades\DB;

class IpdService implements IpdServiceInterface
{
    use CanFilterAndPaginate;

    public function __construct(
        protected PatientServiceInterface $patientService
    ) {}

    public function getWards(int $hospitalId, $request = null)
    {
        $req = $request ?? request();
        $query = Ward::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->withCount([
                'beds as total_beds',
                'beds as available_beds' => function ($q) {
                    $q->where('status', 'available')->where('is_active', true);
                },
                'beds as occupied_beds' => function ($q) {
                    $q->where('status', 'occupied');
                }
            ]);

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('code', 'ilike', "%{$search}%");
            });
        }

        if ($req && !$req->has('page') && !$req->has('per_page')) {
            return $query->get();
        }

        return $this->applyPaginationOrAll($query, $req);
    }

    public function getAvailableBeds(int $hospitalId, ?int $wardId = null)
    {
        $query = Bed::where('hospital_id', $hospitalId)
            ->where('status', 'available')
            ->where('is_active', true)
            ->with('ward');

        if ($wardId) {
            $query->where('ward_id', $wardId);
        }

        return $query->orderBy('bed_number')->get();
    }

    public function admitPatient(int $hospitalId, array $data): IpdAdmission
    {
        return DB::transaction(function () use ($hospitalId, $data) {
            // 1. Resolve Patient
            $patientId = null;

            if (!empty($data['patient_id'])) {
                $patient = Patient::where('id', $data['patient_id'])
                    ->where('hospital_id', $hospitalId)
                    ->firstOrFail();
                $patientId = $patient->id;
            } elseif (!empty($data['token'])) {
                // From Scan & Share Token
                $queue = CounterQueue::withoutGlobalScopes()
                    ->where('link_token', $data['token'])
                    ->first();
                if (!$queue) {
                    throw new \Exception("Scan & Share Token '{$data['token']}' not found or is invalid.");
                }
                $patientId = $queue->patient_id;
                $queue->update(['status' => 'confirmed', 'hospital_id' => $hospitalId]);
            } elseif (!empty($data['name'])) {
                // Direct Patient Registration
                $data['hospital_id'] = $hospitalId;
                $patient = $this->patientService->registerPatient($data);
                $patientId = $patient->id;
            } else {
                throw new \Exception('Patient information or patient_id is required for admission.');
            }

            // 2. Resolve Bed and Lock for update
            $bed = Bed::where('id', $data['bed_id'])
                ->where('hospital_id', $hospitalId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($bed->status === 'occupied') {
                throw new \Exception("Bed {$bed->bed_number} is already occupied. Please select another bed.");
            }

            // 3. Resolve Ward
            $wardId = $data['ward_id'] ?? $bed->ward_id;

            // 4. Financial Calculations
            $advanceDeposit = isset($data['advance_deposit']) ? (float) $data['advance_deposit'] : 0.00;
            $paymentBreakdown = $data['payment_breakdown'] ?? null;
            $paymentMethod = $data['payment_method'] ?? ($advanceDeposit > 0 ? 'cash' : null);

            if (is_array($paymentBreakdown) && count($paymentBreakdown) > 1) {
                $paymentMethod = 'split';
                $computedSum = array_sum(array_column($paymentBreakdown, 'amount'));
                if ($advanceDeposit == 0 && $computedSum > 0) {
                    $advanceDeposit = $computedSum;
                }
            }

            $paymentStatus = $advanceDeposit > 0 ? 'paid' : 'pending';

            // 5. Create IPD Admission Record
            $admission = IpdAdmission::create([
                'hospital_id'        => $hospitalId,
                'patient_id'         => $patientId,
                'doctor_id'          => $data['doctor_id'],
                'department_id'      => $data['department_id'] ?? null,
                'ward_id'            => $wardId,
                'bed_id'             => $bed->id,
                'admission_type'     => $data['admission_type'] ?? 'planned',
                'admission_reason'   => $data['admission_reason'] ?? null,
                'is_mlc'             => !empty($data['is_mlc']),
                'mlc_details'        => $data['mlc_details'] ?? null,
                'status'             => 'admitted',
                'admission_date'     => $data['admission_date'] ?? now(),
                'advance_deposit'    => $advanceDeposit,
                'payment_status'     => $paymentStatus,
                'payment_method'     => $paymentMethod,
                'payment_ref'        => $data['payment_ref'] ?? null,
                'payment_breakdown'  => $paymentBreakdown,
                'attendant_name'     => $data['attendant_name'] ?? null,
                'attendant_relation' => $data['attendant_relation'] ?? null,
                'attendant_phone'    => $data['attendant_phone'] ?? null,
                'attendant_address'  => $data['attendant_address'] ?? null,
            ]);

            // 6. Mark Bed as Occupied
            $bed->update([
                'status'               => 'occupied',
                'current_admission_id' => $admission->id,
            ]);

            return $admission->fresh()->load(['patient', 'doctor', 'department', 'ward', 'bed']);
        });
    }

    public function getAdmissionById(int $hospitalId, int $id): IpdAdmission
    {
        return IpdAdmission::where('id', $id)
            ->where('hospital_id', $hospitalId)
            ->with(['patient', 'doctor', 'department', 'ward', 'bed'])
            ->firstOrFail();
    }

    public function getActiveAdmissions(int $hospitalId, $request = null)
    {
        $req = $request ?? request();
        $query = IpdAdmission::where('hospital_id', $hospitalId)
            ->with(['patient', 'doctor', 'department', 'ward', 'bed'])
            ->orderBy('admission_date', 'desc');

        if ($req && $req->filled('status')) {
            $query->where('status', $req->query('status'));
        } else {
            $query->where('status', 'admitted');
        }

        if ($req && $req->filled('doctor_id')) {
            $query->where('doctor_id', $req->query('doctor_id'));
        }

        if ($req && $req->filled('ward_id')) {
            $query->where('ward_id', $req->query('ward_id'));
        }

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('ipd_number', 'ilike', "%{$search}%")
                  ->orWhereHas('patient', function ($pq) use ($search) {
                      $pq->where('name', 'ilike', "%{$search}%")
                         ->orWhere('uhid', 'ilike', "%{$search}%")
                         ->orWhere('mobile', 'ilike', "%{$search}%");
                  });
            });
        }

        return $this->applyPaginationOrAll($query, $req);
    }

    public function transferBed(int $hospitalId, int $admissionId, int $newBedId): IpdAdmission
    {
        return DB::transaction(function () use ($hospitalId, $admissionId, $newBedId) {
            $admission = IpdAdmission::where('id', $admissionId)
                ->where('hospital_id', $hospitalId)
                ->lockForUpdate()
                ->firstOrFail();

            $newBed = Bed::where('id', $newBedId)
                ->where('hospital_id', $hospitalId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($newBed->status === 'occupied') {
                throw new \Exception("New Bed {$newBed->bed_number} is already occupied.");
            }

            // Free old bed
            if ($admission->bed_id) {
                Bed::where('id', $admission->bed_id)->update([
                    'status'               => 'available',
                    'current_admission_id' => null,
                ]);
            }

            // Occupy new bed
            $newBed->update([
                'status'               => 'occupied',
                'current_admission_id' => $admission->id,
            ]);

            $admission->update([
                'ward_id' => $newBed->ward_id,
                'bed_id'  => $newBed->id,
            ]);

            return $admission->fresh()->load(['patient', 'doctor', 'department', 'ward', 'bed']);
        });
    }

    public function dischargePatient(int $hospitalId, int $id, array $data = []): IpdAdmission
    {
        return DB::transaction(function () use ($hospitalId, $id, $data) {
            $admission = IpdAdmission::where('id', $id)
                ->where('hospital_id', $hospitalId)
                ->lockForUpdate()
                ->firstOrFail();

            $admission->update([
                'status'         => 'discharged',
                'discharge_date' => $data['discharge_date'] ?? now(),
            ]);

            // Release bed
            if ($admission->bed_id) {
                $statusAfter = !empty($data['mark_bed_cleaning']) || ($data['bed_status_after_discharge'] ?? '') === 'cleaning'
                    ? 'cleaning'
                    : 'available';

                Bed::where('id', $admission->bed_id)->update([
                    'status'               => $statusAfter,
                    'current_admission_id' => null,
                ]);
            }

            return $admission->fresh()->load(['patient', 'doctor', 'department', 'ward', 'bed']);
        });
    }

    /**
     * Get live visual bed matrix grouped by ward with patient, doctor, and occupancy statistics.
     */
    public function getBedMatrix(int $hospitalId): array
    {
        $wards = Ward::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->with(['beds' => function ($q) {
                $q->where('is_active', true)->orderBy('bed_number');
            }])
            ->get();

        // Collect occupied admissions
        $occupiedAdmissionIds = [];
        foreach ($wards as $ward) {
            foreach ($ward->beds as $bed) {
                if ($bed->status === 'occupied' && $bed->current_admission_id) {
                    $occupiedAdmissionIds[] = $bed->current_admission_id;
                }
            }
        }

        $admissions = [];
        if (!empty($occupiedAdmissionIds)) {
            $admissions = IpdAdmission::whereIn('id', $occupiedAdmissionIds)
                ->with(['patient', 'doctor', 'latestVital'])
                ->get()
                ->keyBy('id');
        }

        // Running balance for each admission
        $ledgerTotals = [];
        if (!empty($occupiedAdmissionIds)) {
            $ledgerTotals = \App\Models\BillingLedgerItem::where('hospital_id', $hospitalId)
                ->where('encounter_type', 'ipd')
                ->whereIn('encounter_id', $occupiedAdmissionIds)
                ->where('status', '!=', 'cancelled')
                ->selectRaw('encounter_id, sum(total_amount) as total')
                ->groupBy('encounter_id')
                ->pluck('total', 'encounter_id')
                ->toArray();
        }

        $totalBeds = 0;
        $availableBeds = 0;
        $occupiedBeds = 0;
        $cleaningBeds = 0;
        $maintenanceBeds = 0;

        $matrixWards = [];

        foreach ($wards as $ward) {
            $wardBedList = [];
            $wardAvailable = 0;
            $wardOccupied = 0;

            foreach ($ward->beds as $bed) {
                $totalBeds++;

                $admissionData = null;
                if ($bed->status === 'occupied' && $bed->current_admission_id && isset($admissions[$bed->current_admission_id])) {
                    $adm = $admissions[$bed->current_admission_id];
                    $wardOccupied++;
                    $occupiedBeds++;

                    $admDate = $adm->admission_date ?? $adm->created_at;
                    $elapsedDays = $admDate ? (int) abs(now()->diffInDays($admDate)) : 0;
                    $elapsedHours = $admDate ? (int) abs(now()->diffInHours($admDate)) : 0;

                    $admissionData = [
                        'id'              => $adm->id,
                        'ipd_number'      => $adm->ipd_number,
                        'admission_type'  => $adm->admission_type,
                        'admission_date'  => $admDate?->toIso8601String(),
                        'elapsed_days'    => $elapsedDays,
                        'elapsed_hours'   => $elapsedHours,
                        'is_mlc'          => (bool) $adm->is_mlc,
                        'patient'         => $adm->patient ? [
                            'id'          => $adm->patient->id,
                            'name'        => $adm->patient->name,
                            'uhid'        => $adm->patient->uhid,
                            'gender'      => $adm->patient->gender,
                            'age'         => $adm->patient->dob ? (int) abs(now()->diffInYears($adm->patient->dob)) : null,
                            'mobile'      => $adm->patient->mobile,
                        ] : null,
                        'doctor'          => $adm->doctor ? [
                            'id'             => $adm->doctor->id,
                            'name'           => $adm->doctor->name,
                            'specialization' => $adm->doctor->specialization,
                        ] : null,
                        'latest_vital'    => $adm->latestVital,
                        'running_bill'    => (float) ($ledgerTotals[$adm->id] ?? 0.0),
                    ];
                } elseif ($bed->status === 'available') {
                    $wardAvailable++;
                    $availableBeds++;
                } elseif ($bed->status === 'cleaning') {
                    $cleaningBeds++;
                } else {
                    $maintenanceBeds++;
                }

                $wardBedList[] = [
                    'id'            => $bed->id,
                    'bed_number'    => $bed->bed_number,
                    'status'        => $bed->status, // available, occupied, cleaning, maintenance
                    'daily_charge'  => (float) ($bed->daily_charge ?? $ward->daily_charge ?? 0),
                    'admission'     => $admissionData,
                ];
            }

            $matrixWards[] = [
                'id'              => $ward->id,
                'name'            => $ward->name,
                'code'            => $ward->code,
                'ward_type'       => $ward->ward_type,
                'floor'           => $ward->floor,
                'total_beds'      => count($ward->beds),
                'available_beds'  => $wardAvailable,
                'occupied_beds'   => $wardOccupied,
                'beds'            => $wardBedList,
            ];
        }

        $occupancyRate = $totalBeds > 0 ? round(($occupiedBeds / $totalBeds) * 100, 1) : 0.0;

        return [
            'overview' => [
                'total_beds'           => $totalBeds,
                'available_beds'       => $availableBeds,
                'occupied_beds'        => $occupiedBeds,
                'cleaning_beds'        => $cleaningBeds,
                'maintenance_beds'     => $maintenanceBeds,
                'occupancy_percentage' => $occupancyRate,
            ],
            'wards'    => $matrixWards,
        ];
    }

    /**
     * Record doctor daily inpatient bedside round (SOAP note) and auto-trigger doctor round fee to ledger.
     */
    public function recordDoctorRound(int $hospitalId, int $admissionId, array $data, int $userId): array
    {
        return DB::transaction(function () use ($hospitalId, $admissionId, $data, $userId) {
            $admission = IpdAdmission::where('hospital_id', $hospitalId)->findOrFail($admissionId);

            $doctorId = $data['doctor_id'] ?? $admission->doctor_id;
            $doctor = \App\Models\Doctor::find($doctorId);

            $roundDate = $data['round_date'] ?? now()->toDateString();
            $roundTime = $data['round_time'] ?? now()->format('H:i:s');

            // Find tariff in ChargeMaster
            $tariff = \App\Models\ChargeMaster::where('hospital_id', $hospitalId)
                ->where('is_active', true)
                ->where(function ($q) use ($doctorId) {
                    $q->where('code', 'DOC-RND')
                      ->orWhere('doctor_id', $doctorId);
                })
                ->first();

            $fee = isset($data['fee_charged']) ? (float) $data['fee_charged'] : ($tariff ? (float) $tariff->standard_rate : 500.00);

            // Auto-post Doctor Round Fee to Patient Running Ledger
            $ledgerItem = \App\Models\BillingLedgerItem::create([
                'hospital_id'        => $hospitalId,
                'patient_id'         => $admission->patient_id,
                'encounter_type'     => 'ipd',
                'encounter_id'       => $admission->id,
                'charge_id'          => $tariff?->id,
                'category'           => 'doctor_fees',
                'item_name'          => 'Doctor Inpatient Daily Round (' . ($doctor?->name ?? 'Consultant') . ')',
                'unit_price'         => $fee,
                'quantity'           => 1.0,
                'tax_amount'         => 0.00,
                'total_amount'       => $fee,
                'charged_at'         => now(),
                'charged_by_user_id' => $userId,
                'auto_generated'     => true,
                'notes'              => "Auto-applied on doctor daily bedside round ({$roundDate})",
                'status'             => 'unbilled',
            ]);

            // Save Doctor SOAP Round
            $round = \App\Models\IpdDoctorRound::create([
                'hospital_id'            => $hospitalId,
                'ipd_admission_id'       => $admission->id,
                'patient_id'             => $admission->patient_id,
                'doctor_id'              => $doctorId,
                'round_date'             => $roundDate,
                'round_time'             => $roundTime,
                'round_type'             => $data['round_type'] ?? 'routine',
                'subjective'             => $data['subjective'] ?? null,
                'objective'              => $data['objective'] ?? null,
                'assessment'             => $data['assessment'] ?? null,
                'plan'                   => $data['plan'] ?? null,
                'diet_advice'            => $data['diet_advice'] ?? 'normal',
                'clinical_condition'     => $data['clinical_condition'] ?? 'stable',
                'is_discharge_planned'   => !empty($data['is_discharge_planned']),
                'planned_discharge_date' => $data['planned_discharge_date'] ?? null,
                'fee_charged'            => $fee,
                'billing_ledger_item_id' => $ledgerItem->id,
                'created_by_user_id'     => $userId,
            ]);

            return $round->load(['doctor', 'patient', 'ledgerItem'])->toArray();
        });
    }

    /**
     * Get all doctor daily rounds for an inpatient admission.
     */
    public function getDoctorRounds(int $hospitalId, int $admissionId): array
    {
        return \App\Models\IpdDoctorRound::where('hospital_id', $hospitalId)
            ->where('ipd_admission_id', $admissionId)
            ->with(['doctor'])
            ->orderByDesc('round_date')
            ->orderByDesc('id')
            ->get()
            ->toArray();
    }

    /**
     * Record bedside nursing procedure and auto-post procedure tariff to patient ledger.
     */
    public function recordNursingProcedure(int $hospitalId, int $admissionId, array $data, int $userId, ?string $nurseName = null): array
    {
        return DB::transaction(function () use ($hospitalId, $admissionId, $data, $userId, $nurseName) {
            $admission = IpdAdmission::where('hospital_id', $hospitalId)->findOrFail($admissionId);

            $procCode = $data['procedure_code'] ?? null;
            $procName = $data['procedure_name'];

            // Find tariff in charges_master
            $tariff = null;
            if ($procCode) {
                $tariff = \App\Models\ChargeMaster::where('hospital_id', $hospitalId)
                    ->where('is_active', true)
                    ->where('code', $procCode)
                    ->first();
            }

            if (!$tariff) {
                $tariff = \App\Models\ChargeMaster::where('hospital_id', $hospitalId)
                    ->where('is_active', true)
                    ->where('category_id', function ($q) use ($hospitalId) {
                        $q->select('id')->from('charge_categories')->where('hospital_id', $hospitalId)->where('name', 'nursing_charges')->limit(1);
                    })
                    ->where('name', 'like', "%{$procName}%")
                    ->first();
            }

            $amount = isset($data['charge_amount']) ? (float) $data['charge_amount'] : ($tariff ? (float) $tariff->standard_rate : 200.00);

            // Auto-post procedure charge to ledger
            $ledgerItem = \App\Models\BillingLedgerItem::create([
                'hospital_id'        => $hospitalId,
                'patient_id'         => $admission->patient_id,
                'encounter_type'     => 'ipd',
                'encounter_id'       => $admission->id,
                'charge_id'          => $tariff?->id,
                'category'           => 'nursing_charges',
                'item_name'          => $procName,
                'unit_price'         => $amount,
                'quantity'           => 1.0,
                'tax_amount'         => 0.00,
                'total_amount'       => $amount,
                'charged_at'         => now(),
                'charged_by_user_id' => $userId,
                'auto_generated'     => true,
                'notes'              => "Bedside nursing procedure: " . ($data['notes'] ?? $procName),
                'status'             => 'unbilled',
            ]);

            $procedure = \App\Models\IpdNursingProcedure::create([
                'hospital_id'            => $hospitalId,
                'ipd_admission_id'       => $admission->id,
                'patient_id'             => $admission->patient_id,
                'procedure_name'         => $procName,
                'procedure_code'         => $procCode ?? ($tariff?->code ?? null),
                'performed_at'           => $data['performed_at'] ?? now(),
                'performed_by_user_id'   => $userId,
                'performed_by_name'      => $nurseName ?? ($data['performed_by_name'] ?? 'Duty Nurse'),
                'notes'                  => $data['notes'] ?? null,
                'charge_amount'          => $amount,
                'billing_ledger_item_id' => $ledgerItem->id,
            ]);

            return $procedure->load(['patient', 'ledgerItem'])->toArray();
        });
    }

    /**
     * Get all bedside nursing procedures performed for an inpatient admission.
     */
    public function getNursingProcedures(int $hospitalId, int $admissionId): array
    {
        return \App\Models\IpdNursingProcedure::where('hospital_id', $hospitalId)
            ->where('ipd_admission_id', $admissionId)
            ->orderByDesc('performed_at')
            ->orderByDesc('id')
            ->get()
            ->toArray();
    }

    /**
     * Get complete 360-degree inpatient chart (admission, rounds, vitals, drug chart, procedures, financial ledger).
     */
    public function getInpatientChart(int $hospitalId, int $admissionId): array
    {
        $admission = IpdAdmission::where('hospital_id', $hospitalId)
            ->with([
                'patient',
                'doctor',
                'department',
                'ward',
                'bed',
                'vitals' => function ($q) {
                    $q->orderByDesc('recorded_at')->orderByDesc('id');
                },
                'doctorRounds' => function ($q) {
                    $q->with('doctor')->orderByDesc('round_date')->orderByDesc('id');
                },
                'nursingProcedures' => function ($q) {
                    $q->orderByDesc('performed_at')->orderByDesc('id');
                },
                'intakeOutputs' => function ($q) {
                    $q->orderByDesc('recorded_at')->orderByDesc('id');
                },
                'marAdministrations' => function ($q) {
                    $q->orderByDesc('administered_at')->orderByDesc('id');
                },
                'shiftHandovers' => function ($q) {
                    $q->orderByDesc('shift_date')->orderByDesc('id');
                },
                'prescriptions' => function ($q) {
                    $q->with(['items', 'diagnoses', 'doctor'])->orderByDesc('id');
                },
            ])
            ->findOrFail($admissionId);

        // Billing Ledger Items for this IPD admission
        $ledgerItems = \App\Models\BillingLedgerItem::where('hospital_id', $hospitalId)
            ->where('encounter_type', 'ipd')
            ->where('encounter_id', $admission->id)
            ->where('status', '!=', 'cancelled')
            ->orderByDesc('charged_at')
            ->get();

        $totalCharged = (float) $ledgerItems->sum('total_amount');
        $advanceDeposit = (float) $admission->advance_deposit;
        $netBalanceDue = max(0, $totalCharged - $advanceDeposit);

        $categoryBreakdown = $ledgerItems->groupBy('category')->map(function ($items, $cat) {
            return [
                'category'     => $cat,
                'count'        => $items->count(),
                'total_amount' => (float) $items->sum('total_amount'),
            ];
        })->values();

        // Calculate Fluid Balance Summary
        $allIO = $admission->intakeOutputs;
        $totalIntake = (float) $allIO->where('entry_type', 'intake')->sum('quantity_ml');
        $totalOutput = (float) $allIO->where('entry_type', 'output')->sum('quantity_ml');
        $netBalance = $totalIntake - $totalOutput;

        $admDate = $admission->admission_date ?? $admission->created_at;

        return [
            'admission' => [
                'id'                 => $admission->id,
                'ipd_number'         => $admission->ipd_number,
                'status'             => $admission->status,
                'admission_type'     => $admission->admission_type,
                'admission_reason'   => $admission->admission_reason,
                'admission_date'     => $admDate?->toIso8601String(),
                'discharge_date'     => $admission->discharge_date?->toIso8601String(),
                'elapsed_days'       => $admDate ? (int) abs(now()->diffInDays($admDate)) : 0,
                'elapsed_hours'      => $admDate ? (int) abs(now()->diffInHours($admDate)) : 0,
                'is_mlc'             => (bool) $admission->is_mlc,
                'ward'               => $admission->ward,
                'bed'                => $admission->bed,
                'doctor'             => $admission->doctor,
                'department'         => $admission->department,
                'attendant'          => [
                    'name'     => $admission->attendant_name,
                    'relation' => $admission->attendant_relation,
                    'phone'    => $admission->attendant_phone,
                    'address'  => $admission->attendant_address,
                ],
            ],
            'patient'            => $admission->patient,
            'doctor_rounds'      => $admission->doctorRounds,
            'nursing_procedures' => $admission->nursingProcedures,
            'vitals_history'     => $admission->vitals,
            'fluid_balance_summary' => [
                'total_intake_ml'  => $totalIntake,
                'total_output_ml'  => $totalOutput,
                'net_balance_ml'   => $netBalance,
                'balance_status'   => $netBalance > 0 ? 'positive' : ($netBalance < 0 ? 'negative' : 'neutral'),
            ],
            'intake_outputs'     => $admission->intakeOutputs,
            'mar_administrations'=> $admission->marAdministrations,
            'shift_handovers'    => $admission->shiftHandovers,
            'prescriptions'      => $admission->prescriptions,
            'financial_summary'  => [
                'total_charged'      => $totalCharged,
                'advance_deposit'    => $advanceDeposit,
                'net_balance_due'    => $netBalanceDue,
                'category_breakdown' => $categoryBreakdown,
                'ledger_items'       => $ledgerItems,
            ],
        ];
    }

    /**
     * Record fluid intake or output entry for an inpatient admission.
     */
    public function recordIntakeOutput(int $hospitalId, int $admissionId, array $data, ?int $userId = null): array
    {
        $admission = IpdAdmission::where('hospital_id', $hospitalId)->findOrFail($admissionId);

        $entry = IpdIntakeOutput::create([
            'hospital_id'         => $hospitalId,
            'ipd_admission_id'    => $admission->id,
            'patient_id'          => $admission->patient_id,
            'entry_type'          => $data['entry_type'], // 'intake' or 'output'
            'category'            => $data['category'],
            'item_name'           => $data['item_name'],
            'quantity_ml'         => (float) $data['quantity_ml'],
            'route'               => $data['route'] ?? null,
            'recorded_at'         => !empty($data['recorded_at']) ? \Carbon\Carbon::parse($data['recorded_at']) : now(),
            'recorded_by_user_id' => $userId,
            'recorded_by_name'    => $data['recorded_by_name'] ?? 'Staff Nurse',
            'remarks'             => $data['remarks'] ?? null,
        ]);

        return $entry->load(['patient', 'admission'])->toArray();
    }

    /**
     * Get 24-hour / date-specific fluid balance summary and chronological logs.
     */
    public function getIntakeOutputSummary(int $hospitalId, int $admissionId, ?string $date = null): array
    {
        $admission = IpdAdmission::where('hospital_id', $hospitalId)->findOrFail($admissionId);

        $query = IpdIntakeOutput::where('hospital_id', $hospitalId)
            ->where('ipd_admission_id', $admission->id);

        if (!empty($date)) {
            $query->whereDate('recorded_at', $date);
        }

        $entries = $query->orderByDesc('recorded_at')->orderByDesc('id')->get();

        $totalIntake = (float) $entries->where('entry_type', 'intake')->sum('quantity_ml');
        $totalOutput = (float) $entries->where('entry_type', 'output')->sum('quantity_ml');
        $netBalance = $totalIntake - $totalOutput;

        $intakeByCategory = $entries->where('entry_type', 'intake')
            ->groupBy('category')
            ->map(fn($group) => (float) $group->sum('quantity_ml'));

        $outputByCategory = $entries->where('entry_type', 'output')
            ->groupBy('category')
            ->map(fn($group) => (float) $group->sum('quantity_ml'));

        return [
            'admission_id' => $admission->id,
            'ipd_number'   => $admission->ipd_number,
            'filter_date'  => $date ?? 'all',
            'summary'      => [
                'total_intake_ml' => $totalIntake,
                'total_output_ml' => $totalOutput,
                'net_balance_ml'  => $netBalance,
                'balance_status'  => $netBalance > 0 ? 'positive' : ($netBalance < 0 ? 'negative' : 'neutral'),
            ],
            'breakdown'    => [
                'intake_by_category'  => $intakeByCategory,
                'output_by_category' => $outputByCategory,
            ],
            'entries'      => $entries,
        ];
    }

    /**
     * Record medication administration (Given, Omitted, Refused) against prescription item or SOS.
     */
    public function recordMarAdministration(int $hospitalId, int $admissionId, array $data, ?int $userId = null): array
    {
        return DB::transaction(function () use ($hospitalId, $admissionId, $data, $userId) {
            $admission = IpdAdmission::where('hospital_id', $hospitalId)->findOrFail($admissionId);

            $admin = IpdMarAdministration::create([
                'hospital_id'            => $hospitalId,
                'ipd_admission_id'       => $admission->id,
                'patient_id'             => $admission->patient_id,
                'prescription_item_id'   => $data['prescription_item_id'] ?? null,
                'medicine_name'          => $data['medicine_name'],
                'dosage'                 => $data['dosage'],
                'route'                  => $data['route'] ?? 'iv',
                'scheduled_at'           => !empty($data['scheduled_at']) ? \Carbon\Carbon::parse($data['scheduled_at']) : null,
                'administered_at'        => !empty($data['administered_at']) ? \Carbon\Carbon::parse($data['administered_at']) : now(),
                'administered_by_user_id'=> $userId,
                'administered_by_name'   => $data['administered_by_name'] ?? 'Staff Nurse',
                'status'                 => $data['status'] ?? 'given',
                'omission_reason'        => $data['omission_reason'] ?? null,
                'batch_number'           => $data['batch_number'] ?? null,
                'notes'                  => $data['notes'] ?? null,
            ]);

            // Optional auto-billing if medicine charge is specified
            $chargeRate = isset($data['charge_amount']) ? (float) $data['charge_amount'] : (
                (!empty($data['auto_charge']) && !empty($data['unit_rate'])) ? (float) $data['unit_rate'] : null
            );

            if ($chargeRate !== null && $chargeRate > 0 && ($data['status'] ?? 'given') === 'given') {
                $qty = (float) ($data['quantity'] ?? 1.0);
                $ledgerItem = BillingLedgerItem::create([
                    'hospital_id'        => $hospitalId,
                    'patient_id'         => $admission->patient_id,
                    'encounter_type'     => 'ipd',
                    'encounter_id'       => $admission->id,
                    'charge_id'          => null,
                    'category'           => 'pharmacy',
                    'item_name'          => $data['medicine_name'] . ' (' . $data['dosage'] . ')',
                    'unit_price'         => $chargeRate,
                    'quantity'           => $qty,
                    'tax_amount'         => 0.00,
                    'discount_amount'    => 0.00,
                    'total_amount'       => $chargeRate * $qty,
                    'charged_at'         => now(),
                    'charged_by_user_id' => $userId,
                    'auto_generated'     => true,
                    'notes'              => "Bedside medication administration by {$admin->administered_by_name}",
                    'status'             => 'unbilled',
                ]);

                $admin->update(['billing_ledger_item_id' => $ledgerItem->id]);
            }

            return $admin->load(['patient', 'prescriptionItem', 'ledgerItem'])->toArray();
        });
    }

    /**
     * Get active MAR drug chart and administration events for an inpatient admission.
     */
    public function getMarDrugChart(int $hospitalId, int $admissionId, ?string $date = null): array
    {
        $admission = IpdAdmission::where('hospital_id', $hospitalId)->findOrFail($admissionId);

        // Fetch prescriptions for this admission with items
        $prescriptions = Prescription::where('hospital_id', $hospitalId)
            ->where('ipd_admission_id', $admission->id)
            ->with(['items.medicine', 'doctor'])
            ->orderByDesc('id')
            ->get();

        // Fetch MAR administrations
        $marQuery = IpdMarAdministration::where('hospital_id', $hospitalId)
            ->where('ipd_admission_id', $admission->id);

        if (!empty($date)) {
            $marQuery->whereDate('administered_at', $date);
        }

        $administrations = $marQuery->orderByDesc('administered_at')->get();

        return [
            'admission_id'     => $admission->id,
            'ipd_number'       => $admission->ipd_number,
            'filter_date'      => $date ?? 'all',
            'prescriptions'    => $prescriptions,
            'administrations'  => $administrations,
            'summary'          => [
                'total_administered' => $administrations->where('status', 'given')->count(),
                'total_omitted'      => $administrations->where('status', 'omitted')->count(),
                'total_refused'      => $administrations->where('status', 'refused')->count(),
            ],
        ];
    }

    /**
     * Record nurse shift handover note.
     */
    public function recordShiftHandover(int $hospitalId, int $admissionId, array $data): array
    {
        $admission = IpdAdmission::where('hospital_id', $hospitalId)->findOrFail($admissionId);

        $handover = IpdShiftHandover::create([
            'hospital_id'         => $hospitalId,
            'ward_id'             => $admission->ward_id,
            'ipd_admission_id'    => $admission->id,
            'patient_id'          => $admission->patient_id,
            'shift_name'          => $data['shift_name'], // 'morning', 'evening', 'night'
            'shift_date'          => $data['shift_date'] ?? now()->toDateString(),
            'outgoing_nurse_name' => $data['outgoing_nurse_name'],
            'incoming_nurse_name' => $data['incoming_nurse_name'] ?? null,
            'patient_condition'   => $data['patient_condition'] ?? 'stable',
            'handover_notes'      => $data['handover_notes'],
            'critical_alerts'     => $data['critical_alerts'] ?? null,
            'pending_tasks'       => $data['pending_tasks'] ?? null,
            'acknowledged_at'     => !empty($data['incoming_nurse_name']) ? now() : null,
        ]);

        return $handover->load(['patient', 'ward'])->toArray();
    }

    /**
     * Get shift handovers history for an admission.
     */
    public function getShiftHandovers(int $hospitalId, int $admissionId): array
    {
        return IpdShiftHandover::where('hospital_id', $hospitalId)
            ->where('ipd_admission_id', $admissionId)
            ->orderByDesc('shift_date')
            ->orderByDesc('id')
            ->get()
            ->toArray();
    }

    /**
     * Acknowledge shift handover by incoming nurse.
     */
    public function acknowledgeShiftHandover(int $hospitalId, int $handoverId, string $incomingNurseName): array
    {
        $handover = IpdShiftHandover::where('hospital_id', $hospitalId)->findOrFail($handoverId);

        $handover->update([
            'incoming_nurse_name' => $incomingNurseName,
            'acknowledged_at'     => now(),
        ]);

        return $handover->fresh()->load(['patient', 'ward'])->toArray();
    }

    /**
     * Get or auto-prefill clinical discharge summary for an IPD admission.
     */
    public function getDischargeSummary(int $hospitalId, int $admissionId): array
    {
        $admission = IpdAdmission::where('hospital_id', $hospitalId)
            ->with([
                'patient',
                'doctor.department',
                'ward',
                'bed',
                'dischargeSummary.preparedByUser:id,name',
                'dischargeSummary.finalizedByUser:id,name',
                'dischargeSummary.followUpDoctor:id,name,qualification',
                'doctorRounds.doctor:id,name',
                'vitals' => fn($q) => $q->orderBy('recorded_at', 'desc')->limit(5),
                'prescriptions.items.medicine',
                'labOrders' => fn($q) => $q->with('items.labTest')->where('status', 'completed'),
                'nursingProcedures',
            ])
            ->findOrFail($admissionId);

        if ($admission->dischargeSummary) {
            $data = $admission->dischargeSummary->toArray();
            $data['patient'] = $admission->patient;
            $data['ipd_admission'] = [
                'id'             => $admission->id,
                'ipd_number'     => $admission->ipd_number,
                'admission_date' => $admission->admission_date,
                'ward'           => $admission->ward?->name,
                'bed'            => $admission->bed?->bed_number,
                'status'         => $admission->status,
            ];
            return $data;
        }

        // Auto-generate proposal from chart
        $latestVital = $admission->vitals->first();
        $dischargeVitals = [
            'temperature'      => $latestVital?->temperature ?? '',
            'systolic_bp'      => $latestVital?->systolic_bp ?? '',
            'diastolic_bp'     => $latestVital?->diastolic_bp ?? '',
            'pulse_rate'       => $latestVital?->pulse_rate ?? '',
            'respiratory_rate' => $latestVital?->respiratory_rate ?? '',
            'spo2'             => $latestVital?->spo2 ?? '',
        ];

        // Hospital course from doctor rounds SOAP notes
        $hospitalCourseLines = [];
        if (!empty($admission->reason_for_admission)) {
            $hospitalCourseLines[] = "Admitted with complaints of: " . $admission->reason_for_admission . ".";
        }

        foreach ($admission->doctorRounds->sortBy('round_date') as $round) {
            $dateStr = $round->round_date ? (is_string($round->round_date) ? $round->round_date : $round->round_date->format('d M Y')) : '';
            $doc = $round->doctor?->name ?? 'Doctor';
            $soapParts = array_filter([
                $round->subjective ? "S: " . $round->subjective : null,
                $round->objective ? "O: " . $round->objective : null,
                $round->assessment ? "Assessment: " . $round->assessment : null,
                $round->plan ? "Plan: " . $round->plan : null,
            ]);
            if (!empty($soapParts)) {
                $hospitalCourseLines[] = "• " . ($dateStr ? "[{$dateStr} - Dr. {$doc}]: " : "") . implode("; ", $soapParts);
            }
        }

        if (empty($hospitalCourseLines)) {
            $hospitalCourse = "Patient admitted under Dr. " . ($admission->doctor?->name ?? 'Attending Consultant') . ". Managed conservatively with supportive care. Vitals monitored and responded well to treatment.";
        } else {
            $hospitalCourse = implode("\n\n", $hospitalCourseLines);
        }

        // Procedures summary
        $procList = $admission->nursingProcedures->map(function ($proc) {
            return "• " . ($proc->procedure_name ?? 'Procedure') . ($proc->performed_at ? " on " . date('d M Y', strtotime($proc->performed_at)) : "");
        })->implode("\n");

        // Lab investigations summary
        $labList = $admission->labOrders->flatMap(function ($order) {
            return $order->items->map(function ($item) {
                $testName = $item->labTest?->name ?? 'Investigation';
                $val = !empty($item->result_value) ? ": {$item->result_value} " . ($item->unit ?? '') : " (Completed)";
                return "• {$testName}{$val}";
            });
        })->implode("\n");

        // Pre-populate take-home medications from active inpatient prescriptions if any
        $prefilledMeds = [];
        foreach ($admission->prescriptions as $rx) {
            foreach ($rx->items as $item) {
                $medName = $item->medicine?->name ?? $item->medicine_name ?? 'Medicine';
                $prefilledMeds[] = [
                    'medicine_name' => $medName,
                    'dosage_form'   => $item->dosage_form ?? 'Tablet',
                    'dose'          => $item->dose ?? '1 Tab',
                    'route'         => $item->route ?? 'Oral',
                    'frequency'     => $item->frequency ?? '1-0-1',
                    'duration'      => $item->duration ?? '5 Days',
                    'instructions'  => $item->instructions ?? 'After meals',
                ];
            }
        }

        return [
            'id'                          => null,
            'hospital_id'                 => $hospitalId,
            'ipd_admission_id'            => $admission->id,
            'patient_id'                  => $admission->patient_id,
            'doctor_id'                   => $admission->doctor_id,
            'prepared_by_user_id'         => null,
            'finalized_by_user_id'        => null,
            'summary_number'              => null,
            'status'                      => 'draft',
            'discharge_type'              => $admission->discharge_type ?? 'normal',
            'admission_date'              => $admission->admission_date?->toISOString() ?? (string) now()->toISOString(),
            'discharge_date'              => $admission->discharge_date?->toISOString() ?? (string) now()->toISOString(),
            'admission_diagnosis'         => $admission->diagnosis ?? $admission->reason_for_admission ?? '',
            'final_diagnosis'             => $admission->final_diagnosis ?? $admission->diagnosis ?? '',
            'icd10_code'                  => '',
            'chief_complaints'            => $admission->reason_for_admission ?? '',
            'history_of_present_illness'  => '',
            'past_history_and_allergies'  => !empty($admission->patient?->allergies) ? (is_array($admission->patient->allergies) ? implode(', ', $admission->patient->allergies) : (string)$admission->patient->allergies) : 'No known drug allergies (NKDA)',
            'condition_at_discharge'      => 'Patient is hemodynamically stable, afebrile, and ambulatory at time of discharge.',
            'discharge_vitals'            => $dischargeVitals,
            'hospital_course'             => $hospitalCourse,
            'procedures_surgeries'        => $procList,
            'investigations_summary'      => $labList,
            'treatment_given'             => 'Intravenous fluids, analgesics, supportive medical care as per hospital protocol.',
            'discharge_medications'       => $prefilledMeds,
            'dietary_advice'              => 'Normal balanced diet. Adequate oral fluid hydration. Avoid spicy and oily foods.',
            'physical_activity_advice'    => 'Gentle ambulation allowed. Avoid strenuous physical activities and heavy lifting for 2 weeks.',
            'wound_care_instructions'     => 'Keep surgical/IV site clean and dry. Watch for any redness, swelling, or active discharge.',
            'emergency_red_flags'         => 'Report to Emergency / Casualty immediately in case of: High persistent fever (>101°F), severe breathlessness, uncontrolled acute pain, persistent vomiting, or active bleeding.',
            'follow_up_date'              => now()->addDays(7)->toDateString(),
            'follow_up_doctor_id'         => $admission->doctor_id,
            'follow_up_instructions'      => 'Review in OPD after 7 days with all discharge documents and follow-up reports.',
            'finalized_at'                => null,
            'patient'                     => $admission->patient,
            'ipd_admission'               => [
                'id'             => $admission->id,
                'ipd_number'     => $admission->ipd_number,
                'admission_date' => $admission->admission_date,
                'ward'           => $admission->ward?->name,
                'bed'            => $admission->bed?->bed_number,
                'status'         => $admission->status,
            ],
        ];
    }

    /**
     * Create or update clinical discharge summary (draft or finalized).
     */
    public function saveDischargeSummary(int $hospitalId, int $admissionId, array $data, int $userId): array
    {
        return DB::transaction(function () use ($hospitalId, $admissionId, $data, $userId) {
            $admission = IpdAdmission::where('hospital_id', $hospitalId)->findOrFail($admissionId);

            $summary = IpdDischargeSummary::where('hospital_id', $hospitalId)
                ->where('ipd_admission_id', $admissionId)
                ->first();

            $status = $data['status'] ?? ($summary?->status ?? 'draft');

            // Generate summary number if not existing
            $summaryNumber = $summary?->summary_number;
            if (empty($summaryNumber)) {
                $year = date('Y');
                $count = IpdDischargeSummary::where('hospital_id', $hospitalId)->whereYear('created_at', $year)->count() + 1;
                $summaryNumber = sprintf("DS-%s-%04d", $year, $count);
            }

            $isFinalizing = ($status === 'finalized' && (!$summary || $summary->status !== 'finalized'));

            $fields = [
                'hospital_id'                 => $hospitalId,
                'ipd_admission_id'            => $admissionId,
                'patient_id'                  => $admission->patient_id,
                'doctor_id'                   => $data['doctor_id'] ?? $admission->doctor_id,
                'summary_number'              => $summaryNumber,
                'status'                      => $status,
                'discharge_type'              => $data['discharge_type'] ?? 'normal',
                'admission_date'              => $data['admission_date'] ?? $admission->admission_date,
                'discharge_date'              => $data['discharge_date'] ?? now(),
                'admission_diagnosis'         => $data['admission_diagnosis'] ?? null,
                'final_diagnosis'             => $data['final_diagnosis'] ?? null,
                'icd10_code'                  => $data['icd10_code'] ?? null,
                'chief_complaints'            => $data['chief_complaints'] ?? null,
                'history_of_present_illness'  => $data['history_of_present_illness'] ?? null,
                'past_history_and_allergies'  => $data['past_history_and_allergies'] ?? null,
                'condition_at_discharge'      => $data['condition_at_discharge'] ?? null,
                'discharge_vitals'            => $data['discharge_vitals'] ?? null,
                'hospital_course'             => $data['hospital_course'] ?? null,
                'procedures_surgeries'        => $data['procedures_surgeries'] ?? null,
                'investigations_summary'      => $data['investigations_summary'] ?? null,
                'treatment_given'             => $data['treatment_given'] ?? null,
                'discharge_medications'       => $data['discharge_medications'] ?? [],
                'dietary_advice'              => $data['dietary_advice'] ?? null,
                'physical_activity_advice'    => $data['physical_activity_advice'] ?? null,
                'wound_care_instructions'     => $data['wound_care_instructions'] ?? null,
                'emergency_red_flags'         => $data['emergency_red_flags'] ?? null,
                'follow_up_date'              => $data['follow_up_date'] ?? null,
                'follow_up_doctor_id'         => $data['follow_up_doctor_id'] ?? $admission->doctor_id,
                'follow_up_instructions'      => $data['follow_up_instructions'] ?? null,
            ];

            $validUserId = ($userId && \App\Models\User::where('id', $userId)->exists()) ? $userId : null;

            if (!$summary) {
                $fields['prepared_by_user_id'] = $validUserId;
            }

            if ($isFinalizing) {
                $fields['finalized_at'] = now();
                $fields['finalized_by_user_id'] = $validUserId;
            }

            if ($summary) {
                $summary->update($fields);
            } else {
                $summary = IpdDischargeSummary::create($fields);
            }

            // Sync with IpdAdmission if finalized
            if ($status === 'finalized') {
                $admissionUpdates = [
                    'final_diagnosis'   => $fields['final_diagnosis'],
                    'discharge_summary' => $fields['hospital_course'],
                    'discharge_advice'  => trim(($fields['follow_up_instructions'] ?? '') . "\n" . ($fields['dietary_advice'] ?? '')),
                    'discharge_type'    => $fields['discharge_type'],
                ];

                if (!empty($data['mark_as_discharged']) || $admission->status === 'admitted') {
                    $admissionUpdates['status'] = 'discharged';
                    $admissionUpdates['discharge_date'] = $fields['discharge_date'];
                    $admissionUpdates['discharged_by_user_id'] = $userId;

                    // Release bed if bed still assigned
                    if ($admission->bed_id) {
                        Bed::where('id', $admission->bed_id)->update([
                            'status'               => 'available',
                            'current_admission_id' => null,
                        ]);
                    }
                }

                $admission->update($admissionUpdates);
            }

            return $summary->fresh([
                'patient',
                'doctor',
                'followUpDoctor',
                'preparedByUser',
                'finalizedByUser',
            ])->toArray();
        });
    }

    /**
     * Get complete printable discharge card data.
     */
    public function getDischargePrintData(int $hospitalId, int $admissionId): array
    {
        $hospital = Hospital::findOrFail($hospitalId);
        $admission = IpdAdmission::where('hospital_id', $hospitalId)
            ->with([
                'patient',
                'doctor.department',
                'ward',
                'bed',
                'dischargeSummary.preparedByUser',
                'dischargeSummary.finalizedByUser',
                'dischargeSummary.followUpDoctor',
            ])
            ->findOrFail($admissionId);

        $summary = $admission->dischargeSummary;

        $hospitalPhone = HospitalSetting::get($hospitalId, 'hospital_phone', $hospital->phone ?? '');
        $hospitalEmail = HospitalSetting::get($hospitalId, 'hospital_email', $hospital->email ?? '');
        $hospitalLogo = HospitalSetting::get($hospitalId, 'hospital_logo', '');
        $hospitalTagline = HospitalSetting::get($hospitalId, 'hospital_tagline', 'Excellence in Inpatient & Clinical Care');
        $nabhAccredited = HospitalSetting::get($hospitalId, 'nabh_accredited', true);

        return [
            'hospital' => [
                'name'            => $hospital->name,
                'code'            => $hospital->code,
                'address'         => $hospital->address,
                'city'            => $hospital->city,
                'state'           => $hospital->state,
                'pincode'         => $hospital->pincode,
                'phone'           => $hospitalPhone,
                'email'           => $hospitalEmail,
                'logo_url'        => $hospitalLogo,
                'tagline'         => $hospitalTagline,
                'nabh_accredited' => (bool)$nabhAccredited,
                'abdm_hip_id'     => $hospital->abdm_hip_id,
            ],
            'admission' => [
                'id'             => $admission->id,
                'ipd_number'     => $admission->ipd_number,
                'admission_date' => $admission->admission_date?->format('d M Y, h:i A'),
                'discharge_date' => $summary?->discharge_date ? $summary->discharge_date->format('d M Y, h:i A') : ($admission->discharge_date ? $admission->discharge_date->format('d M Y, h:i A') : now()->format('d M Y, h:i A')),
                'length_of_stay' => $admission->admission_date ? ceil($admission->admission_date->diffInHours($summary?->discharge_date ?? now()) / 24) . ' Day(s)' : '-',
                'ward'           => $admission->ward?->name ?? 'General Ward',
                'bed'            => $admission->bed?->bed_number ?? 'Bed',
                'status'         => $admission->status,
            ],
            'patient' => [
                'id'          => $admission->patient?->id,
                'name'        => $admission->patient?->name,
                'uhid'        => $admission->patient?->uhid,
                'age'         => $admission->patient?->age ?? ($admission->patient?->dob ? \Carbon\Carbon::parse($admission->patient->dob)->age : '-'),
                'gender'      => $admission->patient?->gender,
                'phone'       => $admission->patient?->phone ?? $admission->patient?->mobile,
                'blood_group' => $admission->patient?->blood_group ?? '-',
                'address'     => $admission->patient?->address,
            ],
            'doctor' => [
                'name'          => $admission->doctor?->name ?? 'Attending Consultant',
                'qualification' => $admission->doctor?->qualification ?? 'MBBS, MD',
                'department'    => $admission->doctor?->department?->name ?? 'General Medicine',
                'reg_no'        => $admission->doctor?->reg_no ?? 'MCI-' . ($admission->doctor_id ?? 101),
            ],
            'follow_up_doctor' => [
                'name'          => $summary?->followUpDoctor?->name ?? $admission->doctor?->name ?? 'Attending Consultant',
                'qualification' => $summary?->followUpDoctor?->qualification ?? $admission->doctor?->qualification ?? '',
            ],
            'summary' => $summary ? $summary->toArray() : null,
        ];
    }
}

