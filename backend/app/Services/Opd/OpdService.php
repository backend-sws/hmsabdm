<?php

namespace App\Services\Opd;

use App\Models\OpdVisit;
use App\Http\Traits\CanFilterAndPaginate;
use Illuminate\Support\Facades\DB;

class OpdService implements OpdServiceInterface
{
    use CanFilterAndPaginate;

    public function getTodayQueue(int $hospitalId, ?int $doctorId = null, $request = null)
    {
        $req = $request ?? request();

        $query = OpdVisit::where('hospital_id', $hospitalId)
            ->whereDate('visit_date', today())
            ->with(['patient.latestVital', 'department', 'doctor', 'latestVital']);

        if ($doctorId) {
            $query->where('doctor_id', $doctorId);
        }

        if ($req && $req->filled('status')) {
            $status = $req->query('status');
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        } else {
            $query->whereIn('status', ['waiting', 'called', 'in_consultation']);
        }

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('queue_token', 'like', "%{$search}%")
                  ->orWhereHas('patient', function ($pq) use ($search) {
                      $pq->where('name', 'ilike', "%{$search}%")
                         ->orWhere('mobile', 'ilike', "%{$search}%")
                         ->orWhere('abha_number', 'ilike', "%{$search}%");
                  });
            });
        }

        $query->orderBy('queue_token', 'asc');

        return $this->applyPaginationOrAll($query, $req);
    }

    public function callPatient(int $hospitalId, int $doctorId, int $visitId): array
    {
        $visit = OpdVisit::where('doctor_id', $doctorId)
            ->findOrFail($visitId);

        if ($visit->status === 'done' || $visit->status === 'cancelled') {
            throw new \Exception('Cannot call a patient whose visit is already done or cancelled.');
        }

        $visit->update([
            'status' => 'called',
            'called_at' => now(),
        ]);

        return $visit->refresh()->toArray();
    }

    public function completeConsultation(int $hospitalId, int $doctorId, int $visitId, array $data): array
    {
        $visit = OpdVisit::where('doctor_id', $doctorId)
            ->findOrFail($visitId);

        if ($visit->status === 'done') {
            throw new \Exception('Visit is already completed.');
        }

        $visit->update([
            'status' => 'done',
            'diagnosis' => $data['diagnosis'] ?? $visit->diagnosis,
            'notes' => $data['notes'] ?? $visit->notes,
            'completed_at' => now(),
        ]);

        return $visit->refresh()->toArray();
    }
}
