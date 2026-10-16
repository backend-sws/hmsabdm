<?php

// Additional Haematology Tests - Part 2
return [
    [
        'test_code' => 'HB-VAR',
        'name' => 'Hemoglobin Variant Analysis (HbS Solubility)',
        'category' => 'Haematology',
        'description' => 'Solubility test for HbS. Rapid screening for sickle hemoglobin.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">HbS Solubility Test</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Significance</th></tr></thead><tbody><tr><td><strong>Negative (Clear)</strong></td><td>HbS absent — Sickle cell disease/trait unlikely</td></tr><tr><td><strong>Positive (Turbid)</strong></td><td>HbS present — Cannot differentiate trait from disease. Confirm with Hb Electrophoresis (HPLC).</td></tr></tbody></table></div>',
        'suggested_price' => 200,
        'method' => 'Dithionite Tube Solubility Test',
        'sample_type' => 'EDTA Blood',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'HbS Solubility', 'unit' => '', 'short_code' => 'HBSS', 'input_type' => 'selection', 'method' => 'Dithionite Solubility', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
    [
        'test_code' => 'OSMF',
        'name' => 'Osmotic Fragility Test',
        'category' => 'Haematology',
        'description' => 'Measures RBC resistance to osmotic lysis. Diagnostic for Hereditary Spherocytosis.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Osmotic Fragility Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Pattern</th><th>Significance</th></tr></thead><tbody><tr><td><strong>Increased Fragility (Left shift)</strong></td><td>Hereditary Spherocytosis, Autoimmune hemolytic anemia, Burns</td></tr><tr><td><strong>Normal</strong></td><td>Normal RBC membrane</td></tr><tr><td><strong>Decreased Fragility (Right shift)</strong></td><td>Thalassemia, Iron deficiency, Liver disease, Sickle cell disease</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Incubated osmotic fragility (24hr at 37°C) increases sensitivity for mild Hereditary Spherocytosis. AGLT (Acidified Glycerol Lysis Time) is a simpler alternative.</div></div>',
        'suggested_price' => 400,
        'method' => 'Spectrophotometric (NaCl Dilutions)',
        'sample_type' => 'Heparinized Blood',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'Osmotic Fragility', 'unit' => '', 'short_code' => 'OSMF', 'input_type' => 'text', 'method' => 'Spectrophotometric', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Normal', 'display_range' => 'Normal']]],
            ['name' => 'MCF (Median Corpuscular Fragility)', 'unit' => '% NaCl', 'short_code' => 'MCF', 'input_type' => 'numeric', 'method' => 'Spectrophotometric', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.40', 'max_val' => '0.45', 'display_range' => '0.40 - 0.45']]],
        ],
    ],
    [
        'test_code' => 'PDW',
        'name' => 'Platelet Distribution Width (PDW)',
        'category' => 'Haematology',
        'description' => 'Measures variation in platelet size. Reflects thrombopoiesis and platelet activation.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">PDW Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level</th><th>Significance</th></tr></thead><tbody><tr><td><strong>Low PDW</strong></td><td>Uniform platelet population, Reactive thrombocytosis</td></tr><tr><td><strong>Normal (10 - 17.9%)</strong></td><td>Normal platelet size variation</td></tr><tr><td><strong>High PDW</strong></td><td>Anisocytosis of platelets — ITP, Myeloproliferative disorders, Sepsis, DIC, Megaloblastic anemia</td></tr></tbody></table></div>',
        'suggested_price' => 100,
        'method' => 'Automated Hematology Analyzer',
        'sample_type' => 'EDTA Blood',
        'tat_hours' => 4,
        'default_parameters' => [
            ['name' => 'PDW', 'unit' => '%', 'short_code' => 'PDW', 'input_type' => 'numeric', 'method' => 'Electrical Impedance', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '10', 'max_val' => '17.9', 'display_range' => '10 - 17.9']]],
        ],
    ],
    [
        'test_code' => 'PCT-HM',
        'name' => 'Plateletcrit (PCT)',
        'category' => 'Haematology',
        'description' => 'Platelet equivalent of hematocrit. Represents percentage of blood volume occupied by platelets.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Plateletcrit Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (%)</th><th>Significance</th></tr></thead><tbody><tr><td><strong>&lt; 0.10</strong></td><td>Low — Thrombocytopenia, Bone marrow failure</td></tr><tr><td><strong>0.10 - 0.35</strong></td><td>Normal range</td></tr><tr><td><strong>&gt; 0.35</strong></td><td>Elevated — Reactive thrombocytosis, Myeloproliferative disorders</td></tr></tbody></table></div>',
        'suggested_price' => 100,
        'method' => 'Automated Hematology Analyzer',
        'sample_type' => 'EDTA Blood',
        'tat_hours' => 4,
        'default_parameters' => [
            ['name' => 'Plateletcrit', 'unit' => '%', 'short_code' => 'PCTH', 'input_type' => 'numeric', 'method' => 'Automated', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.10', 'max_val' => '0.35', 'display_range' => '0.10 - 0.35']]],
        ],
    ],
    [
        'test_code' => 'LE-CELL',
        'name' => 'LE Cell Preparation',
        'category' => 'Haematology',
        'description' => 'Detects LE cells (neutrophils that have phagocytosed nuclear material). Historical test for SLE.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">LE Cell Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Significance</th></tr></thead><tbody><tr><td><strong>Negative</strong></td><td>No LE cells seen. Does not exclude SLE.</td></tr><tr><td><strong>Positive</strong></td><td>LE cells present — Suggestive of SLE. Also seen in: Drug-induced lupus, RA, Scleroderma. Now largely replaced by ANA and Anti-dsDNA.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Sensitivity ~50-75% for SLE. ANA (sensitivity 95%) is preferred screening test. LE cell test still requested in some resource-limited settings.</div></div>',
        'suggested_price' => 200,
        'method' => 'Manual Preparation & Microscopy',
        'sample_type' => 'Heparinized Blood',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'LE Cell', 'unit' => '', 'short_code' => 'LECL', 'input_type' => 'selection', 'method' => 'Manual Microscopy', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
];
