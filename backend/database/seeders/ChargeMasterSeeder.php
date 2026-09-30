<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Hospital;
use App\Models\ChargeCategory;
use App\Models\ChargeMaster;
use App\Models\HospitalSetting;

class ChargeMasterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $hospitals = Hospital::all();

        foreach ($hospitals as $hospital) {
            $this->seedHospitalCharges($hospital->id);
        }
    }

    public static function seedHospitalCharges(int $hospitalId): void
    {
        // 1. Core Charge Categories
        $categoriesData = [
            'bed_charges' => [
                'display_name' => 'Bed & Room Rent',
                'description'  => 'Daily and hourly room tariffs for General, Semi-private, Deluxe, and ICU beds',
            ],
            'doctor_fees' => [
                'display_name' => 'Doctor Consultation & Rounds',
                'description'  => 'OPD consultations, daily inpatient rounds, and emergency night call-in fees',
            ],
            'nursing_charges' => [
                'display_name' => 'Nursing & Bedside Care',
                'description'  => 'Daily routine nursing, dressing, catheterization, and bedside procedures',
            ],
            'equipment_charges' => [
                'display_name' => 'Medical Equipment & Life Support',
                'description'  => 'Hourly and daily rental for Ventilator, Monitor, Infusion pump, and BiPAP',
            ],
            'procedure_charges' => [
                'display_name' => 'Procedures & Surgeries',
                'description'  => 'Minor/major surgical procedures, OT table charges, and endoscopy',
            ],
            'investigation_charges' => [
                'display_name' => 'Lab & Diagnostic Tests',
                'description'  => 'Pathology blood investigations, radiology X-Ray, CT Scan, and Ultrasound',
            ],
            'administrative_charges' => [
                'display_name' => 'Administrative & Emergency Fees',
                'description'  => 'Registration file charge, emergency triage surcharge, and ambulance',
            ],
        ];

        $categoryModels = [];
        foreach ($categoriesData as $name => $meta) {
            $categoryModels[$name] = ChargeCategory::firstOrCreate(
                ['hospital_id' => $hospitalId, 'name' => $name],
                [
                    'display_name' => $meta['display_name'],
                    'description'  => $meta['description'],
                    'is_active'    => true,
                ]
            );
        }

        // 2. Standard Charges Catalog
        $standardCharges = [
            // Bed Tariffs
            [
                'category'       => 'bed_charges',
                'code'           => 'BED-GEN',
                'name'           => 'General Ward Bed Rent',
                'billing_type'   => 'per_day',
                'standard_rate'  => 800.00,
                'description'    => 'Standard general ward bed tariff per calendar day / 24-hour cycle',
            ],
            [
                'category'       => 'bed_charges',
                'code'           => 'BED-SEMI',
                'name'           => 'Semi-Private Room Rent',
                'billing_type'   => 'per_day',
                'standard_rate'  => 2000.00,
                'description'    => 'Dual sharing semi-private room bed tariff',
            ],
            [
                'category'       => 'bed_charges',
                'code'           => 'BED-DLX',
                'name'           => 'Deluxe Private Room Rent',
                'billing_type'   => 'per_day',
                'standard_rate'  => 4000.00,
                'description'    => 'Air-conditioned single deluxe private room tariff',
            ],
            [
                'category'       => 'bed_charges',
                'code'           => 'BED-ICU',
                'name'           => 'Intensive Care Unit (ICU) Bed Rent',
                'billing_type'   => 'per_day',
                'standard_rate'  => 6500.00,
                'description'    => 'ICU bed tariff including central oxygen and motorized multi-function bed',
            ],

            // Doctor Fees
            [
                'category'       => 'doctor_fees',
                'code'           => 'DOC-RND',
                'name'           => 'Doctor Routine Inpatient Round',
                'billing_type'   => 'fixed',
                'standard_rate'  => 500.00,
                'description'    => 'Standard consultant daily patient bedside clinical round fee',
            ],
            [
                'category'       => 'doctor_fees',
                'code'           => 'DOC-EMG-CALL',
                'name'           => 'Specialist Emergency Call-in Fee',
                'billing_type'   => 'fixed',
                'standard_rate'  => 1500.00,
                'description'    => 'Night / Urgent emergency specialist call-in charge',
            ],

            // Nursing Charges
            [
                'category'       => 'nursing_charges',
                'code'           => 'NURS-DAILY',
                'name'           => 'Daily Routine Nursing Care',
                'billing_type'   => 'per_day',
                'standard_rate'  => 200.00,
                'description'    => 'Routine vitals monitoring, medication administration, and general nursing care',
            ],
            [
                'category'       => 'nursing_charges',
                'code'           => 'NURS-ICU',
                'name'           => 'ICU Specialized Nursing Care',
                'billing_type'   => 'per_day',
                'standard_rate'  => 1000.00,
                'description'    => '1:1 or 1:2 intensive nursing monitoring and hourly charting',
            ],
            [
                'category'       => 'nursing_charges',
                'code'           => 'NURS-DRESS-MIN',
                'name'           => 'Wound Dressing (Minor)',
                'billing_type'   => 'fixed',
                'standard_rate'  => 200.00,
                'description'    => 'Minor antiseptic wound cleaning and sterile gauze dressing',
            ],
            [
                'category'       => 'nursing_charges',
                'code'           => 'NURS-DRESS-MAJ',
                'name'           => 'Wound Dressing (Major / Burn)',
                'billing_type'   => 'fixed',
                'standard_rate'  => 500.00,
                'description'    => 'Extensive surgical incision or burn dressing',
            ],
            [
                'category'       => 'nursing_charges',
                'code'           => 'NURS-NEBUL',
                'name'           => 'Nebulization (Per Cycle)',
                'billing_type'   => 'fixed',
                'standard_rate'  => 100.00,
                'description'    => 'Respiratory aerosol nebulization therapy per session',
            ],
            [
                'category'       => 'nursing_charges',
                'code'           => 'NURS-CATH',
                'name'           => 'Foleys Catheterization',
                'billing_type'   => 'fixed',
                'standard_rate'  => 350.00,
                'description'    => 'Urinary catheter insertion with urobag setup',
            ],
            [
                'category'       => 'nursing_charges',
                'code'           => 'NURS-ECG',
                'name'           => 'Bedside 12-Lead ECG',
                'billing_type'   => 'fixed',
                'standard_rate'  => 300.00,
                'description'    => '12-lead electrocardiogram strip recording and doctor reading',
            ],

            // Equipment Charges
            [
                'category'       => 'equipment_charges',
                'code'           => 'EQ-VENT-HR',
                'name'           => 'Ventilator Life Support (Per Hour)',
                'billing_type'   => 'per_hour',
                'standard_rate'  => 500.00,
                'description'    => 'Mechanical invasive ventilator support per hourly log',
            ],
            [
                'category'       => 'equipment_charges',
                'code'           => 'EQ-MON-DAY',
                'name'           => 'Multi-Para Monitor (Per Day)',
                'billing_type'   => 'per_day',
                'standard_rate'  => 800.00,
                'description'    => 'Continuous 5-para / 7-para patient vitals monitor',
            ],
            [
                'category'       => 'equipment_charges',
                'code'           => 'EQ-PUMP-DAY',
                'name'           => 'Syringe / Infusion Pump (Per Day)',
                'billing_type'   => 'per_day',
                'standard_rate'  => 350.00,
                'description'    => 'Precision micro-infusion drug delivery pump',
            ],

            // Administrative
            [
                'category'       => 'administrative_charges',
                'code'           => 'ADM-REG-FEE',
                'name'           => 'Emergency Admission & File Fee',
                'billing_type'   => 'fixed',
                'standard_rate'  => 200.00,
                'description'    => 'One-time admission file opening and triage documentation charge',
            ],
        ];

        foreach ($standardCharges as $item) {
            $catModel = $categoryModels[$item['category']] ?? null;
            if (!$catModel) continue;

            ChargeMaster::firstOrCreate(
                [
                    'hospital_id' => $hospitalId,
                    'code'        => $item['code'],
                ],
                [
                    'category_id'    => $catModel->id,
                    'name'           => $item['name'],
                    'billing_type'   => $item['billing_type'],
                    'standard_rate'  => $item['standard_rate'],
                    'tax_percentage' => 0.00,
                    'description'    => $item['description'],
                    'is_active'      => true,
                    'is_system'      => true,
                ]
            );
        }

        // 3. Default Bed Billing Rules in Hospital Settings
        $defaultSettings = [
            'bed_billing_cycle'           => ['value' => 'admission_24h', 'type' => 'string'],
            'bed_cutoff_time'            => ['value' => '00:00',         'type' => 'string'],
            'bed_grace_period_minutes'   => ['value' => '120',           'type' => 'integer'],
            'same_day_discharge_rule'    => ['value' => 'half_day',      'type' => 'string'],
            'auto_apply_nursing_with_bed'=> ['value' => '1',             'type' => 'boolean'],
        ];

        foreach ($defaultSettings as $key => $conf) {
            HospitalSetting::firstOrCreate(
                [
                    'hospital_id' => $hospitalId,
                    'key'         => $key,
                ],
                [
                    'group' => 'bed_billing',
                    'value' => $conf['value'],
                    'type'  => $conf['type'],
                ]
            );
        }
    }
}
