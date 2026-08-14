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
        $this->call([
            SuperAdminSeeder::class,
            DoctorDepartmentSeeder::class,
        ]);

        // Get the hospital created by SuperAdminSeeder
        $hospital = Hospital::where('abdm_hip_id', 'HIP-DEMO-001')->first();

        if ($hospital) {
            setPermissionsTeamId($hospital->id);

            // Create a Demo Receptionist
            $receptionistRole = Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'sanctum', 'hospital_id' => $hospital->id]);
            
            $receptionist = User::firstOrCreate(
                ['email' => 'reception@demo.com'],
                [
                    'name' => 'Front Desk',
                    'username' => 'reception',
                    'password' => Hash::make('password'),
                    'hospital_id' => $hospital->id
                ]
            );
            $receptionist->assignRole($receptionistRole);

            // Seed Dummy Patients
            \App\Models\Patient::factory(15)->create([
                'hospital_id' => $hospital->id
            ]);
        }
    }
}
