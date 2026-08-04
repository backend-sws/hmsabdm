<?php

namespace Database\Factories;

use App\Models\Hospital;
use Illuminate\Database\Eloquent\Factories\Factory;

class PatientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'hospital_id' => Hospital::factory(),
            'name' => fake()->name(),
            'mobile' => fake()->numerify('##########'),
            'gender' => fake()->randomElement(['M', 'F', 'O']),
            'dob' => fake()->date(),
        ];
    }
}
