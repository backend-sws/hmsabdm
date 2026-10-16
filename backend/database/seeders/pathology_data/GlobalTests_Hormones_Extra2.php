<?php

// Additional Hormones Tests - Part 2: Growth Hormone, IGF-1, Insulin-like, Anti-Thyroid Antibodies, Free Testosterone
return [
    [
        'test_code' => 'GH',
        'name' => 'Growth Hormone (GH)',
        'category' => 'Hormones',
        'description' => 'Pituitary hormone regulating growth. Screening for acromegaly and growth hormone deficiency.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Growth Hormone Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (ng/mL)</th><th>Significance</th></tr></thead><tbody><tr><td><strong>&lt; 0.4 (Basal)</strong></td><td>Normal basal level. GH is pulsatile — single value may not reflect status.</td></tr><tr><td><strong>&gt; 10 (Random)</strong></td><td>Elevated — Acromegaly suspected. Confirm with OGTT suppression test and IGF-1.</td></tr><tr><td><strong>Not suppressed after OGTT</strong></td><td>GH &gt; 1.0 after 75g glucose = Acromegaly confirmed</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Single random GH is unreliable due to pulsatile secretion. IGF-1 is preferred screening test. Stimulation tests (ITT, Glucagon) for GH deficiency diagnosis.</div></div>',
        'suggested_price' => 800,
        'method' => 'CLIA (Chemiluminescence)',
        'sample_type' => 'Clotted Blood (Fasting)',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'Growth Hormone', 'unit' => 'ng/mL', 'short_code' => 'GH', 'input_type' => 'numeric', 'method' => 'CLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '10', 'display_range' => '0 - 10']]],
        ],
    ],
    [
        'test_code' => 'IGF1',
        'name' => 'IGF-1 (Insulin-like Growth Factor 1)',
        'category' => 'Hormones',
        'description' => 'Mediates GH effects. Stable throughout day. Best screening test for acromegaly and GH deficiency.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">IGF-1 Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Low for age</strong></td><td>GH deficiency, Malnutrition, Hypothyroidism, Liver disease, Diabetes (poorly controlled)</td></tr><tr><td><strong>Normal for age</strong></td><td>Normal GH axis (acromegaly unlikely)</td></tr><tr><td><strong>High for age</strong></td><td>Acromegaly/Gigantism, Pregnancy. Confirm with GH suppression test (OGTT).</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Age and sex-specific reference ranges essential. IGF-1 declines with age. Reflects integrated GH secretion over 24 hours.</div></div>',
        'suggested_price' => 1500,
        'method' => 'CLIA (Chemiluminescence)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 48,
        'default_parameters' => [
            ['name' => 'IGF-1', 'unit' => 'ng/mL', 'short_code' => 'IGF1', 'input_type' => 'numeric', 'method' => 'CLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 18, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '100', 'max_val' => '350', 'display_range' => '100 - 350 (Age dependent)']]],
        ],
    ],
    [
        'test_code' => 'ATPO',
        'name' => 'Anti-TPO (Thyroid Peroxidase Antibody)',
        'category' => 'Hormones',
        'description' => 'Autoantibody against thyroid peroxidase. Primary marker for Hashimoto thyroiditis.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Anti-TPO Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (IU/mL)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&lt; 34</strong></td><td>Negative — Autoimmune thyroid disease unlikely</td></tr><tr><td><strong>34 - 100</strong></td><td>Borderline — Low-level positivity. Monitor thyroid function annually.</td></tr><tr><td><strong>&gt; 100</strong></td><td>Positive — Hashimoto thyroiditis (90%), Graves disease (70%), Postpartum thyroiditis. Risk of progression to overt hypothyroidism.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Anti-TPO positive patients with subclinical hypothyroidism have higher risk of progression to overt hypothyroidism (4.3% per year).</div></div>',
        'suggested_price' => 600,
        'method' => 'CLIA (Chemiluminescence)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'Anti-TPO', 'unit' => 'IU/mL', 'short_code' => 'ATPO', 'input_type' => 'numeric', 'method' => 'CLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '34', 'display_range' => '< 34']]],
        ],
    ],
    [
        'test_code' => 'ATGAB',
        'name' => 'Anti-Thyroglobulin Antibody',
        'category' => 'Hormones',
        'description' => 'Autoantibody against thyroglobulin. Used in thyroid cancer follow-up and autoimmune thyroid assessment.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Anti-Thyroglobulin Antibody</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (IU/mL)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&lt; 115</strong></td><td>Negative</td></tr><tr><td><strong>&gt; 115</strong></td><td>Positive — Hashimoto thyroiditis (80%), Graves disease (50-70%). In thyroid cancer: Interferes with thyroglobulin measurement — makes Tg unreliable as tumor marker.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> Must be measured alongside Thyroglobulin in post-thyroidectomy cancer monitoring. Positive Anti-Tg makes Tg levels unreliable.</div></div>',
        'suggested_price' => 600,
        'method' => 'CLIA (Chemiluminescence)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'Anti-Thyroglobulin Ab', 'unit' => 'IU/mL', 'short_code' => 'ATGB', 'input_type' => 'numeric', 'method' => 'CLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '115', 'display_range' => '< 115']]],
        ],
    ],
    [
        'test_code' => 'FREE-T',
        'name' => 'Free Testosterone',
        'category' => 'Hormones',
        'description' => 'Unbound bioactive testosterone. More accurate than total testosterone in certain conditions.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Free Testosterone Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level</th><th>Males</th><th>Females</th></tr></thead><tbody><tr><td><strong>Low</strong></td><td>Hypogonadism, Aging (andropause), Obesity, Chronic illness</td><td>Normal / Adrenal insufficiency</td></tr><tr><td><strong>Normal</strong></td><td>5.0 - 21.0 pg/mL</td><td>0.3 - 1.9 pg/mL</td></tr><tr><td><strong>High</strong></td><td>Androgen-secreting tumors, Exogenous use</td><td>PCOS, Hirsutism, CAH, Virilizing tumors</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Free testosterone is preferred over total in obesity (SHBG is low) and aging. Calculated free testosterone (Vermeulen equation) using total T, SHBG, and albumin is also acceptable.</div></div>',
        'suggested_price' => 1200,
        'method' => 'Equilibrium Dialysis / Calculated',
        'sample_type' => 'Clotted Blood (Morning)',
        'tat_hours' => 48,
        'default_parameters' => [
            ['name' => 'Free Testosterone', 'unit' => 'pg/mL', 'short_code' => 'FRET', 'input_type' => 'numeric', 'method' => 'Equilibrium Dialysis / CLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '5.0', 'max_val' => '21.0', 'display_range' => '5.0 - 21.0'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.3', 'max_val' => '1.9', 'display_range' => '0.3 - 1.9'],
            ]],
        ],
    ],
];
