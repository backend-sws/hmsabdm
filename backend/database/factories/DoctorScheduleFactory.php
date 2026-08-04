<?php

namespace Database\Factories;

use App\Models\Doctor;
use Illuminate\Database\Eloquent\Factories\Factory;

class DoctorScheduleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'doctor_id' => Doctor::factory(),
            'day_of_week' => fake()->numberBetween(0, 6),
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'max_patients' => 30,
            'opd_fee' => fake()->numberBetween(100, 1000),
            'is_active' => true,
        ];
    }
}
