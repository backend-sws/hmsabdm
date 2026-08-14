<?php

namespace App\Services\Doctor;

use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Http\Traits\CanFilterAndPaginate;
use Illuminate\Support\Facades\DB;

class DoctorService implements DoctorServiceInterface
{
    use CanFilterAndPaginate;

    public function getAll(int $hospitalId, $request = null)
    {
        $req = $request ?? request();
        $query = Doctor::query()->with(['department', 'schedules', 'user']);

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%")
                  ->orWhere('specialization', 'ilike', "%{$search}%")
                  ->orWhere('qualification', 'ilike', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('username', 'ilike', "%{$search}%");
                  });
            });
        }

        if ($req && $req->filled('department_id')) {
            $query->where('department_id', (int) $req->query('department_id'));
        }

        if ($req && $req->has('is_active') && $req->query('is_active') !== null && $req->query('is_active') !== '') {
            $query->where('is_active', filter_var($req->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        return $this->applyPaginationOrAll($query, $req);
    }

    public function getAvailableToday(int $hospitalId, $request = null)
    {
        $req = $request ?? request();
        $today = now()->dayOfWeek; // 0 (Sunday) to 6 (Saturday)
        
        $query = Doctor::where('is_active', true)
            ->whereHas('schedules', function($q) use ($today) {
                $q->where('day_of_week', $today)->where('is_active', true);
            })
            ->with(['department', 'user', 'schedules' => function($q) use ($today) {
                $q->where('day_of_week', $today)->where('is_active', true);
            }]);

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('specialization', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        if ($req && $req->filled('department_id')) {
            $query->where('department_id', (int) $req->query('department_id'));
        }

        return $this->applyPaginationOrAll($query, $req);
    }

    public function create(int $hospitalId, array $data): array
    {
        if (empty($data['hospital_id']) && $hospitalId) {
            $data['hospital_id'] = $hospitalId;
        }
        
        return DB::transaction(function () use ($hospitalId, $data) {
            // Generate username if not provided
            if (empty($data['username'])) {
                $hospital = \App\Models\Hospital::find($hospitalId);
                $prefix = $hospital && $hospital->code ? $hospital->code : 'H' . $hospitalId;
                do {
                    $generatedUsername = 'DR-' . $prefix . '-' . strtoupper(\Illuminate\Support\Str::random(6));
                } while (\App\Models\User::where('username', $generatedUsername)->exists());
                $data['username'] = $generatedUsername;
            }

            // Create User for Doctor
            $user = \App\Models\User::create([
                'name' => $data['name'],
                'email' => $data['email'] ?? null,
                'username' => $data['username'],
                'password' => \Illuminate\Support\Facades\Hash::make($data['password']),
                'hospital_id' => $hospitalId,
            ]);

            // Assign Doctor role
            $role = \Spatie\Permission\Models\Role::firstOrCreate([
                'name' => 'Doctor',
                'guard_name' => 'sanctum',
                'hospital_id' => $hospitalId
            ]);
            $user->assignRole($role);

            // Link user_id to doctor payload
            $data['user_id'] = $user->id;

            // Remove password and username from data before inserting into doctors table
            unset($data['password']);
            unset($data['username']);

            $doctor = Doctor::create($data);
            return $doctor->load(['department', 'user'])->toArray();
        });
    }

    public function update(int $hospitalId, int $doctorId, array $data): array
    {
        $doctor = Doctor::findOrFail($doctorId);
        
        DB::transaction(function () use ($doctor, &$data) {
            $userData = [];
            if (isset($data['password'])) {
                $userData['password'] = \Illuminate\Support\Facades\Hash::make($data['password']);
                unset($data['password']);
            }
            if (isset($data['username'])) {
                $userData['username'] = $data['username'];
                unset($data['username']);
            }
            if (isset($data['name'])) {
                $userData['name'] = $data['name'];
            }
            if (isset($data['email'])) {
                $userData['email'] = $data['email'];
            }
            
            if (!empty($userData) && $doctor->user_id) {
                $doctor->user->update($userData);
            }
            
            $doctor->update($data);
        });
        
        return $doctor->refresh()->load(['department', 'user'])->toArray();
    }

    public function delete(int $hospitalId, int $doctorId): void
    {
        $doctor = Doctor::findOrFail($doctorId);
        $doctor->delete();
    }

    public function updateSchedule(int $hospitalId, int $doctorId, array $schedules): void
    {
        $doctor = Doctor::findOrFail($doctorId);
        
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
