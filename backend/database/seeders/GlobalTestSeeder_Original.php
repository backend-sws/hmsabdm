<?php

namespace Database\Seeders;

use App\Models\GlobalTest;
use Illuminate\Database\Seeder;

class GlobalTestSeeder extends Seeder
{
    public function run(): void
    {
        $dataFiles = [
            // Core Tests
            'GlobalTests_Haematology',
            'GlobalTests_Biochemistry',
            'GlobalTests_Thyroid_Diabetes',
            'GlobalTests_Liver_Kidney',
            'GlobalTests_Lipid_Cardiac',
            'GlobalTests_Serology_Urine',
            'GlobalTests_Vitamins_Minerals',
            'GlobalTests_TumorMarkers_Hormones',
            'GlobalTests_Special',
            // Extended Haematology
            'GlobalTests_Haematology_Extra',
            // Extended Biochemistry (Electrolytes, ABG, Cardiac, Iron, Special Chemistry)
            'GlobalTests_Biochemistry_Extra',
            'GlobalTests_Biochemistry_Extra2',
            'GlobalTests_Biochemistry_Extra3',
            'GlobalTests_Biochemistry_Extra4',
            'GlobalTests_Biochemistry_Extra5',
            // Clinical Microbiology & Pathology (Cultures, AFB, Stains, Body Fluids)
            'GlobalTests_Clinical_Micro',
            'GlobalTests_Clinical_Micro2',
            'GlobalTests_Clinical_Micro3',
            'GlobalTests_Clinical_Micro4',
            'GlobalTests_Clinical_Micro5',
            // Extended Serology & Immunology
            'GlobalTests_Serology_Extra',
            'GlobalTests_Serology_Extra2',
            // Extended Hormones & Tumor Markers
            'GlobalTests_Hormones_Extra',
            'GlobalTests_Hormones_Extra2',
            // Extended Haematology Part 2
            'GlobalTests_Haematology_Extra2',
            // Extended Special & Molecular
            'GlobalTests_Special_Extra',
            // Extended Biochemistry Part 6-8
            'GlobalTests_Biochemistry_Extra6',
            'GlobalTests_Biochemistry_Extra7',
            'GlobalTests_Biochemistry_Extra8',
            // Extended Clinical Pathology
            'GlobalTests_Clinical_Path_Extra',
            'GlobalTests_Clinical_Path_Extra2',
            // Extended Serology Part 3-4
            'GlobalTests_Serology_Extra3',
            'GlobalTests_Serology_Extra4',
            // Extended Hormones Part 3
            'GlobalTests_Hormones_Extra3',
            // Extended Haematology Part 3
            'GlobalTests_Haematology_Extra3',
            // Extended Molecular & Special Part 2
            'GlobalTests_Special_Extra2',
            // Extended Vitamins & Minerals
            'GlobalTests_Vitamins_Extra',
            // Extended Panels & Profiles
            'GlobalTests_Panels_Extra',
            'GlobalTests_Panels_Extra2',
        ];

        foreach ($dataFiles as $file) {
            $tests = require database_path("seeders/data/{$file}.php");
            foreach ($tests as $test) {
                // Find system department
                $department = \App\Models\Department::where('name', $test['category'] ?? 'Other')
                    ->where('is_system', true)
                    ->first();

                GlobalTest::updateOrCreate(
                    ['test_code' => $test['test_code']],
                    [
                        'name' => $test['name'],
                        'category' => $test['category'] ?? 'Other',
                        'department_id' => $department?->id,
                        'description' => $test['description'] ?? null,
                        'interpretation' => $test['interpretation'] ?? null,
                        'mrp' => $test['suggested_price'] ?? 0,
                        'method' => $test['method'] ?? null,
                        'sample_type' => $test['sample_type'] ?? null,
                        'tat_hours' => $test['tat_hours'] ?? 24,
                        'default_parameters' => $test['default_parameters'] ?? [],
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
