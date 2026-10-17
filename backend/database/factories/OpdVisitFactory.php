<?php

namespace Database\Factories;

use App\Models\Doctor;
use App\Models\Hospital;
use App\Models\Patient;
use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\Factory;

class OpdVisitFactory extends Factory
{
    public function definition(): array
    {
        $hasFaker = class_exists(\Faker\Generator::class);

        return [
            'hospital_id' => Hospital::factory(),
            'patient_id' => Patient::factory(),
            'doctor_id' => Doctor::factory(),
            'department_id' => Department::factory(),
            'visit_date' => now()->toDateString(),
            'queue_token' => $hasFaker ? $this->faker->numberBetween(1, 100) : rand(1, 100),
            'status' => 'waiting',
        ];
    }
}
