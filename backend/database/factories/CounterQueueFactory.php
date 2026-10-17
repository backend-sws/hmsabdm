<?php

namespace Database\Factories;

use App\Models\Hospital;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

class CounterQueueFactory extends Factory
{
    public function definition(): array
    {
        $hasFaker = class_exists(\Faker\Generator::class);

        return [
            'hospital_id' => Hospital::factory(),
            'patient_id' => Patient::factory(),
            'link_token' => (string) ($hasFaker ? $this->faker->numberBetween(100, 999) : rand(100, 999)),
            'counter_code' => 'HIP123',
            'status' => 'waiting_confirmation',
            'expires_at' => now()->addMinutes(30),
        ];
    }
}
