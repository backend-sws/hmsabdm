<?php

namespace App\Services\Opd;

use App\Models\OpdVisit;
use Illuminate\Support\Facades\DB;

class OpdService implements OpdServiceInterface
{
    public function getTodayQueue(int $hospitalId, int $doctorId)
    {
        return OpdVisit::where('hospital_id', $hospitalId)
            ->where('doctor_id', $doctorId)
            ->whereDate('visit_date', today())
            ->whereIn('status', ['waiting', 'called', 'in_consultation'])
            ->with('patient')
            ->orderBy('queue_token', 'asc')
            ->paginate(15);
    }

    public function callPatient(int $hospitalId, int $doctorId, int $visitId): array
    {
        $visit = OpdVisit::where('hospital_id', $hospitalId)
            ->where('doctor_id', $doctorId)
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
        $visit = OpdVisit::where('hospital_id', $hospitalId)
            ->where('doctor_id', $doctorId)
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
