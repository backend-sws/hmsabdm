<?php

namespace Database\Seeders;

use App\Models\Hospital;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // Create Default Hospital
        $hospital = Hospital::firstOrCreate(
            ['abdm_hip_id' => 'HIP-DEMO-001'],
            [
                'name' => 'Demo Care Hospital',
                'address' => '123 Demo St, Testing City',
            ]
        );

        // 1. Create Global Company Super Admin (hospital_id = null)
        setPermissionsTeamId(null);
        $superAdminRole = Role::firstOrCreate([
            'name' => 'Super Admin',
            'guard_name' => 'sanctum',
            'hospital_id' => null
        ]);

        $superAdminUser = User::firstOrCreate(
            ['email' => 'superadmin@company.com'],
            [
                'name' => 'Company Super Admin',
                'password' => Hash::make('password'),
                'hospital_id' => null,
            ]
        );
        $superAdminUser->assignRole($superAdminRole);

        $superAdminUser2 = User::firstOrCreate(
            ['email' => 'superadmin@hms.com'],
            [
                'name' => 'HMS Super Admin',
                'password' => Hash::make('password'),
                'hospital_id' => null,
            ]
        );
        $superAdminUser2->assignRole($superAdminRole);

        // 2. Create Default Hospital and its Admin
        setPermissionsTeamId($hospital->id);
        
        $adminRole = Role::firstOrCreate([
            'name' => 'Admin', 
            'guard_name' => 'sanctum',
            'hospital_id' => $hospital->id
        ]);

        $hospitalAdmin = User::firstOrCreate(
            ['email' => 'admin@demo.com'],
            [
                'name' => 'Demo Admin',
                'password' => Hash::make('password'),
                'hospital_id' => $hospital->id,
            ]
        );

        $hospitalAdmin->assignRole($adminRole);
    }
}
