<?php

namespace App\Services\Ipd;

use App\Models\Bed;
use App\Models\CounterQueue;
use App\Models\IpdAdmission;
use App\Models\Patient;
use App\Models\Ward;
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
                $queue = CounterQueue::where('link_token', $data['token'])
                    ->where('hospital_id', $hospitalId)
                    ->firstOrFail();
                $patientId = $queue->patient_id;
                $queue->update(['status' => 'confirmed']);
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
                Bed::where('id', $admission->bed_id)->update([
                    'status'               => 'available',
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
                } else {
                    $maintenanceBeds++;
                }

                $wardBedList[] = [
                    'id'            => $bed->id,
                    'bed_number'    => $bed->bed_number,
                    'status'        => $bed->status, // available, occupied, maintenance
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
}

