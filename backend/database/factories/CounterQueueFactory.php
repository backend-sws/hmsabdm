<?php

namespace Database\Factories;

use App\Models\Hospital;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

class CounterQueueFactory extends Factory
{
    public function definition(): array
    {
        return [
            'hospital_id' => Hospital::factory(),
            'patient_id' => Patient::factory(),
            'link_token' => (string) fake()->numberBetween(100, 999),
            'counter_code' => 'HIP123',
            'status' => 'waiting_confirmation',
            'expires_at' => now()->addMinutes(30),
        ];
    }
}
