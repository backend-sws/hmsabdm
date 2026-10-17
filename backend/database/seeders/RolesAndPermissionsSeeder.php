<?php

namespace Database\Seeders;

use App\Models\Hospital;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Seed core roles and assignable permissions for multi-tenant hospital modules.
     */
    public function run(): void
    {
        // 1. Global Super Admin Role (No hospital_id)
        setPermissionsTeamId(null);
        Role::firstOrCreate([
            'name'        => 'Super Admin',
            'guard_name'  => 'sanctum',
            'hospital_id' => null,
        ]);

        // 2. Standard Hospital-level Roles
        $roles = [
            'Admin',
            'Doctor',
            'Nurse',
            'Pharmacist',
            'Lab Technician',
            'Receptionist',
            'Cashier',
            'Blood Bank Officer',
            'Emergency Physician',
        ];

        $hospitals = Hospital::all();
        foreach ($hospitals as $hospital) {
            setPermissionsTeamId($hospital->id);
            foreach ($roles as $roleName) {
                Role::firstOrCreate([
                    'name'        => $roleName,
                    'guard_name'  => 'sanctum',
                    'hospital_id' => $hospital->id,
                ]);
            }
        }
    }
}
