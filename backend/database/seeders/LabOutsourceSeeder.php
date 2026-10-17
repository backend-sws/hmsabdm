<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LabExternalVendor;
use App\Models\LabTestTemplate;
use App\Models\LabRateList;
use App\Models\LabRateListItem;

class LabOutsourceSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed 3 Reference Labs
        $vendors = [
            [
                'vendor_code'     => 'LAL-PATH',
                'name'            => 'Dr Lal PathLabs Ltd.',
                'contact_person'  => 'Rajesh Sharma (Area B2B Manager)',
                'phone'           => '+91 98101 22334',
                'email'           => 'b2b.dispatch@lalpathlabs.com',
                'address'         => 'National Reference Laboratory, Block-E, Okhla Phase II, New Delhi 110020',
                'pickup_schedule' => 'Daily 2:00 PM & 7:00 PM',
                'default_courier' => 'Lal Path Express Logistics',
                'account_number'  => 'HOSP-DEL-8812',
                'is_active'       => true,
            ],
            [
                'vendor_code'     => 'THYROCARE',
                'name'            => 'Thyrocare Technologies Ltd.',
                'contact_person'  => 'Amit Verma (Central Logistics)',
                'phone'           => '+91 98200 44556',
                'email'           => 'logistics@thyrocare.com',
                'address'         => 'Central Processing Laboratory, D-37/1, TTC MIDC, Turbhe, Navi Mumbai 400703',
                'pickup_schedule' => 'Daily 5:30 PM (Air Cargo)',
                'default_courier' => 'BlueDart Cold Chain',
                'account_number'  => 'THY-B2B-1049',
                'is_active'       => true,
            ],
            [
                'vendor_code'     => 'METROPOLIS',
                'name'            => 'Metropolis Healthcare Ltd.',
                'contact_person'  => 'Dr. Neha Kapoor (Client Relations)',
                'phone'           => '+91 98300 77889',
                'email'           => 'referral@metropolisindia.com',
                'address'         => 'Global Reference Lab, Commercial Complex, Kohinoor City, Kurla West, Mumbai 400070',
                'pickup_schedule' => 'Daily 1:00 PM & 6:00 PM',
                'default_courier' => 'Metropolis Field Logistics',
                'account_number'  => 'METRO-CARE-4402',
                'is_active'       => true,
            ],
        ];

        $vendorMap = [];
        foreach ($vendors as $v) {
            $created = LabExternalVendor::firstOrCreate(
                ['vendor_code' => $v['vendor_code']],
                $v
            );
            $vendorMap[$v['vendor_code']] = $created->id;
        }

        // 2. Classify tests and set B2B Outsource and In-House Reagent Costs
        $thyrocareId = $vendorMap['THYROCARE'] ?? null;
        $lalPathId   = $vendorMap['LAL-PATH'] ?? null;
        $metroId     = $vendorMap['METROPOLIS'] ?? null;

        $templates = LabTestTemplate::all();
        foreach ($templates as $t) {
            $cat = $t->category;
            $mrp = (float) $t->standard_price;

            // Hormones, Vitamins, Molecular, Histopathology are commonly outsourced
            if (in_array($cat, ['Hormones', 'Vitamins'])) {
                $t->fulfillment_type  = 'outsourced';
                $t->default_vendor_id = $thyrocareId;
                // B2B cost ~ 25-35% of MRP (High hospital margin 65-75%)
                $t->b2b_cost          = round(max(50, $mrp * 0.30), 2);
                $t->reagent_cost      = 0.00;
            } elseif (in_array($cat, ['Molecular Diagnostics', 'Histopathology'])) {
                $t->fulfillment_type  = 'outsourced';
                $t->default_vendor_id = $lalPathId;
                // B2B cost ~ 35-40% of MRP
                $t->b2b_cost          = round(max(150, $mrp * 0.38), 2);
                $t->reagent_cost      = 0.00;
            } elseif ($cat === 'Serology & Immunology' && $mrp > 500) {
                // Specialized serology (ANA, Anti-CCP, Viral Load, Western Blot)
                $t->fulfillment_type  = 'outsourced';
                $t->default_vendor_id = $metroId;
                $t->b2b_cost          = round(max(120, $mrp * 0.35), 2);
                $t->reagent_cost      = 0.00;
            } else {
                // In-house routine tests (CBC, Blood Sugar, LFT, KFT, Urine R/M)
                $t->fulfillment_type  = 'in_house';
                $t->default_vendor_id = null;
                $t->b2b_cost          = 0.00;
                // Reagent/consumable cost ~ 12-20% of MRP
                $t->reagent_cost      = round(max(10, $mrp * 0.15), 2);
            }

            $t->save();
        }

        // 3. Seed Standard Rate Lists
        $rateLists = [
            [
                'code'        => 'OPD_STD',
                'name'        => 'Standard OPD Walk-In Rate',
                'description' => 'Default counter pricing for OPD walk-in and self-paying patients',
                'is_default'  => true,
            ],
            [
                'code'        => 'IPD_BED',
                'name'        => 'Inpatient (IPD) Bedside Collection Rate',
                'description' => 'Standard rate + 15% bedside phlebotomy and 24/7 STAT emergency processing surcharge',
                'is_default'  => false,
            ],
            [
                'code'        => 'TPA_CORP',
                'name'        => 'TPA / Cashless Corporate Rate',
                'description' => 'Contracted rates for Empanelled Insurance TPAs & Government schemes',
                'is_default'  => false,
            ],
            [
                'code'        => 'B2B_PARTNER',
                'name'        => 'Partner Clinic / B2B Referral Rate',
                'description' => 'Discounted rate card for partner nursing homes and referral clinics sending samples',
                'is_default'  => false,
            ],
        ];

        foreach ($rateLists as $rl) {
            LabRateList::firstOrCreate(
                ['code' => $rl['code']],
                $rl
            );
        }
    }
}
