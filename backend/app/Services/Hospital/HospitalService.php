<?php

namespace App\Services\Hospital;

use App\Models\Hospital;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class HospitalService implements HospitalServiceInterface
{
    /**
     * Get paginated list of hospitals.
     */
    public function getHospitals(Request $request)
    {
        $perPage = (int) $request->input('per_page', 15);
        $search = $request->input('search');

        $query = Hospital::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('abdm_hip_id', 'like', "%{$search}%");
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Get hospital by ID.
     */
    public function getHospitalById(int $id): Hospital
    {
        return Hospital::findOrFail($id);
    }

    /**
     * Register a new hospital and set up initial Admin user with roles.
     */
    public function registerHospital(array $data): array
    {
        $hospital = DB::transaction(function () use ($data) {
            $hospitalData = [
                'name'        => $data['name'],
                'code'        => $data['code'] ?? Str::upper(Str::slug($data['name'])),
                'address'     => $data['address'] ?? null,
                'city'        => $data['city'] ?? null,
                'state'       => $data['state'] ?? null,
                'pincode'     => $data['pincode'] ?? null,
                'abdm_hip_id' => $data['abdm_hip_id'] ?? null,
            ];

            $hospital = Hospital::create($hospitalData);

            if (!empty($data['admin_email'])) {
                $username = strtolower(explode('@', $data['admin_email'])[0]);
                if (User::where('username', $username)->exists()) {
                    $username .= '_' . Str::lower(Str::random(4));
                }

                $adminUser = User::create([
                    'hospital_id' => $hospital->id,
                    'name'        => $data['admin_name'] ?? ($hospital->name . ' Admin'),
                    'username'    => $username,
                    'email'       => $data['admin_email'],
                    'password'    => Hash::make($data['admin_password'] ?? 'Admin@1234'),
                ]);

                // Create Hospital Admin Role for this specific hospital team
                setPermissionsTeamId($hospital->id);
                $adminRole = Role::firstOrCreate([
                    'name'        => 'Hospital Admin',
                    'guard_name'  => 'sanctum',
                    'hospital_id' => $hospital->id,
                ]);

                $adminUser->assignRole($adminRole);
            }

            return $hospital;
        });

        $responseData = $hospital->toArray();
        if (!empty($data['admin_email'])) {
            $responseData['admin_credentials'] = [
                'name'     => $data['admin_name'] ?? ($hospital->name . ' Admin'),
                'email'    => $data['admin_email'],
                'password' => $data['admin_password'] ?? 'Admin@1234',
            ];
        }

        return $responseData;
    }

    /**
     * Update hospital details.
     */
    public function updateHospital(int $id, array $data): Hospital
    {
        $hospital = Hospital::findOrFail($id);
        $hospital->update($data);
        return $hospital;
    }

    /**
     * Delete/deactivate a hospital.
     */
    public function deleteHospital(int $id): void
    {
        $hospital = Hospital::findOrFail($id);
        $hospital->delete();
    }
}
