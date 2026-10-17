<?php

namespace Database\Factories;

use App\Models\Doctor;
use Illuminate\Database\Eloquent\Factories\Factory;

class DoctorScheduleFactory extends Factory
{
    public function definition(): array
    {
        $hasFaker = class_exists(\Faker\Generator::class);

        return [
            'doctor_id' => Doctor::factory(),
            'day_of_week' => $hasFaker ? $this->faker->numberBetween(0, 6) : rand(1, 5),
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'max_patients' => 30,
            'opd_fee' => $hasFaker ? $this->faker->numberBetween(100, 1000) : 500,
            'is_active' => true,
        ];
    }
}
