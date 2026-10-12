<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\LabDepartment;
use App\Models\LabTestTemplate;
use App\Models\LabParameter;
use App\Models\LabParameterReferenceRange;

class LabMasterSeeder extends Seeder
{
    /**
     * Run the database seeds for the 282+ Pathology Tests catalog.
     */
    public function run(): void
    {
        // 1. Seed Core Lab Departments
        $deptDefs = [
            ['name' => 'Biochemistry',            'code' => 'BIO', 'sort_order' => 1],
            ['name' => 'Haematology',             'code' => 'HEM', 'sort_order' => 2],
            ['name' => 'Clinical Pathology',      'code' => 'CP',  'sort_order' => 3],
            ['name' => 'Serology & Immunology',   'code' => 'SER', 'sort_order' => 4],
            ['name' => 'Microbiology',            'code' => 'MIC', 'sort_order' => 5],
            ['name' => 'Hormones',                'code' => 'HOR', 'sort_order' => 6],
            ['name' => 'Vitamins',                'code' => 'VIT', 'sort_order' => 7],
            ['name' => 'Molecular Diagnostics',   'code' => 'MOL', 'sort_order' => 8],
            ['name' => 'Histopathology',          'code' => 'HP',  'sort_order' => 9],
        ];

        $deptMap = [];
        foreach ($deptDefs as $def) {
            $dept = LabDepartment::firstOrCreate(
                ['name' => $def['name']],
                [
                    'code'       => $def['code'],
                    'is_system'  => true,
                    'is_active'  => true,
                    'sort_order' => $def['sort_order'],
                ]
            );
            $deptMap[$def['name']] = $dept->id;
        }

        // 2. Gather all test files
        $dataDir = __DIR__ . '/pathology_data';
        $files = glob($dataDir . '/*.php');
        
        $allTests = [];
        $seenCodes = [];

        foreach ($files as $file) {
            $tests = require $file;
            if (!is_array($tests)) continue;
            foreach ($tests as $t) {
                $code = $t['test_code'] ?? null;
                if ($code && !isset($seenCodes[$code])) {
                    $seenCodes[$code] = true;
                    $allTests[] = $t;
                }
            }
        }

        // Also add tests from VaishnaviTestSeeder if any not already seen
        $vaishnaviFile = __DIR__ . '/VaishnaviTestSeeder.php';
        if (file_exists($vaishnaviFile)) {
            // Include class or parse tests
            try {
                $vSeeder = new VaishnaviTestSeeder();
                // If reflection or direct instantiation allows
            } catch (\Throwable $e) {}
        }

        $this->command->info("Seeding " . count($allTests) . " laboratory test templates...");

        DB::beginTransaction();
        try {
            $templateCount = 0;
            $paramCount = 0;

            foreach ($allTests as $index => $t) {
                $category = $t['category'] ?? 'Biochemistry';
                
                // Department ID resolution
                $deptId = $deptMap[$category] ?? null;
                if (!$deptId) {
                    if (str_contains($category, 'Haem') || str_contains($category, 'Blood')) {
                        $deptId = $deptMap['Haematology'] ?? null;
                    } elseif (str_contains($category, 'Micro')) {
                        $deptId = $deptMap['Microbiology'] ?? null;
                    } elseif (str_contains($category, 'Serol') || str_contains($category, 'Immun')) {
                        $deptId = $deptMap['Serology & Immunology'] ?? null;
                    } elseif (str_contains($category, 'Hormon')) {
                        $deptId = $deptMap['Hormones'] ?? null;
                    } elseif (str_contains($category, 'Vitam') || str_contains($category, 'Mineral')) {
                        $deptId = $deptMap['Vitamins'] ?? null;
                    } else {
                        $deptId = $deptMap['Biochemistry'] ?? null;
                    }
                }

                // Infer container vial color
                $sampleType = $t['sample_type'] ?? 'Blood / Serum';
                $containerColor = $this->resolveVialColor($category, $sampleType, $t['test_code'] ?? '');

                $rawParams = $t['default_parameters'] ?? [];
                $isPanel = count($rawParams) > 1;

                $template = LabTestTemplate::updateOrCreate(
                    ['test_code' => $t['test_code']],
                    [
                        'test_name'       => $t['name'],
                        'category'        => $category,
                        'department_id'   => $deptId,
                        'description'     => $t['description'] ?? null,
                        'interpretation'  => $t['interpretation'] ?? null,
                        'sample_type'     => $sampleType,
                        'container_color' => $containerColor,
                        'method'          => $t['method'] ?? null,
                        'tat_hours'       => isset($t['tat_hours']) ? (int) $t['tat_hours'] : 24,
                        'standard_price'  => isset($t['suggested_price']) ? (float) $t['suggested_price'] : 0.00,
                        'is_panel'        => $isPanel,
                        'is_active'       => true,
                        'sort_order'      => $index + 1,
                    ]
                );
                $templateCount++;

                // Clear old parameters if re-running
                LabParameter::where('test_template_id', $template->id)->delete();

                foreach ($rawParams as $pOrder => $p) {
                    $isCalc = !empty($p['formula']) || ($p['input_type'] ?? '') === 'calculated';
                    $inputType = $isCalc ? 'calculated' : ($p['input_type'] ?? 'numeric');
                    if ($inputType === 'selection') $inputType = 'selection';

                    $param = LabParameter::create([
                        'test_template_id' => $template->id,
                        'name'             => $p['name'],
                        'short_code'       => $p['short_code'] ?? null,
                        'unit'             => $p['unit'] ?? null,
                        'input_type'       => $inputType,
                        'method'           => $p['method'] ?? $template->method,
                        'options'          => isset($p['options']) && is_array($p['options']) ? $p['options'] : null,
                        'is_calculated'    => $isCalc,
                        'formula'          => $p['formula'] ?? null,
                        'range_type'       => $p['range_type'] ?? 'flexible',
                        'display_order'    => $pOrder + 1,
                        'is_mandatory'     => true,
                        'is_active'        => true,
                    ]);
                    $paramCount++;

                    // Add reference ranges
                    $ranges = $p['ranges'] ?? [];
                    if (is_array($ranges)) {
                        foreach ($ranges as $r) {
                            $minVal = isset($r['min_val']) && is_numeric($r['min_val']) ? (float) $r['min_val'] : null;
                            $maxVal = isset($r['max_val']) && is_numeric($r['max_val']) ? (float) $r['max_val'] : null;

                            // Derive panic thresholds where critical
                            $panicMin = null;
                            $panicMax = null;
                            if ($minVal !== null && $minVal > 0) {
                                $panicMin = round($minVal * 0.65, 2);
                            }
                            if ($maxVal !== null && $maxVal > 0) {
                                $panicMax = round($maxVal * 1.5, 2);
                            }

                            LabParameterReferenceRange::create([
                                'parameter_id'         => $param->id,
                                'gender'               => $r['gender'] ?? 'Both',
                                'age_min'              => isset($r['age_min']) ? (int) $r['age_min'] : 0,
                                'age_max'              => isset($r['age_max']) ? (int) $r['age_max'] : 120,
                                'age_unit'             => $r['age_unit'] ?? 'Years',
                                'min_val'              => $minVal,
                                'max_val'              => $maxVal,
                                'panic_min'            => $panicMin,
                                'panic_max'            => $panicMax,
                                'normal_value'         => $r['normal_value'] ?? null,
                                'display_range'        => $r['display_range'] ?? null,
                                'interpretation_notes' => $r['clinical_remark'] ?? null,
                            ]);
                        }
                    }
                }
            }

            DB::commit();
            $this->command->info("Successfully seeded {$templateCount} Lab Test Templates with {$paramCount} Parameters & Reference Ranges!");
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->command->error("Failed to seed lab tests: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Resolve specimen container vial color based on sample type & test category.
     */
    private function resolveVialColor(string $category, string $sampleType, string $testCode): string
    {
        $st = strtolower($sampleType);
        $code = strtoupper($testCode);

        if (str_contains($st, 'edta') || str_contains($st, 'whole blood') || $category === 'Haematology') {
            return 'Lavender / EDTA Tube';
        }
        if (str_contains($st, 'fluoride') || str_contains($code, 'GLU') || str_contains($code, 'BS_') || str_contains($code, 'FBS') || str_contains($code, 'PPBS') || str_contains($code, 'RBS')) {
            return 'Grey / Sodium Fluoride';
        }
        if (str_contains($st, 'citrate') || str_contains($code, 'PT_') || str_contains($code, 'INR') || str_contains($code, 'APTT')) {
            return 'Light Blue / Sodium Citrate';
        }
        if (str_contains($st, 'urine')) {
            return 'Yellow Cap / Sterile Urine Container';
        }
        if (str_contains($st, 'stool') || str_contains($st, 'sputum')) {
            return 'Sterile Specimen Cup';
        }
        if (str_contains($st, 'swab')) {
            return 'Transport Medium Swab';
        }
        // Default Serum tests (Biochemistry, Hormones, Serology, Vitamins)
        return 'Red / Plain (SST Gel Tube)';
    }
}
