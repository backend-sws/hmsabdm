<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Hospital;
use Illuminate\Database\Eloquent\Factories\Factory;

class DoctorFactory extends Factory
{
    public function definition(): array
    {
        $hasFaker = class_exists(\Faker\Generator::class);

        return [
            'hospital_id' => Hospital::factory(),
            'department_id' => Department::factory(),
            'name' => 'Dr. ' . ($hasFaker ? $this->faker->name() : 'Consultant ' . rand(10, 99)),
            'specialization' => $hasFaker ? $this->faker->word() : 'General Medicine',
            'is_active' => true,
        ];
    }
}
