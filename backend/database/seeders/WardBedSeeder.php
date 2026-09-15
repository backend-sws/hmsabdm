<?php

namespace Database\Seeders;

use App\Models\Bed;
use App\Models\Hospital;
use App\Models\Ward;
use Illuminate\Database\Seeder;

class WardBedSeeder extends Seeder
{
    public function run(): void
    {
        $hospitals = Hospital::all();
        if ($hospitals->isEmpty()) {
            return;
        }

        foreach ($hospitals as $hospital) {
            $wardsData = [
                [
                    'name'         => 'General Ward (Male)',
                    'code'         => 'GWM',
                    'floor'        => '1st Floor',
                    'gender_type'  => 'male',
                    'daily_charge' => 800.00,
                    'beds_count'   => 5,
                ],
                [
                    'name'         => 'General Ward (Female)',
                    'code'         => 'GWF',
                    'floor'        => '1st Floor',
                    'gender_type'  => 'female',
                    'daily_charge' => 800.00,
                    'beds_count'   => 5,
                ],
                [
                    'name'         => 'Intensive Care Unit (ICU)',
                    'code'         => 'ICU',
                    'floor'        => '2nd Floor',
                    'gender_type'  => 'all',
                    'daily_charge' => 4500.00,
                    'beds_count'   => 4,
                ],
                [
                    'name'         => 'Deluxe AC Private Room',
                    'code'         => 'DLX',
                    'floor'        => '3rd Floor',
                    'gender_type'  => 'all',
                    'daily_charge' => 2500.00,
                    'beds_count'   => 3,
                ],
                [
                    'name'         => 'Semi-Private Ward',
                    'code'         => 'SPW',
                    'floor'        => '2nd Floor',
                    'gender_type'  => 'all',
                    'daily_charge' => 1500.00,
                    'beds_count'   => 4,
                ],
            ];

            foreach ($wardsData as $w) {
                $ward = Ward::firstOrCreate(
                    ['hospital_id' => $hospital->id, 'code' => $w['code']],
                    [
                        'name'         => $w['name'],
                        'floor'        => $w['floor'],
                        'gender_type'  => $w['gender_type'],
                        'daily_charge' => $w['daily_charge'],
                        'is_active'    => true,
                    ]
                );

                for ($i = 1; $i <= $w['beds_count']; $i++) {
                    $bedNumber = sprintf('%s-%02d', $w['code'], $i);
                    Bed::firstOrCreate(
                        ['hospital_id' => $hospital->id, 'ward_id' => $ward->id, 'bed_number' => $bedNumber],
                        [
                            'status'       => 'available',
                            'daily_charge' => $w['daily_charge'],
                            'is_active'    => true,
                        ]
                    );
                }
            }
        }
    }
}
