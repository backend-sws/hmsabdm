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
            ->with(['patient.latestVital', 'department', 'doctor', 'latestVital']);

        // Date Filtering (Specific date, Date Range, All Dates, or Today default)
        if ($req && $req->filled('date')) {
            $date = $req->query('date');
            $query->where(function ($q) use ($date) {
                $q->whereDate('visit_date', $date)
                  ->orWhere(function ($sub) use ($date) {
                      $sub->whereNull('visit_date')->whereDate('created_at', $date);
                  });
            });
        } elseif ($req && ($req->filled('start_date') || $req->filled('end_date'))) {
            if ($req->filled('start_date')) {
                $sd = $req->query('start_date');
                $query->where(function ($q) use ($sd) {
                    $q->whereDate('visit_date', '>=', $sd)
                      ->orWhere(function ($sub) use ($sd) {
                          $sub->whereNull('visit_date')->whereDate('created_at', '>=', $sd);
                      });
                });
            }
            if ($req->filled('end_date')) {
                $ed = $req->query('end_date');
                $query->where(function ($q) use ($ed) {
                    $q->whereDate('visit_date', '<=', $ed)
                      ->orWhere(function ($sub) use ($ed) {
                          $sub->whereNull('visit_date')->whereDate('created_at', '<=', $ed);
                      });
                });
            }
        } elseif ($req && filter_var($req->query('all_dates'), FILTER_VALIDATE_BOOLEAN)) {
            // No date filter constraint applied
        } else {
            $query->where(function ($q) {
                $q->whereDate('visit_date', today())
                  ->orWhere(function ($sub) {
                      $sub->whereNull('visit_date')->whereDate('created_at', today());
                  });
            });
        }

        if ($doctorId) {
            $query->where('doctor_id', $doctorId);
        }

        if ($req && $req->filled('department_id')) {
            $query->where('department_id', (int) $req->query('department_id'));
        }

        if ($req && $req->filled('status')) {
            $status = strtolower($req->query('status'));
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        } elseif ($req && filter_var($req->query('all'), FILTER_VALIDATE_BOOLEAN)) {
            // Keep all statuses including 'done' so completed consultations are visible and re-printable
        } else {
            $query->whereIn('status', ['waiting', 'called', 'in_consultation']);
        }

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('queue_token', 'like', "%{$search}%")
                  ->orWhere('opd_number', 'ilike', "%{$search}%")
                  ->orWhere('chief_complaint', 'ilike', "%{$search}%")
                  ->orWhere('diagnosis', 'ilike', "%{$search}%")
                  ->orWhereHas('patient', function ($pq) use ($search) {
                      $pq->where('name', 'ilike', "%{$search}%")
                         ->orWhere('mobile', 'ilike', "%{$search}%")
                         ->orWhere('uhid', 'ilike', "%{$search}%")
                         ->orWhere('abha_number', 'ilike', "%{$search}%");
                  })
                  ->orWhereHas('doctor', function ($dq) use ($search) {
                      $dq->where('name', 'ilike', "%{$search}%");
                  })
                  ->orWhereHas('department', function ($dpq) use ($search) {
                      $dpq->where('name', 'ilike', "%{$search}%");
                  });
            });
        }

        $query->orderBy('visit_date', 'desc')
              ->orderBy('queue_token', 'asc');

        return $this->applyPaginationOrAll($query, $req);
    }

    public function callPatient(int $hospitalId, int $doctorId, int $visitId): array
    {
        $visit = OpdVisit::where('hospital_id', $hospitalId)
            ->findOrFail($visitId);

        if ($visit->status === 'done' || $visit->status === 'cancelled') {
            throw new \Exception('Cannot call a patient whose visit is already done or cancelled.');
        }

        $visit->update([
            'status' => 'called',
            'called_at' => now(),
        ]);

        return $visit->refresh()->load(['patient.latestVital', 'department', 'doctor', 'latestVital'])->toArray();
    }

    public function completeConsultation(int $hospitalId, int $doctorId, int $visitId, array $data): array
    {
        $visit = OpdVisit::where('hospital_id', $hospitalId)
            ->findOrFail($visitId);

        if ($visit->status === 'done') {
            $visit->update([
                'diagnosis' => $data['diagnosis'] ?? $visit->diagnosis,
                'notes' => $data['notes'] ?? $visit->notes,
            ]);
            return $visit->refresh()->load(['patient.latestVital', 'department', 'doctor', 'latestVital'])->toArray();
        }

        $visit->update([
            'status' => 'done',
            'diagnosis' => $data['diagnosis'] ?? $visit->diagnosis,
            'notes' => $data['notes'] ?? $visit->notes,
            'completed_at' => now(),
        ]);

        return $visit->refresh()->load(['patient.latestVital', 'department', 'doctor', 'latestVital'])->toArray();
    }
}
