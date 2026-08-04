<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class HospitalFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->numerify('##########'),
            'address' => fake()->address(),
        ];
    }
}
