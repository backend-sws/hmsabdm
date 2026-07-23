<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Hospital;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create a Default Hospital (Tenant)
        $hospital = Hospital::firstOrCreate(
            ['email' => 'contact@aiims.com'],
            [
                'name' => 'AIIMS Hospital',
                'phone' => '1234567890',
                'address' => 'New Delhi, India'
            ]
        );

        // 2. Set the global Team ID for Spatie
        setPermissionsTeamId($hospital->id);

        // 3. Create Tenant-Aware Roles
        setPermissionsTeamId($hospital->id);
        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'sanctum', 'hospital_id' => $hospital->id]);
        $receptionistRole = Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'sanctum', 'hospital_id' => $hospital->id]);
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'sanctum', 'hospital_id' => $hospital->id]);

        // 4. Create Super Admin User
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@hms.com'],
            [
                'name' => 'System Super Admin',
                'password' => Hash::make('password'),
                'hospital_id' => $hospital->id
            ]
        );
        $superAdmin->assignRole($superAdminRole);

        // 5. Create a Demo Doctor
        setPermissionsTeamId($hospital->id);
        $doctor = User::firstOrCreate(
            ['email' => 'doctor@hms.com'],
            [
                'name' => 'Dr. Smith',
                'password' => Hash::make('password'),
                'hospital_id' => $hospital->id
            ]
        );
        $doctor->assignRole($doctorRole);

        // 6. Create a Demo Receptionist
        $receptionist = User::firstOrCreate(
            ['email' => 'reception@hms.com'],
            [
                'name' => 'Front Desk',
                'password' => Hash::make('password'),
                'hospital_id' => $hospital->id
            ]
        );
        $receptionist->assignRole($receptionistRole);

        // 7. Seed Dummy Patients
        \App\Models\Patient::factory(15)->create([
            'hospital_id' => $hospital->id
        ]);
    }
}
