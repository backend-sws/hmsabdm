<?php

// Additional Hormones & Endocrine Tests
return [
    [
        'test_code' => 'PTH',
        'name' => 'Parathyroid Hormone (iPTH)',
        'category' => 'Hormones',
        'description' => 'Intact PTH measurement. Regulates calcium and phosphorus. Essential for hyperparathyroidism diagnosis.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">PTH Interpretation with Calcium</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>PTH</th><th>Calcium</th><th>Diagnosis</th></tr></thead><tbody><tr><td><strong>High</strong></td><td>High</td><td>Primary Hyperparathyroidism (adenoma 85%)</td></tr><tr><td><strong>High</strong></td><td>Low/Normal</td><td>Secondary Hyperparathyroidism (CKD, Vit D deficiency)</td></tr><tr><td><strong>Low</strong></td><td>Low</td><td>Hypoparathyroidism (post-surgical, autoimmune)</td></tr><tr><td><strong>Low</strong></td><td>High</td><td>Non-PTH mediated hypercalcemia (Malignancy, PTHrP, Granulomas)</td></tr></tbody></table></div>',
        'suggested_price' => 1200,
        'method' => 'ECLIA (Electrochemiluminescence)',
        'sample_type' => 'EDTA Plasma',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'iPTH (Intact)', 'unit' => 'pg/mL', 'short_code' => 'PTH', 'input_type' => 'numeric', 'method' => 'ECLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '15', 'max_val' => '65', 'display_range' => '15 - 65']]],
        ],
    ],
    [
        'test_code' => 'DHEAS',
        'name' => 'DHEA-Sulfate',
        'category' => 'Hormones',
        'description' => 'Adrenal androgen marker. Elevated in adrenal hyperplasia and virilizing tumors.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">DHEA-S Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Low</strong></td><td>Adrenal insufficiency, Aging, Hypopituitarism</td></tr><tr><td><strong>Normal</strong></td><td>Normal adrenal function</td></tr><tr><td><strong>High (Females)</strong></td><td>PCOS, Congenital adrenal hyperplasia, Adrenal tumor (if very high &gt;700 µg/dL)</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> DHEA-S is age-dependent (peaks at 20-30 years, declines with age). Markedly elevated values (&gt;700 µg/dL) suggest adrenal tumor — imaging required.</div></div>',
        'suggested_price' => 800,
        'method' => 'CLIA (Chemiluminescence)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'DHEA-Sulfate', 'unit' => 'µg/dL', 'short_code' => 'DHEA', 'input_type' => 'numeric', 'method' => 'CLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 18, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '80', 'max_val' => '560', 'display_range' => '80 - 560'],
                ['gender' => 'Female', 'age_min' => 18, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '35', 'max_val' => '430', 'display_range' => '35 - 430'],
            ]],
        ],
    ],
    [
        'test_code' => '17OHP',
        'name' => '17-OH Progesterone',
        'category' => 'Hormones',
        'description' => 'Screening test for Congenital Adrenal Hyperplasia (CAH). Elevated in 21-hydroxylase deficiency.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">17-OHP Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (ng/mL)</th><th>Significance</th></tr></thead><tbody><tr><td><strong>&lt; 2.0</strong></td><td>Normal — CAH unlikely</td></tr><tr><td><strong>2.0 - 10.0</strong></td><td>Borderline — Late-onset (non-classic) CAH possible. ACTH stimulation test recommended.</td></tr><tr><td><strong>&gt; 10.0</strong></td><td>Elevated — Classic CAH likely (21-hydroxylase deficiency). Neonatal screening cutoff varies.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Sample in early morning (follicular phase in females). Part of newborn screening for CAH in many countries. ACTH-stimulated 17-OHP &gt;10 ng/mL confirms non-classic CAH.</div></div>',
        'suggested_price' => 900,
        'method' => 'CLIA (Chemiluminescence)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => '17-OH Progesterone', 'unit' => 'ng/mL', 'short_code' => '17HP', 'input_type' => 'numeric', 'method' => 'CLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.5', 'max_val' => '2.1', 'display_range' => '0.5 - 2.1'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.1', 'max_val' => '0.8', 'display_range' => '0.1 - 0.8 (Follicular)'],
            ]],
        ],
    ],
    [
        'test_code' => 'ALDO',
        'name' => 'Aldosterone (Serum)',
        'category' => 'Hormones',
        'description' => 'Mineralocorticoid hormone. Evaluates primary aldosteronism (Conn syndrome) and adrenal function.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Aldosterone Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Elevated Aldosterone + Low Renin</strong></td><td>Primary Aldosteronism (Conn syndrome) — Adrenal adenoma or bilateral hyperplasia. ARR &gt;30 is screening positive.</td></tr><tr><td><strong>Elevated Aldosterone + High Renin</strong></td><td>Secondary Aldosteronism — Renal artery stenosis, Heart failure, Cirrhosis, Nephrotic syndrome</td></tr><tr><td><strong>Low Aldosterone</strong></td><td>Addison disease, Hypoaldosteronism, ACE inhibitor therapy</td></tr></tbody></table></div>',
        'suggested_price' => 1500,
        'method' => 'CLIA (Chemiluminescence)',
        'sample_type' => 'Clotted Blood (Upright)',
        'tat_hours' => 48,
        'default_parameters' => [
            ['name' => 'Aldosterone (Upright)', 'unit' => 'ng/dL', 'short_code' => 'ALDO', 'input_type' => 'numeric', 'method' => 'CLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '7', 'max_val' => '30', 'display_range' => '7 - 30 (Upright)']]],
        ],
    ],
    [
        'test_code' => 'RENIN',
        'name' => 'Plasma Renin Activity (PRA)',
        'category' => 'Hormones',
        'description' => 'Measures renin activity. Used with aldosterone for ARR ratio in hypertension workup.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Renin Activity Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>PRA</th><th>Aldosterone</th><th>Condition</th></tr></thead><tbody><tr><td><strong>Low</strong></td><td>High</td><td>Primary Aldosteronism — ARR (Aldosterone/Renin Ratio) &gt; 30</td></tr><tr><td><strong>High</strong></td><td>High</td><td>Secondary Aldosteronism — Renal artery stenosis, Dehydration</td></tr><tr><td><strong>High</strong></td><td>Low</td><td>Bartter/Gitelman syndrome, Renin-secreting tumor</td></tr><tr><td><strong>Low</strong></td><td>Low</td><td>Liddle syndrome, DOC-producing tumor</td></tr></tbody></table></div>',
        'suggested_price' => 1500,
        'method' => 'CLIA (Chemiluminescence)',
        'sample_type' => 'EDTA Plasma (on ice)',
        'tat_hours' => 48,
        'default_parameters' => [
            ['name' => 'Plasma Renin Activity', 'unit' => 'ng/mL/hr', 'short_code' => 'PRA', 'input_type' => 'numeric', 'method' => 'CLIA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.5', 'max_val' => '3.5', 'display_range' => '0.5 - 3.5 (Upright)']]],
        ],
    ],
];
