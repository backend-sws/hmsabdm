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
}
