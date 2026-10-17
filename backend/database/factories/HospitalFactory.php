<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class HospitalFactory extends Factory
{
    public function definition(): array
    {
        $hasFaker = class_exists(\Faker\Generator::class);

        return [
            'name' => $hasFaker ? $this->faker->company() : 'City Hospital ' . rand(10, 99),
            'email' => $hasFaker ? $this->faker->unique()->safeEmail() : 'contact' . rand(100, 999) . '@hospital.com',
            'phone' => $hasFaker ? $this->faker->numerify('98########') : '98' . rand(10000000, 99999999),
            'address' => $hasFaker ? $this->faker->address() : 'Main Road, Healthcare Complex',
        ];
    }
}
