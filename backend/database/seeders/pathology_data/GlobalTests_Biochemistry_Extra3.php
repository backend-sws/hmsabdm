<?php

// Additional Biochemistry Tests - Part 3: Myoglobin, Osmolality, Cholinesterase, ACE, 24hr Urine Protein
return [
    [
        'test_code' => 'MYO',
        'name' => 'Myoglobin',
        'category' => 'Biochemistry',
        'description' => 'Early marker of myocardial and skeletal muscle injury. Rises within 1-3 hours of MI.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Myoglobin Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&lt; 85 ng/mL</strong></td><td>Normal range</td></tr><tr><td><strong>85 - 500 ng/mL</strong></td><td>Elevated — Acute MI (early marker), Rhabdomyolysis, Muscular dystrophy, Strenuous exercise</td></tr><tr><td><strong>&gt; 500 ng/mL</strong></td><td>Markedly Elevated — Rhabdomyolysis (risk of AKI), Crush injury, Severe burns</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Myoglobin is NOT cardiac-specific. Peaks at 6-9 hours post-MI and returns to normal within 24 hours. Use with Troponin for complete cardiac workup.</div></div>',
        'suggested_price' => 800,
        'method' => 'CLIA (Chemiluminescence Immunoassay)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 4,
        'default_parameters' => [
            ['name' => 'Myoglobin', 'unit' => 'ng/mL', 'short_code' => 'MYO', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '85', 'display_range' => '< 85']]],
        ],
    ],
    [
        'test_code' => 'OSMO',
        'name' => 'Serum Osmolality',
        'category' => 'Biochemistry',
        'description' => 'Measures solute concentration in serum. Evaluates water balance, ADH disorders, and toxic ingestions.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Serum Osmolality Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (mOsm/kg)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&lt; 275</strong></td><td>Low — SIADH, Water intoxication, Psychogenic polydipsia</td></tr><tr><td><strong>275 - 295</strong></td><td>Normal range</td></tr><tr><td><strong>295 - 320</strong></td><td>Elevated — Dehydration, Diabetes insipidus, Hyperglycemia</td></tr><tr><td><strong>&gt; 320</strong></td><td>Critical — Hyperosmolar state, Methanol/Ethylene glycol poisoning (check Osmolar Gap)</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Osmolar Gap = Measured Osmolality - Calculated Osmolality. Gap &gt; 10 suggests presence of unmeasured osmoles (methanol, ethylene glycol, isopropanol).</div></div>',
        'suggested_price' => 500,
        'method' => 'Freezing Point Depression',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'Serum Osmolality', 'unit' => 'mOsm/kg', 'short_code' => 'OSMO', 'input_type' => 'numeric', 'method' => 'Freezing Point Depression', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '275', 'max_val' => '295', 'display_range' => '275 - 295']]],
        ],
    ],
    [
        'test_code' => 'CHOLES',
        'name' => 'Serum Cholinesterase (Pseudocholinesterase)',
        'category' => 'Biochemistry',
        'description' => 'Liver synthetic function marker. Low in organophosphate poisoning and liver failure.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Cholinesterase Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (U/L)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&lt; 1000</strong></td><td>Critical Low — Severe organophosphate/carbamate poisoning, Fulminant liver failure</td></tr><tr><td><strong>1000 - 3500</strong></td><td>Low — OP poisoning (moderate), Chronic liver disease, Malnutrition</td></tr><tr><td><strong>3500 - 8500</strong></td><td>Normal range</td></tr><tr><td><strong>&gt; 8500</strong></td><td>Elevated — Obesity, Nephrotic syndrome, Hyperthyroidism</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> Pre-operative assessment required — low levels increase risk of prolonged apnea with succinylcholine.</div></div>',
        'suggested_price' => 400,
        'method' => 'Butyrylthiocholine (Kinetic)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'Serum Cholinesterase', 'unit' => 'U/L', 'short_code' => 'CHE', 'input_type' => 'numeric', 'method' => 'Butyrylthiocholine (Kinetic)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '3500', 'max_val' => '8500', 'display_range' => '3500 - 8500']]],
        ],
    ],
    [
        'test_code' => 'SACE',
        'name' => 'Serum ACE (Angiotensin Converting Enzyme)',
        'category' => 'Biochemistry',
        'description' => 'Marker for Sarcoidosis. Produced by epithelioid cells of granulomas.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Serum ACE Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (U/L)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>8 - 52</strong></td><td>Normal range</td></tr><tr><td><strong>&gt; 52</strong></td><td>Elevated — Sarcoidosis (60% sensitivity), Gaucher disease, Hyperthyroidism, Leprosy, Silicosis</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> ACE levels correlate with granuloma burden. Useful for monitoring treatment response in sarcoidosis. ACE inhibitor therapy will lower levels.</div></div>',
        'suggested_price' => 1200,
        'method' => 'FAPGG Substrate (Kinetic)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 48,
        'default_parameters' => [
            ['name' => 'Serum ACE', 'unit' => 'U/L', 'short_code' => 'SACE', 'input_type' => 'numeric', 'method' => 'FAPGG (Kinetic)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '8', 'max_val' => '52', 'display_range' => '8 - 52']]],
        ],
    ],
    [
        'test_code' => 'UP24',
        'name' => '24-Hour Urine Protein',
        'category' => 'Biochemistry',
        'description' => 'Quantitative measurement of total protein excreted in urine over 24 hours. Gold standard for proteinuria assessment.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">24-Hour Urine Protein Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (mg/24hr)</th><th>Category</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&lt; 150</strong></td><td>Normal</td><td>Normal protein excretion</td></tr><tr><td><strong>150 - 500</strong></td><td>Mild Proteinuria</td><td>Tubular disease, Overflow proteinuria, UTI</td></tr><tr><td><strong>500 - 3500</strong></td><td>Moderate Proteinuria</td><td>Glomerulonephritis, Diabetic nephropathy, Hypertensive nephropathy</td></tr><tr><td><strong>&gt; 3500</strong></td><td>Nephrotic Range</td><td>Nephrotic syndrome — Minimal change disease, FSGS, Membranous nephropathy, Diabetic nephropathy</td></tr></tbody></table></div>',
        'suggested_price' => 300,
        'method' => 'Pyrogallol Red / Biuret',
        'sample_type' => '24-Hour Urine',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'Urine Volume (24hr)', 'unit' => 'mL', 'short_code' => 'UVOL', 'input_type' => 'numeric', 'method' => 'Measured', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '800', 'max_val' => '2000', 'display_range' => '800 - 2000']]],
            ['name' => 'Total Protein (24hr)', 'unit' => 'mg/24hr', 'short_code' => 'UP24', 'input_type' => 'numeric', 'method' => 'Pyrogallol Red', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '150', 'display_range' => '< 150']]],
        ],
    ],
];
