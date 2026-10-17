<?php

namespace Database\Seeders;

use App\Models\Hospital;
use App\Models\HospitalSetting;
use App\Models\BloodDonor;
use App\Models\BloodUnit;
use App\Models\BloodTtiTest;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BloodBankMasterSeeder extends Seeder
{
    /**
     * Seed Blood Bank screening protocols, registered donors,
     * quarantine units, and tested available cold storage units.
     */
    public function run(): void
    {
        $hospitals = Hospital::all();
        if ($hospitals->isEmpty()) {
            return;
        }

        foreach ($hospitals as $hospital) {
            $hId = $hospital->id;

            // 1. Seed Hospital Screening Configuration
            $defaultScreeningConfig = [
                'vital_rules' => [
                    'min_hemoglobin_g_dl' => 12.5,
                    'min_weight_kg'       => 45.0,
                    'min_bp_systolic'     => 100,
                    'max_bp_systolic'     => 140,
                    'min_bp_diastolic'    => 60,
                    'max_bp_diastolic'    => 90,
                    'min_pulse'           => 60,
                    'max_pulse'           => 100,
                    'max_temperature'     => 37.5,
                ],
                'questions' => [
                    [
                        'id' => 'q_jaundice',
                        'label' => 'History of Jaundice, Hepatitis B or Hepatitis C',
                        'deferral_type' => 'permanent',
                        'deferral_days' => 0,
                        'is_active' => true,
                    ],
                    [
                        'id' => 'q_cardiac',
                        'label' => 'Known Heart Disease, Valve Disorder or Cardiac Surgery',
                        'deferral_type' => 'permanent',
                        'deferral_days' => 0,
                        'is_active' => true,
                    ],
                    [
                        'id' => 'q_hiv_risk',
                        'label' => 'High risk exposure or history of HIV/AIDS',
                        'deferral_type' => 'permanent',
                        'deferral_days' => 0,
                        'is_active' => true,
                    ],
                    [
                        'id' => 'q_diabetes_insulin',
                        'label' => 'Diabetes Mellitus requiring daily insulin injections',
                        'deferral_type' => 'permanent',
                        'deferral_days' => 0,
                        'is_active' => true,
                    ],
                    [
                        'id' => 'q_malaria_dengue',
                        'label' => 'Malaria, Dengue, or unexplained fever in last 3 months',
                        'deferral_type' => 'temporary',
                        'deferral_days' => 90,
                        'is_active' => true,
                    ],
                    [
                        'id' => 'q_surgery_major',
                        'label' => 'Major dental or surgical operation in last 6 months',
                        'deferral_type' => 'temporary',
                        'deferral_days' => 180,
                        'is_active' => true,
                    ],
                    [
                        'id' => 'q_tattoo',
                        'label' => 'Tattoo, body piercing, or acupuncture in last 12 months',
                        'deferral_type' => 'temporary',
                        'deferral_days' => 365,
                        'is_active' => true,
                    ],
                    [
                        'id' => 'q_alcohol_24h',
                        'label' => 'Alcohol consumption within the last 24 hours',
                        'deferral_type' => 'temporary',
                        'deferral_days' => 1,
                        'is_active' => true,
                    ],
                ],
            ];

            HospitalSetting::set($hId, 'blood_bank_screening_config', $defaultScreeningConfig, 'blood_bank', 'json');

            // 2. Seed Registered Donors
            $donorsData = [
                [
                    'donor_number' => 'DNR-' . $hId . '-0001',
                    'name' => 'Rajesh Verma',
                    'gender' => 'male',
                    'age' => 29,
                    'blood_group' => 'A+',
                    'mobile' => '9820011221',
                    'email' => 'rajesh.verma@example.com',
                    'address' => 'Flat 402, Sunshine Apartments, Mumbai',
                    'donor_type' => 'voluntary',
                    'deferral_status' => 'none',
                    'total_donations' => 4,
                    'last_donated_at' => now()->subMonths(4),
                ],
                [
                    'donor_number' => 'DNR-' . $hId . '-0002',
                    'name' => 'Priya Nair',
                    'gender' => 'female',
                    'age' => 24,
                    'blood_group' => 'O+',
                    'mobile' => '9820011222',
                    'email' => 'priya.nair@example.com',
                    'address' => '12 Rose Villa, Pune',
                    'donor_type' => 'voluntary',
                    'deferral_status' => 'none',
                    'total_donations' => 2,
                    'last_donated_at' => now()->subMonths(5),
                ],
                [
                    'donor_number' => 'DNR-' . $hId . '-0003',
                    'name' => 'Amit Patel',
                    'gender' => 'male',
                    'age' => 36,
                    'blood_group' => 'B+',
                    'mobile' => '9820011223',
                    'email' => 'amit.patel@example.com',
                    'address' => 'A-21 Green Acres, Ahmedabad',
                    'donor_type' => 'replacement',
                    'patient_uhid' => 'HOSP-2026-00001',
                    'deferral_status' => 'none',
                    'total_donations' => 1,
                    'last_donated_at' => now()->subDays(2),
                ],
                [
                    'donor_number' => 'DNR-' . $hId . '-0004',
                    'name' => 'Vikram Malhotra',
                    'gender' => 'male',
                    'age' => 41,
                    'blood_group' => 'O-',
                    'mobile' => '9820011224',
                    'email' => 'vikram.malhotra@example.com',
                    'address' => '501 Palm Grove, Delhi',
                    'donor_type' => 'voluntary',
                    'deferral_status' => 'none',
                    'total_donations' => 6,
                    'last_donated_at' => now()->subDays(10),
                ],
                [
                    'donor_number' => 'DNR-' . $hId . '-0005',
                    'name' => 'Sunita Rao',
                    'gender' => 'female',
                    'age' => 31,
                    'blood_group' => 'AB+',
                    'mobile' => '9820011225',
                    'email' => 'sunita.rao@example.com',
                    'address' => 'B-14 Lakeview, Bangalore',
                    'donor_type' => 'voluntary',
                    'deferral_status' => 'none',
                    'total_donations' => 3,
                    'last_donated_at' => now()->subDays(15),
                ],
            ];

            foreach ($donorsData as $d) {
                BloodDonor::firstOrCreate(
                    ['hospital_id' => $hId, 'donor_number' => $d['donor_number']],
                    array_merge($d, ['hospital_id' => $hId])
                );
            }

            // 3. Seed Inventory Units & Cleared TTI Tests
            $donor1 = BloodDonor::where('hospital_id', $hId)->where('donor_number', 'DNR-' . $hId . '-0001')->first();
            $donor2 = BloodDonor::where('hospital_id', $hId)->where('donor_number', 'DNR-' . $hId . '-0002')->first();
            $donor4 = BloodDonor::where('hospital_id', $hId)->where('donor_number', 'DNR-' . $hId . '-0004')->first();
            $donor5 = BloodDonor::where('hospital_id', $hId)->where('donor_number', 'DNR-' . $hId . '-0005')->first();

            $unitsData = [
                // Available A+ Whole Blood
                [
                    'unit_barcode' => 'WB-' . $hId . '-00101',
                    'donor_id' => $donor1?->id,
                    'component_type' => 'whole_blood',
                    'blood_group' => 'A+',
                    'volume_ml' => 450,
                    'bag_type' => 'single',
                    'collection_date' => now()->subDays(5),
                    'expiry_date' => now()->addDays(30),
                    'status' => 'available',
                    'tti_status' => 'negative',
                    'storage_equipment' => 'Refrigerator',
                    'storage_location' => 'Main Blood Bank Fridge A / Shelf 1',
                ],
                // Available O+ PRBC
                [
                    'unit_barcode' => 'PRBC-' . $hId . '-00201',
                    'donor_id' => $donor2?->id,
                    'component_type' => 'prbc',
                    'blood_group' => 'O+',
                    'volume_ml' => 300,
                    'bag_type' => 'triple',
                    'collection_date' => now()->subDays(3),
                    'expiry_date' => now()->addDays(39),
                    'status' => 'available',
                    'tti_status' => 'negative',
                    'storage_equipment' => 'Refrigerator',
                    'storage_location' => 'Main Blood Bank Fridge A / Shelf 2',
                ],
                // Available O- Universal PRBC
                [
                    'unit_barcode' => 'PRBC-' . $hId . '-00301',
                    'donor_id' => $donor4?->id,
                    'component_type' => 'prbc',
                    'blood_group' => 'O-',
                    'volume_ml' => 300,
                    'bag_type' => 'double',
                    'collection_date' => now()->subDays(10),
                    'expiry_date' => now()->addDays(32),
                    'status' => 'available',
                    'tti_status' => 'negative',
                    'storage_equipment' => 'Refrigerator',
                    'storage_location' => 'Emergency Reserve Fridge B / Shelf 1',
                ],
                // Available B+ Fresh Frozen Plasma
                [
                    'unit_barcode' => 'FFP-' . $hId . '-00401',
                    'donor_id' => $donor1?->id,
                    'component_type' => 'ffp',
                    'blood_group' => 'B+',
                    'volume_ml' => 200,
                    'bag_type' => 'triple',
                    'collection_date' => now()->subDays(8),
                    'expiry_date' => now()->addDays(357),
                    'status' => 'available',
                    'tti_status' => 'negative',
                    'storage_equipment' => 'Deep Freezer -40C',
                    'storage_location' => 'Ultra-Deep Plasma Freezer (-40C) Tray 2',
                ],
                // Available AB+ Platelets
                [
                    'unit_barcode' => 'PLT-' . $hId . '-00501',
                    'donor_id' => $donor5?->id,
                    'component_type' => 'platelets',
                    'blood_group' => 'AB+',
                    'volume_ml' => 60,
                    'bag_type' => 'triple',
                    'collection_date' => now()->subDays(1),
                    'expiry_date' => now()->addDays(4),
                    'status' => 'available',
                    'tti_status' => 'negative',
                    'storage_equipment' => 'Platelet Agitator',
                    'storage_location' => 'Platelet Agitator Incubator (22C)',
                ],
                // Quarantine Whole Blood (Awaiting TTI test)
                [
                    'unit_barcode' => 'WB-' . $hId . '-00999',
                    'donor_id' => $donor1?->id,
                    'component_type' => 'whole_blood',
                    'blood_group' => 'A+',
                    'volume_ml' => 450,
                    'bag_type' => 'single',
                    'collection_date' => now()->subHours(4),
                    'expiry_date' => now()->addDays(35),
                    'status' => 'quarantine',
                    'tti_status' => 'non_tested',
                    'storage_equipment' => 'Refrigerator',
                    'storage_location' => 'Quarantine Phlebotomy Fridge / Shelf Q',
                ],
            ];

            foreach ($unitsData as $u) {
                $unit = BloodUnit::firstOrCreate(
                    ['hospital_id' => $hId, 'unit_barcode' => $u['unit_barcode']],
                    array_merge($u, ['hospital_id' => $hId])
                );

                // If available, record negative TTI test
                if ($u['status'] === 'available') {
                    BloodTtiTest::firstOrCreate(
                        ['hospital_id' => $hId, 'blood_unit_id' => $unit->id],
                        [
                            'hiv_result'             => 'non_reactive',
                            'hbv_result'             => 'non_reactive',
                            'hcv_result'             => 'non_reactive',
                            'syphilis_result'        => 'non_reactive',
                            'malaria_result'         => 'negative',
                            'blood_group_confirmed'  => $u['blood_group'],
                            'overall_status'         => 'passed',
                            'remarks'                => 'All donor screening TTI markers non-reactive. Cleared for clinical transfusion.',
                            'tested_at'              => now()->subDays(1),
                        ]
                    );
                }
            }
        }

        $this->command->info('Blood Bank screening rules, donors, and inventory units seeded successfully.');
    }
}
