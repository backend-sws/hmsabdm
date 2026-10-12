<?php

// Additional Biochemistry Tests - Part 5: Glycated Albumin, Serum Lithium, Blood Alcohol, Sweat Chloride, Urine Osmolality, HbF Quantitative
return [
    [
        'test_code' => 'GLYCALB',
        'name' => 'Glycated Albumin',
        'category' => 'Biochemistry',
        'description' => 'Reflects glycemic control over 2-3 weeks. Useful when HbA1c is unreliable.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Glycated Albumin Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (%)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>11 - 16%</strong></td><td>Normal glycemic status</td></tr><tr><td><strong>16 - 20%</strong></td><td>Fair glycemic control</td></tr><tr><td><strong>&gt; 20%</strong></td><td>Poor glycemic control</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Preferred in CKD on dialysis, hemoglobinopathies, pregnancy, and post-transfusion patients where HbA1c is unreliable.</div></div>',
        'suggested_price' => 1200,
        'method' => 'Enzymatic (Ketoamine Oxidase)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'Glycated Albumin', 'unit' => '%', 'short_code' => 'GALB', 'input_type' => 'numeric', 'method' => 'Enzymatic', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '11', 'max_val' => '16', 'display_range' => '11 - 16']]],
        ],
    ],
    [
        'test_code' => 'LITH',
        'name' => 'Serum Lithium',
        'category' => 'Biochemistry',
        'description' => 'Therapeutic drug monitoring for lithium therapy in bipolar disorder.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Serum Lithium Monitoring</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (mEq/L)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>0.6 - 1.2</strong></td><td>Therapeutic range — Optimal for bipolar disorder maintenance</td></tr><tr><td><strong>1.2 - 1.5</strong></td><td>Borderline toxic — Nausea, Tremor, Diarrhea. Dose adjustment needed.</td></tr><tr><td><strong>1.5 - 2.5</strong></td><td>Moderate toxicity — Confusion, Ataxia, Dysarthria, Fasciculations</td></tr><tr><td><strong>&gt; 2.5</strong></td><td>Severe toxicity — Seizures, Renal failure, Cardiac arrhythmia. Dialysis may be needed.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> Draw trough sample 12 hours post-dose. Narrow therapeutic index. Monitor renal function and thyroid regularly.</div></div>',
        'suggested_price' => 400,
        'method' => 'ISE (Ion Selective Electrode)',
        'sample_type' => 'Clotted Blood (Trough)',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'Serum Lithium', 'unit' => 'mEq/L', 'short_code' => 'LI', 'input_type' => 'numeric', 'method' => 'ISE', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.6', 'max_val' => '1.2', 'display_range' => '0.6 - 1.2 (Therapeutic)']]],
        ],
    ],
    [
        'test_code' => 'BALC',
        'name' => 'Blood Alcohol Level (Ethanol)',
        'category' => 'Biochemistry',
        'description' => 'Quantitative measurement of ethanol in blood. Medicolegal and clinical assessment.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Blood Alcohol Level Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (mg/dL)</th><th>Clinical Effects</th></tr></thead><tbody><tr><td><strong>&lt; 10</strong></td><td>Normal / Not intoxicated</td></tr><tr><td><strong>10 - 50</strong></td><td>Mild euphoria, Relaxation, Reduced inhibition</td></tr><tr><td><strong>50 - 100</strong></td><td>Impaired judgment, Reduced coordination. Legal limit in most jurisdictions: 80 mg/dL.</td></tr><tr><td><strong>100 - 300</strong></td><td>Significant intoxication — Slurred speech, Ataxia, Nausea, Blurred vision</td></tr><tr><td><strong>&gt; 300</strong></td><td>Life-threatening — Respiratory depression, Coma, Death possible</td></tr></tbody></table></div>',
        'suggested_price' => 500,
        'method' => 'Enzymatic (Alcohol Dehydrogenase)',
        'sample_type' => 'Fluoride Oxalate Blood',
        'tat_hours' => 4,
        'default_parameters' => [
            ['name' => 'Blood Alcohol (Ethanol)', 'unit' => 'mg/dL', 'short_code' => 'ETOH', 'input_type' => 'numeric', 'method' => 'Alcohol Dehydrogenase (Enzymatic)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '10', 'display_range' => '< 10']]],
        ],
    ],
    [
        'test_code' => 'SWCL',
        'name' => 'Sweat Chloride Test',
        'category' => 'Biochemistry',
        'description' => 'Gold standard diagnostic test for Cystic Fibrosis. Pilocarpine iontophoresis method.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Sweat Chloride Test Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (mmol/L)</th><th>Classification</th></tr></thead><tbody><tr><td><strong>&lt; 30</strong></td><td>Normal — CF unlikely</td></tr><tr><td><strong>30 - 59</strong></td><td>Borderline / Intermediate — Repeat testing recommended. Consider CFTR genetic testing.</td></tr><tr><td><strong>≥ 60</strong></td><td>Positive — Consistent with Cystic Fibrosis diagnosis. Confirm with CFTR mutation analysis.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> Minimum sweat weight of 75mg required. False positives: Adrenal insufficiency, Ectodermal dysplasia, Hypothyroidism. Two positive tests needed for diagnosis.</div></div>',
        'suggested_price' => 1500,
        'method' => 'Pilocarpine Iontophoresis (Gibson-Cooke)',
        'sample_type' => 'Sweat',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'Sweat Chloride', 'unit' => 'mmol/L', 'short_code' => 'SWCL', 'input_type' => 'numeric', 'method' => 'Pilocarpine Iontophoresis', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '29', 'display_range' => '< 30']]],
        ],
    ],
    [
        'test_code' => 'UOSMO',
        'name' => 'Urine Osmolality',
        'category' => 'Biochemistry',
        'description' => 'Measures urine concentration. Essential for DI diagnosis and SIADH evaluation.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Urine Osmolality Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (mOsm/kg)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&lt; 100</strong></td><td>Maximally dilute — Diabetes Insipidus, Water intoxication, Psychogenic polydipsia</td></tr><tr><td><strong>300 - 900</strong></td><td>Normal range (random sample)</td></tr><tr><td><strong>&gt; 800 (after water deprivation)</strong></td><td>Normal concentrating ability — Rules out Diabetes Insipidus</td></tr><tr><td><strong>&gt; 100 with hyponatremia</strong></td><td>Inappropriately concentrated — SIADH</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Compare with serum osmolality. Urine/Serum Osm ratio helps differentiate renal vs pre-renal causes of AKI (ratio &gt;1.5 = pre-renal).</div></div>',
        'suggested_price' => 400,
        'method' => 'Freezing Point Depression',
        'sample_type' => 'Random / Timed Urine',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'Urine Osmolality', 'unit' => 'mOsm/kg', 'short_code' => 'UOSM', 'input_type' => 'numeric', 'method' => 'Freezing Point Depression', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '300', 'max_val' => '900', 'display_range' => '300 - 900']]],
        ],
    ],
];
