<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Hospital;
use Illuminate\Database\Eloquent\Factories\Factory;

class DoctorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'hospital_id' => Hospital::factory(),
            'department_id' => Department::factory(),
            'name' => 'Dr. ' . fake()->name(),
            'specialization' => fake()->word(),
            'is_active' => true,
        ];
    }
}
