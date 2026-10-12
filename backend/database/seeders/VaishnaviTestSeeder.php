<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\GlobalTest;
use Illuminate\Database\Seeder;

class VaishnaviTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tests = [
            [
                'test_code' => 'TRUNAT_MTB',
                'name' => 'TrueNat MTB (True NAAT for MTB)',
                'category' => 'Microbiology',
                'description' => 'Real-time micro PCR test for the semi-quantitative detection and diagnosis of Mycobacterium tuberculosis.',
                'suggested_price' => 1200,
                'method' => 'Real Time PCR (Chip-based)',
                'sample_type' => 'Sputum / Body Fluids',
                'tat_hours' => 4,
                'default_parameters' => [
                    ['name' => 'MTB Detection', 'unit' => '', 'short_code' => 'TRUMTB', 'input_type' => 'selection', 'method' => 'TrueNat PCR', 'options' => ['Not Detected', 'Detected (Very Low)', 'Detected (Low)', 'Detected (Medium)', 'Detected (High)'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Not Detected', 'display_range' => 'Not Detected']]],
                    ['name' => 'Rifampicin Resistance', 'unit' => '', 'short_code' => 'TRURIF', 'input_type' => 'selection', 'method' => 'TrueNat PCR', 'options' => ['Not Applicable', 'Not Detected', 'Detected', 'Indeterminate'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Not Applicable', 'display_range' => 'N/A']]],
                ],
            ],
            [
                'test_code' => 'SKIN_LB',
                'name' => 'Skin Smear for Lepra Bacilli (LB)',
                'category' => 'Microbiology',
                'description' => 'Microscopic examination for Mycobacterium leprae.',
                'suggested_price' => 200,
                'method' => 'Ziehl-Neelsen Stain',
                'sample_type' => 'Skin Slit Smear',
                'tat_hours' => 24,
                'default_parameters' => [
                    ['name' => 'Bacteriological Index (BI)', 'unit' => '', 'short_code' => 'BI', 'input_type' => 'text', 'method' => 'Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
                    ['name' => 'Morphological Index (MI)', 'unit' => '%', 'short_code' => 'MI', 'input_type' => 'numeric', 'method' => 'Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '0', 'display_range' => '0']]],
                ],
            ],
            [
                'test_code' => 'SPUTUM_AFB',
                'name' => 'Sputum for AFB (Ziehl-Neelsen Stain)',
                'category' => 'Microbiology',
                'description' => 'Acid Fast Bacilli (AFB) smear examination on sputum sample.',
                'suggested_price' => 150,
                'method' => 'Ziehl-Neelsen Stain',
                'sample_type' => 'Sputum',
                'tat_hours' => 6,
                'default_parameters' => [
                    ['name' => 'AFB Smear Result', 'unit' => '', 'short_code' => 'SAFBS', 'input_type' => 'selection', 'method' => 'Z-N Stain', 'options' => ['Negative', 'Scanty', '1+', '2+', '3+'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
                ],
            ],
            [
                'test_code' => 'URINE_BS_BP',
                'name' => 'Bile Salts & Bile Pigments',
                'category' => 'Clinical Pathology',
                'description' => 'Qualitative detection of bile salts and bile pigments in urine.',
                'suggested_price' => 100,
                'method' => 'Hays / Fouchet Method',
                'sample_type' => 'Urine',
                'tat_hours' => 2,
                'default_parameters' => [
                    ['name' => 'Bile Salts', 'unit' => '', 'short_code' => 'BSALT', 'input_type' => 'selection', 'method' => 'Hays Surface Tension', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
                    ['name' => 'Bile Pigments', 'unit' => '', 'short_code' => 'BPIG', 'input_type' => 'selection', 'method' => 'Fouchet Test', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
                    ['name' => 'Urobilinogen', 'unit' => '', 'short_code' => 'UURO', 'input_type' => 'selection', 'method' => 'Ehrlich Reagent', 'options' => ['Normal', 'Increased'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Normal', 'display_range' => 'Normal']]],
                ],
            ],
            [
                'test_code' => 'TROP-T',
                'name' => 'Troponin T (Qualitative)',
                'category' => 'Biochemistry',
                'description' => 'Rapid qualitative detection of cardiac Troponin T.',
                'suggested_price' => 800,
                'method' => 'Rapid ICT',
                'sample_type' => 'Whole Blood / Serum',
                'tat_hours' => 1,
                'default_parameters' => [
                    ['name' => 'Troponin T', 'unit' => '', 'short_code' => 'TROPT', 'input_type' => 'selection', 'method' => 'Rapid ICT', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
                ],
            ],
            [
                'test_code' => 'OCC-BLD',
                'name' => 'Occult Blood (Stool)',
                'category' => 'Clinical Pathology',
                'description' => 'Detection of hidden blood in stool sample.',
                'suggested_price' => 150,
                'method' => 'Guaiac / Rapid ICT',
                'sample_type' => 'Stool',
                'tat_hours' => 2,
                'default_parameters' => [
                    ['name' => 'Occult Blood', 'unit' => '', 'short_code' => 'SOB', 'input_type' => 'selection', 'method' => 'Chemical / ICT', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
                ],
            ],
            [
                'test_code' => 'MP_CARD',
                'name' => 'Malaria Parasite Card (MP Card)',
                'category' => 'Serology & Immunology',
                'description' => 'Rapid card test for detection of Plasmodium falciparum and Plasmodium vivax.',
                'suggested_price' => 300,
                'method' => 'Rapid ICT',
                'sample_type' => 'Whole Blood',
                'tat_hours' => 1,
                'default_parameters' => [
                    ['name' => 'Malaria Parasite', 'unit' => '', 'short_code' => 'MPC', 'input_type' => 'selection', 'method' => 'Rapid ICT', 'options' => ['Negative', 'P. vivax Positive', 'P. falciparum Positive', 'Mixed Infection'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
                ],
            ],
            [
                'test_code' => 'TLC_DLC',
                'name' => 'TLC & DLC (TC & DC of WBC)',
                'category' => 'Haematology',
                'description' => 'Total Leucocyte Count and Differential Leucocyte Count.',
                'suggested_price' => 150,
                'method' => 'Microscopy / Automated',
                'sample_type' => 'EDTA Blood',
                'tat_hours' => 2,
                'default_parameters' => [
                    ['name' => 'Total Leucocyte Count (TLC)', 'unit' => 'cells/cumm', 'short_code' => 'TLC', 'input_type' => 'numeric', 'method' => 'Hemocytometer / Automated', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '4000', 'max_val' => '11000', 'display_range' => '4000 - 11000']]],
                    ['name' => 'Neutrophils', 'unit' => '%', 'short_code' => 'NEUT', 'input_type' => 'numeric', 'method' => 'Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '40', 'max_val' => '75', 'display_range' => '40 - 75']]],
                    ['name' => 'Lymphocytes', 'unit' => '%', 'short_code' => 'LYMP', 'input_type' => 'numeric', 'method' => 'Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '20', 'max_val' => '45', 'display_range' => '20 - 45']]],
                    ['name' => 'Eosinophils', 'unit' => '%', 'short_code' => 'EOSI', 'input_type' => 'numeric', 'method' => 'Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '01', 'max_val' => '06', 'display_range' => '01 - 06']]],
                    ['name' => 'Monocytes', 'unit' => '%', 'short_code' => 'MONO', 'input_type' => 'numeric', 'method' => 'Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '02', 'max_val' => '10', 'display_range' => '02 - 10']]],
                    ['name' => 'Basophils', 'unit' => '%', 'short_code' => 'BASO', 'input_type' => 'numeric', 'method' => 'Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '00', 'max_val' => '01', 'display_range' => '00 - 01']]],
                ],
            ],
            [
                'test_code' => 'MP_SLIDE',
                'name' => 'Malaria Parasite (Slide Method)',
                'category' => 'Haematology',
                'description' => 'Detection of Malaria Parasite (P. falciparum and P. vivax) using Thick and Thin peripheral blood smears.',
                'suggested_price' => 100,
                'method' => 'Microscopy (JSB/Leishman Stain)',
                'sample_type' => 'Whole Blood / Smear',
                'tat_hours' => 4,
                'default_parameters' => [
                    ['name' => 'MP Result', 'unit' => '', 'short_code' => 'MPS', 'input_type' => 'selection', 'method' => 'Microscopy', 'options' => ['Not Seen', 'P. vivax Seen', 'P. falciparum Seen', 'Mixed Infection Seen'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Not Seen', 'display_range' => 'Not Seen']]],
                ],
            ],
            [
                'test_code' => 'KALAZAR_K39',
                'name' => 'Card Test Kalazar (rk39)',
                'category' => 'Serology & Immunology',
                'description' => 'Rapid immunochromatographic test for the qualitative detection of antibodies to Leishmania donovani.',
                'suggested_price' => 500,
                'method' => 'Rapid ICT',
                'sample_type' => 'Serum / Whole Blood',
                'tat_hours' => 2,
                'default_parameters' => [
                    ['name' => 'rk39 Antibody', 'unit' => '', 'short_code' => 'K39', 'input_type' => 'selection', 'method' => 'Rapid ICT', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
                ],
            ],
            [
                'test_code' => 'TB_CARD',
                'name' => 'Card Test Koch\'s (TB Rapid Card)',
                'category' => 'Serology & Immunology',
                'description' => 'Qualitative detection of IgG, IgM & IgA antibodies to Mycobacterium tuberculosis in serum.',
                'suggested_price' => 400,
                'method' => 'Rapid ICT',
                'sample_type' => 'Serum',
                'tat_hours' => 2,
                'default_parameters' => [
                    ['name' => 'TB Antibody', 'unit' => '', 'short_code' => 'TBCARD', 'input_type' => 'selection', 'method' => 'Rapid ICT', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
                ],
            ],
            [
                'test_code' => 'TOXO_CARD',
                'name' => 'Card Test Toxoplasma (IgM/IgG)',
                'category' => 'Serology & Immunology',
                'description' => 'Rapid test for detection of Toxoplasma gondii antibodies.',
                'suggested_price' => 500,
                'method' => 'Rapid ICT',
                'sample_type' => 'Serum / Whole Blood',
                'tat_hours' => 2,
                'default_parameters' => [
                    ['name' => 'Toxo IgG', 'unit' => '', 'short_code' => 'TOXG_C', 'input_type' => 'selection', 'method' => 'Rapid ICT', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
                    ['name' => 'Toxo IgM', 'unit' => '', 'short_code' => 'TOXM_C', 'input_type' => 'selection', 'method' => 'Rapid ICT', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
                ],
            ],
        ];

        foreach ($tests as $test) {
            $department = Department::where('name', $test['category'])->first();

            GlobalTest::updateOrCreate(
                ['test_code' => $test['test_code']],
                [
                    'name' => $test['name'],
                    'category' => $test['category'],
                    'department_id' => $department?->id,
                    'description' => $test['description'],
                    'mrp' => $test['suggested_price'],
                    'method' => $test['method'],
                    'sample_type' => $test['sample_type'],
                    'tat_hours' => $test['tat_hours'],
                    'default_parameters' => $test['default_parameters'],
                    'is_active' => true,
                ]
            );
        }
    }
}
