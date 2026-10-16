<?php

// Additional Biochemistry Tests - Part 4: Procalcitonin, Ferritin, Acid Phosphatase, Aldolase, LDH Isoenzymes
return [
    [
        'test_code' => 'PCT',
        'name' => 'Procalcitonin',
        'category' => 'Biochemistry',
        'description' => 'Biomarker for bacterial sepsis. Helps differentiate bacterial from viral infections and guide antibiotic therapy.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Procalcitonin Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (ng/mL)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&lt; 0.1</strong></td><td>Bacterial infection very unlikely. Consider stopping antibiotics.</td></tr><tr><td><strong>0.1 - 0.5</strong></td><td>Possible local bacterial infection. Systemic infection unlikely.</td></tr><tr><td><strong>0.5 - 2.0</strong></td><td>Likely systemic bacterial infection (sepsis). Start antibiotics.</td></tr><tr><td><strong>2.0 - 10.0</strong></td><td>Severe sepsis. High probability of organ dysfunction.</td></tr><tr><td><strong>&gt; 10.0</strong></td><td>Septic shock. Very high mortality risk. Aggressive treatment needed.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> PCT-guided antibiotic stewardship reduces antibiotic duration by 2-3 days. Serial monitoring recommended for de-escalation.</div></div>',
        'suggested_price' => 1500,
        'method' => 'ECLIA (Electrochemiluminescence)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 4,
        'default_parameters' => [
            ['name' => 'Procalcitonin', 'unit' => 'ng/mL', 'short_code' => 'PCT', 'input_type' => 'numeric', 'method' => 'ECLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '0.1', 'display_range' => '< 0.1']]],
        ],
    ],
    [
        'test_code' => 'FERR-S',
        'name' => 'Serum Ferritin',
        'category' => 'Biochemistry',
        'description' => 'Iron storage protein. Best single test for iron deficiency. Also an acute phase reactant and inflammatory marker.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Serum Ferritin Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (ng/mL)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&lt; 12</strong></td><td>Iron deficiency confirmed (100% specific)</td></tr><tr><td><strong>12 - 30</strong></td><td>Probable iron deficiency (especially if TIBC is high)</td></tr><tr><td><strong>30 - 300 (M) / 30 - 150 (F)</strong></td><td>Normal range</td></tr><tr><td><strong>300 - 1000</strong></td><td>Elevated — Inflammation, Liver disease, Chronic disease, Hemochromatosis carrier</td></tr><tr><td><strong>&gt; 1000</strong></td><td>Markedly Elevated — Hemochromatosis, Hemophagocytic syndrome (HLH), Still disease, Transfusion overload</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> Ferritin is an acute phase reactant. Can be elevated despite iron deficiency during infection/inflammation. Check CRP alongside.</div></div>',
        'suggested_price' => 500,
        'method' => 'CLIA (Chemiluminescence Immunoassay)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'Serum Ferritin', 'unit' => 'ng/mL', 'short_code' => 'FERS', 'input_type' => 'numeric', 'method' => 'CLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '30', 'max_val' => '300', 'display_range' => '30 - 300'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '15', 'max_val' => '150', 'display_range' => '15 - 150'],
            ]],
        ],
    ],
    [
        'test_code' => 'ACP',
        'name' => 'Acid Phosphatase (Total & Prostatic)',
        'category' => 'Biochemistry',
        'description' => 'Enzyme elevated in prostate cancer (metastatic), Gaucher disease, and bone disease.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Acid Phosphatase Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Total ACP &lt; 6.5 U/L</strong></td><td>Normal</td></tr><tr><td><strong>Total ACP &gt; 6.5 U/L</strong></td><td>Elevated — Metastatic prostate cancer, Gaucher disease, Paget disease, Multiple myeloma</td></tr><tr><td><strong>Prostatic ACP &gt; 3.0 U/L</strong></td><td>Elevated — Prostate cancer (especially metastatic), BPH (mild elevation), Post-DRE (transient)</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Largely replaced by PSA for prostate cancer screening. Still useful for Gaucher disease monitoring (tartrate-resistant ACP).</div></div>',
        'suggested_price' => 400,
        'method' => 'PNPP with Tartrate Inhibition',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'Total Acid Phosphatase', 'unit' => 'U/L', 'short_code' => 'TACP', 'input_type' => 'numeric', 'method' => 'PNPP (Kinetic)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '6.5', 'display_range' => '0 - 6.5']]],
            ['name' => 'Prostatic Acid Phosphatase', 'unit' => 'U/L', 'short_code' => 'PACP', 'input_type' => 'numeric', 'method' => 'PNPP with Tartrate Inhibition', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '3.0', 'display_range' => '0 - 3.0']]],
        ],
    ],
    [
        'test_code' => 'FRUC',
        'name' => 'Fructosamine',
        'category' => 'Biochemistry',
        'description' => 'Glycated serum protein reflecting average glucose over 2-3 weeks. Alternative to HbA1c when hemoglobin variants are present.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Fructosamine Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (µmol/L)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>200 - 285</strong></td><td>Normal glycemic control (Non-diabetic)</td></tr><tr><td><strong>285 - 350</strong></td><td>Fairly controlled diabetes</td></tr><tr><td><strong>&gt; 350</strong></td><td>Poorly controlled diabetes</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Preferred over HbA1c in: Hemoglobinopathies, Recent blood transfusion, Hemolytic anemia, Pregnancy (rapid glucose changes). Affected by albumin levels.</div></div>',
        'suggested_price' => 500,
        'method' => 'NBT Reduction (Colorimetric)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'Fructosamine', 'unit' => 'µmol/L', 'short_code' => 'FRUC', 'input_type' => 'numeric', 'method' => 'NBT Reduction', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '200', 'max_val' => '285', 'display_range' => '200 - 285']]],
        ],
    ],
    [
        'test_code' => 'PANCE',
        'name' => 'Pancreatic Elastase (Fecal)',
        'category' => 'Biochemistry',
        'description' => 'Stool test for exocrine pancreatic insufficiency. Not affected by enzyme replacement therapy.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Fecal Elastase Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (µg/g stool)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&gt; 200</strong></td><td>Normal exocrine pancreatic function</td></tr><tr><td><strong>100 - 200</strong></td><td>Mild to Moderate pancreatic insufficiency</td></tr><tr><td><strong>&lt; 100</strong></td><td>Severe pancreatic exocrine insufficiency — Chronic pancreatitis, Cystic fibrosis, Pancreatic cancer</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Test remains valid during pancreatic enzyme replacement therapy (measures human elastase only). Watery stools may give falsely low values.</div></div>',
        'suggested_price' => 2000,
        'method' => 'ELISA (Monoclonal Antibody)',
        'sample_type' => 'Formed Stool',
        'tat_hours' => 48,
        'default_parameters' => [
            ['name' => 'Fecal Elastase', 'unit' => 'µg/g', 'short_code' => 'FELAS', 'input_type' => 'numeric', 'method' => 'ELISA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '200', 'max_val' => '999', 'display_range' => '> 200']]],
        ],
    ],
];
