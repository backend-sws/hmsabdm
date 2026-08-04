<?php

namespace App\Services\Doctor;

use App\Models\Doctor;
use App\Models\DoctorSchedule;
use Illuminate\Support\Facades\DB;

class DoctorService implements DoctorServiceInterface
{
    public function getAll(int $hospitalId)
    {
        return Doctor::where('hospital_id', $hospitalId)
            ->with(['department', 'schedules'])
            ->paginate(15);
    }

    public function getAvailableToday(int $hospitalId)
    {
        $today = now()->dayOfWeek; // 0 (Sunday) to 6 (Saturday)
        
        return Doctor::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->whereHas('schedules', function($q) use ($today) {
                $q->where('day_of_week', $today);
            })
            ->with(['department', 'schedules' => function($q) use ($today) {
                $q->where('day_of_week', $today);
            }])
            ->paginate(15);
    }

    public function create(int $hospitalId, array $data): array
    {
        $data['hospital_id'] = $hospitalId;
        return DB::transaction(function () use ($data) {
            $doctor = Doctor::create($data);
            return $doctor->load(['department'])->toArray();
        });
    }

    public function update(int $hospitalId, int $doctorId, array $data): array
    {
        $doctor = Doctor::where('hospital_id', $hospitalId)->findOrFail($doctorId);
        $doctor->update($data);
        return $doctor->refresh()->load(['department'])->toArray();
    }

    public function delete(int $hospitalId, int $doctorId): void
    {
        $doctor = Doctor::where('hospital_id', $hospitalId)->findOrFail($doctorId);
        $doctor->delete();
    }

    public function updateSchedule(int $hospitalId, int $doctorId, array $schedules): void
    {
        $doctor = Doctor::where('hospital_id', $hospitalId)->findOrFail($doctorId);
        
        DB::transaction(function () use ($doctor, $schedules) {
            $doctor->schedules()->delete();
            
            foreach ($schedules as $schedule) {
                $doctor->schedules()->create([
                    'day_of_week' => $schedule['day_of_week'],
                    'start_time' => $schedule['start_time'],
                    'end_time' => $schedule['end_time'],
                    'max_patients' => $schedule['max_patients'] ?? 30,
                    'opd_fee' => $schedule['opd_fee'] ?? null,
                    'is_active' => $schedule['is_active'] ?? true,
                ]);
            }
        });
    }
}
