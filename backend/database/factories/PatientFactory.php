<?php

namespace Database\Factories;

use App\Models\Hospital;
use Illuminate\Database\Eloquent\Factories\Factory;

class PatientFactory extends Factory
{
    public function definition(): array
    {
        $faker = $this->safeFaker();

        return [
            'hospital_id' => Hospital::factory(),
            'name' => $faker->name(),
            'mobile' => $faker->numerify('98########'),
            'gender' => $faker->randomElement(['M', 'F', 'O']),
            'dob' => $faker->date(),
        ];
    }

    private function safeFaker(): object
    {
        if (isset($this->faker)) {
            return $this->faker;
        }

        if (function_exists('\fake')) {
            return \fake();
        }

        return new class {
            public function name(): string { return 'Demo Patient ' . rand(100, 999); }
            public function numerify(string $format): string { return (string) rand(9800000000, 9899999999); }
            public function randomElement(array $elements): mixed { return $elements[array_rand($elements)]; }
            public function date(): string { return '1990-01-01'; }
            public function unique(): self { return $this; }
            public function safeEmail(): string { return 'patient' . rand(100, 999) . '@example.com'; }
        };
    }
}
