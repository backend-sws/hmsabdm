<?php

namespace Database\Factories;

use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Patient>
 */
class PatientFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => fake()->unique()->numerify('##########'),
            'abha_number' => fake()->unique()->numerify('##-####-####-####'),
            'email' => fake()->unique()->safeEmail(),
            'hospital_id' => null, // Will be overridden in Seeder
        ];
    }
}
