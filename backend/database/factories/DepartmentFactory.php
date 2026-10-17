<?php

namespace Database\Factories;

use App\Models\Hospital;
use Illuminate\Database\Eloquent\Factories\Factory;

class DepartmentFactory extends Factory
{
    public function definition(): array
    {
        $hasFaker = class_exists(\Faker\Generator::class);

        return [
            'hospital_id' => Hospital::factory(),
            'name' => $hasFaker ? $this->faker->word() : 'Dept ' . rand(10, 99),
            'code' => $hasFaker ? $this->faker->unique()->word() : 'DPT' . rand(100, 999),
            'is_active' => true,
        ];
    }
}
