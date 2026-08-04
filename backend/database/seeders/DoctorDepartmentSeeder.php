<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\Hospital;
use Illuminate\Database\Seeder;

class DoctorDepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $hospital = Hospital::first();
        if (!$hospital) {
            return;
        }

        // Create Departments
        $cardiology = Department::firstOrCreate(
            ['hospital_id' => $hospital->id, 'code' => 'CARDIO'],
            ['name' => 'Cardiology', 'description' => 'Heart related diseases', 'is_active' => true]
        );
        $ortho = Department::firstOrCreate(
            ['hospital_id' => $hospital->id, 'code' => 'ORTHO'],
            ['name' => 'Orthopedics', 'description' => 'Bone related issues', 'is_active' => true]
        );

        // Create Doctors
        $doctor1 = Doctor::firstOrCreate(
            ['hospital_id' => $hospital->id, 'email' => 'dr.sharma@demo.com'],
            [
                'department_id' => $cardiology->id,
                'name' => 'Dr. Sharma',
                'specialization' => 'Cardiologist',
                'phone' => '9999999991',
                'is_active' => true,
            ]
        );

        $doctor2 = Doctor::firstOrCreate(
            ['hospital_id' => $hospital->id, 'email' => 'dr.singh@demo.com'],
            [
                'department_id' => $ortho->id,
                'name' => 'Dr. Singh',
                'specialization' => 'Orthopedic Surgeon',
                'phone' => '9999999992',
                'is_active' => true,
            ]
        );

        // Create Schedules for today and tomorrow
        foreach ([$doctor1, $doctor2] as $doctor) {
            for ($i = 0; $i <= 6; $i++) {
                DoctorSchedule::firstOrCreate([
                    'doctor_id' => $doctor->id,
                    'day_of_week' => $i,
                ], [
                    'start_time' => '09:00:00',
                    'end_time' => '17:00:00',
                    'max_patients' => 50,
                    'opd_fee' => 500,
                    'is_active' => true,
                ]);
            }
        }
    }
}
