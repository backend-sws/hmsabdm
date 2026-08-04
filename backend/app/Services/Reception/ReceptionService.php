<?php

namespace App\Services\Reception;

use App\Models\CounterQueue;
use App\Models\Department;
use App\Models\OpdVisit;
use App\Models\Patient;
use Illuminate\Support\Facades\DB;

class ReceptionService implements ReceptionServiceInterface
{
    public function getWaitingQueues(int $hospitalId)
    {
        return CounterQueue::where('hospital_id', $hospitalId)
            ->where('status', 'waiting_confirmation')
            ->where('expires_at', '>', now())
            ->with('patient')
            ->orderBy('created_at', 'desc')
            ->paginate(15);
    }

    public function getQueueByToken(int $hospitalId, string $token): array
    {
        $queue = CounterQueue::where('hospital_id', $hospitalId)
            ->where('link_token', $token)
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

    public function getDepartmentsWithDoctors(int $hospitalId)
    {
        return Department::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->with(['doctors' => function ($q) {
                $q->where('is_active', true);
            }])
            ->paginate(15);
    }

    public function registerPatient(int $hospitalId, array $data): array
    {
        $data['hospital_id'] = $hospitalId;
        return Patient::create($data)->toArray();
    }

    public function confirmQueue(int $hospitalId, int $queueId, int $doctorId, int $departmentId, ?int $appointmentTypeId = null): array
    {
        return DB::transaction(function () use ($hospitalId, $queueId, $doctorId, $departmentId, $appointmentTypeId) {
            $queue = CounterQueue::where('hospital_id', $hospitalId)
                ->where('id', $queueId)
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
        $lastToken = OpdVisit::where('hospital_id', $hospitalId)
            ->where('doctor_id', $data['doctor_id'])
            ->where('visit_date', $date)
            ->max('queue_token');

        $nextToken = $lastToken ? $lastToken + 1 : 1;

        $visit = OpdVisit::create([
            'hospital_id' => $hospitalId,
            'patient_id' => $data['patient_id'],
            'doctor_id' => $data['doctor_id'],
            'department_id' => $data['department_id'],
            'appointment_type_id' => $data['appointment_type_id'] ?? null,
            'visit_date' => $date,
            'queue_token' => $nextToken,
            'status' => 'waiting',
            'chief_complaint' => $data['chief_complaint'] ?? null,
        ]);

        return $visit->toArray();
    }
}
