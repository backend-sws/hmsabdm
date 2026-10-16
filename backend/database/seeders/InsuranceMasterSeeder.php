<?php

namespace Database\Seeders;

use App\Models\Hospital;
use App\Models\InsurancePayer;
use App\Models\InsuranceNonpayableItem;
use App\Models\InsuranceTariffPackage;
use Illuminate\Database\Seeder;

class InsuranceMasterSeeder extends Seeder
{
    public function run(): void
    {
        $hospitals = Hospital::all();

        foreach ($hospitals as $hospital) {
            $hId = $hospital->id;

            // 1. Seed Major Payers & TPAs
            $payers = [
                [
                    'name' => 'Medi Assist Insurance TPA Pvt Ltd',
                    'payer_type' => 'tpa',
                    'code' => 'MEDASSIST_' . $hId,
                    'contact_person' => 'Rajesh Sharma (Hospital Desk)',
                    'contact_phone' => '+91-80-69123400',
                    'contact_email' => 'hospitals@mediassist.in',
                    'portal_url' => 'https://hospital.mediassist.in',
                    'empanelment_number' => 'MED-HOSP-' . str_pad($hId, 4, '0', STR_PAD_LEFT),
                    'default_copay_percent' => 10,
                    'preauth_tat_hours' => 2,
                    'claim_settlement_days' => 21,
                ],
                [
                    'name' => 'Vidal Health Insurance TPA Pvt Ltd',
                    'payer_type' => 'tpa',
                    'code' => 'VIDAL_' . $hId,
                    'contact_person' => 'Sunita Sen (Network Operations)',
                    'contact_phone' => '+91-80-46682200',
                    'contact_email' => 'claims@vidalhealthtpa.com',
                    'portal_url' => 'https://vidalhealthtpa.com/provider',
                    'empanelment_number' => 'VID-EMP-' . str_pad($hId, 4, '0', STR_PAD_LEFT),
                    'default_copay_percent' => 10,
                    'preauth_tat_hours' => 4,
                    'claim_settlement_days' => 30,
                ],
                [
                    'name' => 'Paramount Health Services & Insurance TPA',
                    'payer_type' => 'tpa',
                    'code' => 'PARAMOUNT_' . $hId,
                    'contact_person' => 'Vikram Mehta',
                    'contact_phone' => '+91-22-66620808',
                    'contact_email' => 'providerdesk@paramounttpa.com',
                    'portal_url' => 'https://paramounttpa.com/provider',
                    'empanelment_number' => 'PHS-' . str_pad($hId, 4, '0', STR_PAD_LEFT),
                    'default_copay_percent' => 15,
                    'preauth_tat_hours' => 3,
                    'claim_settlement_days' => 25,
                ],
                [
                    'name' => 'Star Health and Allied Insurance Co Ltd',
                    'payer_type' => 'insurance_company',
                    'code' => 'STAR_HLT_' . $hId,
                    'contact_person' => 'Anand Kumar',
                    'contact_phone' => '1800-425-2255',
                    'contact_email' => 'cashless@starhealth.in',
                    'portal_url' => 'https://starhealth.in/provider-portal',
                    'empanelment_number' => 'STAR-RO-' . str_pad($hId, 4, '0', STR_PAD_LEFT),
                    'default_copay_percent' => 0,
                    'preauth_tat_hours' => 2,
                    'claim_settlement_days' => 15,
                ],
                [
                    'name' => 'Ayushman Bharat — Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)',
                    'payer_type' => 'pmjay',
                    'code' => 'PMJAY_SHA_' . $hId,
                    'contact_person' => 'NHA State Health Agency Desk',
                    'contact_phone' => '14555',
                    'contact_email' => 'pmjay.helpdesk@nha.gov.in',
                    'portal_url' => 'https://tms.pmjay.gov.in',
                    'empanelment_number' => 'PMJAY-HOSP-' . str_pad($hId, 4, '0', STR_PAD_LEFT),
                    'default_copay_percent' => 0,
                    'preauth_tat_hours' => 6,
                    'claim_settlement_days' => 30,
                ],
                [
                    'name' => 'Central Government Health Scheme (CGHS)',
                    'payer_type' => 'cghs',
                    'code' => 'CGHS_DEL_' . $hId,
                    'contact_person' => 'Additional Director CGHS',
                    'contact_phone' => '1800-208-8900',
                    'contact_email' => 'cghs-desk@nic.in',
                    'portal_url' => 'https://cghs.nic.in',
                    'empanelment_number' => 'CGHS-EMP-' . str_pad($hId, 4, '0', STR_PAD_LEFT),
                    'default_copay_percent' => 0,
                    'preauth_tat_hours' => 12,
                    'claim_settlement_days' => 45,
                ],
                [
                    'name' => 'Employees State Insurance Corporation (ESIC)',
                    'payer_type' => 'esic',
                    'code' => 'ESIC_TIEUP_' . $hId,
                    'contact_person' => 'Tie-Up Hospital Cell',
                    'contact_phone' => '1800-112-526',
                    'contact_email' => 'tieup@esic.nic.in',
                    'portal_url' => 'https://esic.in/tieup',
                    'empanelment_number' => 'ESIC-TH-' . str_pad($hId, 4, '0', STR_PAD_LEFT),
                    'default_copay_percent' => 0,
                    'preauth_tat_hours' => 8,
                    'claim_settlement_days' => 40,
                ],
                [
                    'name' => 'Tata Consultancy Services (TCS) Employee Health Benefit',
                    'payer_type' => 'corporate',
                    'code' => 'TCS_CORP_' . $hId,
                    'contact_person' => 'HR Benefits Cell',
                    'contact_phone' => '+91-22-67789999',
                    'contact_email' => 'corporate.health@tcs.com',
                    'portal_url' => 'https://tcs.corporatebenefits.com',
                    'empanelment_number' => 'TCS-MED-' . str_pad($hId, 4, '0', STR_PAD_LEFT),
                    'default_copay_percent' => 0,
                    'preauth_tat_hours' => 2,
                    'claim_settlement_days' => 20,
                ],
            ];

            foreach ($payers as $p) {
                InsurancePayer::firstOrCreate(
                    ['hospital_id' => $hId, 'code' => $p['code']],
                    array_merge($p, ['hospital_id' => $hId, 'is_active' => true])
                );
            }

            // 2. Seed IRDAI Non-Payable Items
            $nonPayables = [
                ['item_name' => 'Surgical Disposable Gloves (Pairs)', 'category' => 'consumable', 'reason' => 'Excluded under IRDAI Annexure 1 Consumables'],
                ['item_name' => 'Examination Gloves', 'category' => 'consumable', 'reason' => 'Standard PPE consumable'],
                ['item_name' => 'N95 / 3-Ply Surgical Face Mask', 'category' => 'consumable', 'reason' => 'Non-reimbursable infection control supply'],
                ['item_name' => 'Disposable Syringes & Needles (Routine)', 'category' => 'consumable', 'reason' => 'Overhead nursing consumable'],
                ['item_name' => 'IV Cannula Fixator / Tegaderm', 'category' => 'consumable', 'reason' => 'Dressing / tape exclusion'],
                ['item_name' => 'Hand Sanitizer / Spirit Swabs', 'category' => 'consumable', 'reason' => 'Sanitation / disinfectant expense'],
                ['item_name' => 'Adult Diapers / Underpads', 'category' => 'toiletry', 'reason' => 'Personal hygiene item'],
                ['item_name' => 'Digital Thermometer', 'category' => 'consumable', 'reason' => 'Equipment non-payable'],
                ['item_name' => 'Admission / Registration Kit', 'category' => 'administrative', 'reason' => 'Administrative overhead'],
                ['item_name' => 'Patient Identification Band', 'category' => 'administrative', 'reason' => 'Administrative compliance supply'],
                ['item_name' => 'Special Diet / Attendant Meals', 'category' => 'diet', 'reason' => 'Attendant food not covered under IRDAI'],
                ['item_name' => 'Mineral Water Bottles', 'category' => 'diet', 'reason' => 'Food & beverage exclusion'],
                ['item_name' => 'Toothpaste / Toothbrush / Comb / Soap', 'category' => 'toiletry', 'reason' => 'Personal toiletry kit'],
                ['item_name' => 'Baby Wet Wipes', 'category' => 'toiletry', 'reason' => 'Hygiene exclusion'],
                ['item_name' => 'Medical Records Photocopy Charges', 'category' => 'administrative', 'reason' => 'Administrative paperwork charge'],
                ['item_name' => 'Cosmetic Skin Ointments (Non-therapeutic)', 'category' => 'cosmetic', 'reason' => 'Aesthetic care exclusion'],
                ['item_name' => 'Nebulizer Mask & Tubing Kit', 'category' => 'consumable', 'reason' => 'Personal disposable kit'],
                ['item_name' => 'Urine Bag & Foley Catheter Kit', 'category' => 'consumable', 'reason' => 'Consumable accessory'],
            ];

            foreach ($nonPayables as $np) {
                InsuranceNonpayableItem::firstOrCreate(
                    ['hospital_id' => $hId, 'item_name' => $np['item_name']],
                    array_merge($np, [
                        'hospital_id' => $hId,
                        'irdai_circular' => 'IRDAI/HLT/REG/CIR/193/07/2020',
                        'is_active' => true,
                    ])
                );
            }

            // 3. Seed PMJAY and Payer Tariffs
            $pmjayPayer = InsurancePayer::where('hospital_id', $hId)->where('payer_type', 'pmjay')->first();
            if ($pmjayPayer) {
                $pmjayTariffs = [
                    ['procedure_name' => 'Coronary Angiography (CAG)', 'hbp_code' => 'BM001A', 'category' => 'procedure', 'approved_rate' => 11000, 'max_los_days' => 1],
                    ['procedure_name' => 'PTCA with Drug Eluting Stent', 'hbp_code' => 'BM002B', 'category' => 'surgery', 'approved_rate' => 65000, 'max_los_days' => 3, 'requires_prior_approval' => true],
                    ['procedure_name' => 'Laparoscopic Cholecystectomy', 'hbp_code' => 'SG021C', 'category' => 'surgery', 'approved_rate' => 22000, 'max_los_days' => 2],
                    ['procedure_name' => 'Total Knee Replacement (Unilateral)', 'hbp_code' => 'OR014A', 'category' => 'surgery', 'approved_rate' => 80000, 'max_los_days' => 5, 'requires_prior_approval' => true],
                    ['procedure_name' => 'Caesarean Delivery (LSCS)', 'hbp_code' => 'OB003A', 'category' => 'surgery', 'approved_rate' => 14000, 'max_los_days' => 4],
                    ['procedure_name' => 'Appendectomy (Laparoscopic)', 'hbp_code' => 'SG012A', 'category' => 'surgery', 'approved_rate' => 18000, 'max_los_days' => 2],
                ];

                foreach ($pmjayTariffs as $t) {
                    InsuranceTariffPackage::firstOrCreate(
                        ['payer_id' => $pmjayPayer->id, 'procedure_name' => $t['procedure_name']],
                        array_merge($t, ['payer_id' => $pmjayPayer->id, 'is_active' => true])
                    );
                }
            }
        }
    }
}
