<?php

namespace Database\Factories;

use App\Models\Hospital;
use Illuminate\Database\Eloquent\Factories\Factory;

class DepartmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'hospital_id' => Hospital::factory(),
            'name' => fake()->word(),
            'code' => fake()->unique()->word(),
            'is_active' => true,
        ];
    }
}
