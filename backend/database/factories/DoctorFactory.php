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
            'name' => 'Dr. ' . $this->faker->name(),
            'specialization' => $this->faker->word(),
            'is_active' => true,
        ];
    }
}
