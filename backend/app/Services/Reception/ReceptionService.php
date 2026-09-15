<?php

namespace App\Services\Reception;

use App\Models\CounterQueue;
use App\Models\Department;
use App\Models\OpdVisit;
use App\Models\Patient;
use App\Http\Traits\CanFilterAndPaginate;
use Illuminate\Support\Facades\DB;

class ReceptionService implements ReceptionServiceInterface
{
    use CanFilterAndPaginate;

    public function getWaitingQueues(int $hospitalId, $request = null)
    {
        $req = $request ?? request();
        $query = CounterQueue::where('status', 'waiting_confirmation')
            ->where('expires_at', '>', now())
            ->with('patient')
            ->orderBy('created_at', 'desc');

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('link_token', 'like', "%{$search}%")
                  ->orWhereHas('patient', function ($pq) use ($search) {
                      $pq->where('name', 'ilike', "%{$search}%")
                         ->orWhere('mobile', 'ilike', "%{$search}%");
                  });
            });
        }

        return $this->applyPaginationOrAll($query, $req);
    }

    public function getQueueByToken(int $hospitalId, string $token): array
    {
        $queue = CounterQueue::where('link_token', $token)
            ->with('patient')
            ->first();

        if (!$queue) {
            throw new \Exception('Token not found or invalid.');
        }

        if ($queue->expires_at < now() && $queue->status === 'waiting_confirmation') {
            $queue->update(['status' => 'expired']);
            throw new \Exception('Queue token has expired.');
        }

        return $queue->toArray();
    }

    public function getDepartmentsWithDoctors(int $hospitalId, $request = null)
    {
        $req = $request ?? request();
        $query = Department::where('is_active', true)
            ->with(['doctors' => function ($q) {
                $q->where('is_active', true);
            }]);

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('code', 'ilike', "%{$search}%");
            });
        }

        // Dropdowns for departments+doctors typically want all records unless paginated explicitly
        if ($req && !$req->has('page') && !$req->has('per_page')) {
            return $query->get();
        }

        return $this->applyPaginationOrAll($query, $req);
    }

    public function registerPatient(int $hospitalId, array $data): array
    {
        if (empty($data['hospital_id']) && $hospitalId) {
            $data['hospital_id'] = $hospitalId;
        }

        $query = Patient::where('hospital_id', $hospitalId);

        // 1. Match by ABHA Number
        if (!empty($data['abha_number'])) {
            $existing = (clone $query)->where('abha_number', $data['abha_number'])->first();
            if ($existing) {
                $existing->update(array_filter($data));
                return $existing->fresh()->toArray();
            }
        }

        // 2. Match by ABHA Address
        if (!empty($data['abha_address'])) {
            $existing = (clone $query)->where('abha_address', $data['abha_address'])->first();
            if ($existing) {
                $existing->update(array_filter($data));
                return $existing->fresh()->toArray();
            }
        }

        // 3. Match by ID Proof (e.g. PAN, DL, Voter ID)
        if (!empty($data['id_proof_number']) && !empty($data['id_proof_type'])) {
            $existing = (clone $query)
                ->where('id_proof_type', $data['id_proof_type'])
                ->where('id_proof_number', $data['id_proof_number'])
                ->first();
            if ($existing) {
                $existing->update(array_filter($data));
                return $existing->fresh()->toArray();
            }
        }

        // 4. Match by Mobile + Name
        if (!empty($data['mobile']) && !empty($data['name'])) {
            $existing = (clone $query)
                ->where('mobile', $data['mobile'])
                ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($data['name']))])
                ->first();
            if ($existing) {
                $existing->update(array_filter($data));
                return $existing->fresh()->toArray();
            }
        }

        return Patient::create($data)->toArray();
    }

    public function confirmQueue(int $hospitalId, int $queueId, int $doctorId, int $departmentId, ?int $appointmentTypeId = null): array
    {
        return DB::transaction(function () use ($hospitalId, $queueId, $doctorId, $departmentId, $appointmentTypeId) {
            $queue = CounterQueue::where('id', $queueId)
                ->where('status', 'waiting_confirmation')
                ->lockForUpdate()
                ->firstOrFail();

            if ($queue->expires_at < now()) {
                $queue->update(['status' => 'expired']);
                throw new \Exception('Queue token has expired.');
            }

            // Mark confirmed
            $queue->update(['status' => 'confirmed']);

            // Create OPD Visit
            $visit = $this->createOpdVisit($hospitalId, [
                'patient_id' => $queue->patient_id,
                'doctor_id' => $doctorId,
                'department_id' => $departmentId,
                'appointment_type_id' => $appointmentTypeId,
                'chief_complaint' => 'Scan & Share Registration',
            ]);

            return $visit;
        });
    }

    public function createOpdVisit(int $hospitalId, array $data): array
    {
        $date = now()->toDateString();
        
        // Calculate next queue token for the doctor on this date
        $lastToken = OpdVisit::where('doctor_id', $data['doctor_id'])
            ->where('visit_date', $date)
            ->max('queue_token');

        $nextToken = $lastToken ? $lastToken + 1 : 1;

        $feeCharged = (float) ($data['fee_charged'] ?? 0);
        $discount   = (float) ($data['discount'] ?? 0);
        $amountPaid = (float) ($data['amount_paid'] ?? 0);
        $netPayable = max(0, $feeCharged - $discount);

        $paymentBreakdown = $data['payment_breakdown'] ?? null;
        if (!empty($paymentBreakdown) && is_array($paymentBreakdown)) {
            if (!isset($data['amount_paid'])) {
                $amountPaid = (float) array_sum(array_column($paymentBreakdown, 'amount'));
            }
            $paymentMethod = count($paymentBreakdown) > 1 ? 'split' : ($paymentBreakdown[0]['method'] ?? 'cash');
        } else {
            $paymentMethod = $data['payment_method'] ?? ($amountPaid > 0 ? 'cash' : null);
        }

        // Determine payment status
        if (!empty($data['payment_status'])) {
            $paymentStatus = $data['payment_status'];
        } elseif ($feeCharged == 0 || $amountPaid >= $netPayable) {
            $paymentStatus = ($feeCharged > 0 || $amountPaid > 0) ? 'paid' : 'pending';
        } elseif ($amountPaid > 0 && $amountPaid < $netPayable) {
            $paymentStatus = 'partial';
        } else {
            $paymentStatus = 'pending';
        }

        $payload = [
            'patient_id'          => $data['patient_id'],
            'doctor_id'           => $data['doctor_id'],
            'department_id'       => $data['department_id'],
            'appointment_type_id' => $data['appointment_type_id'] ?? null,
            'visit_date'          => $date,
            'queue_token'         => $nextToken,
            'status'              => 'waiting',
            'chief_complaint'     => $data['chief_complaint'] ?? null,
            'fee_charged'         => $feeCharged,
            'discount'            => $discount,
            'amount_paid'         => $amountPaid,
            'payment_status'      => $paymentStatus,
            'payment_method'      => $paymentMethod,
            'payment_ref'         => $data['payment_ref'] ?? null,
            'payment_breakdown'   => $paymentBreakdown,
        ];

        if (!empty($data['hospital_id']) || $hospitalId) {
            $payload['hospital_id'] = $data['hospital_id'] ?? $hospitalId;
        }

        $visit = OpdVisit::create($payload);

        return $visit->load(['patient', 'doctor', 'department'])->toArray();
    }
}
