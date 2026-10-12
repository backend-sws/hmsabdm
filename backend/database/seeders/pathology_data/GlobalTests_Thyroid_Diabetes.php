<?php

// Thyroid & Diabetes Tests
return [
    [
        'test_code' => 'TFT',
        'name' => 'Thyroid Function Test (T3, T4, TSH)',
        'category' => 'Biochemistry',
        'description' => 'Complete thyroid profile. Early morning sample preferred.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-primary mb-3">Thyroid Profile (T3, T4, TSH) Clinical Matrix</h6>
    <div class="table-responsive">
        <table class="table table-bordered table-sm fs-11">
            <thead class="bg-light"><tr><th>Pattern</th><th>TSH</th><th>T3/T4</th><th>Diagnostic Consideration</th></tr></thead>
            <tbody>
                <tr><td><strong>Primary Hypothyroid</strong></td><td>High</td><td>Low</td><td>Hashimoto Thyroiditis, Iodine Deficiency.</td></tr>
                <tr><td><strong>Primary Hyperthyroid</strong></td><td>Low</td><td>High</td><td>Graves Disease, Toxic Multinodular Goiter.</td></tr>
                <tr><td><strong>Subclinical Hypothyroid</strong></td><td>High</td><td>Normal</td><td>Early thyroid failure, monitor for symptoms.</td></tr>
                <tr><td><strong>Subclinical Hyperthyroid</strong></td><td>Low</td><td>Normal</td><td>Early thyroid excess, risk of arrhythmias.</td></tr>
            </tbody>
        </table>
    </div>
    <div class="alert alert-soft-secondary py-2 px-3 fs-10 mt-2">TSH is the most sensitive screening test for thyroid dysfunction.</div>
</div>',
        'suggested_price' => 500,
        'default_parameters' => [
            [
                'name' => 'Total T3', 'unit' => 'ng/dL', 'short_code' => 'T3', 'input_type' => 'numeric',
                'method' => 'CLIA (Chemiluminescence Immunoassay)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '60', 'max_val' => '200', 'display_range' => '60 - 200']],
            ],
            [
                'name' => 'Total T4', 'unit' => 'µg/dL', 'short_code' => 'T4', 'input_type' => 'numeric',
                'method' => 'CLIA (Chemiluminescence Immunoassay)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '4.5', 'max_val' => '12.5', 'display_range' => '4.5 - 12.5']],
            ],
            [
                'name' => 'TSH', 'unit' => 'µIU/mL', 'short_code' => 'TSH', 'input_type' => 'numeric',
                'method' => 'CLIA (Chemiluminescence Immunoassay)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.3', 'max_val' => '5.5', 'display_range' => '0.3 - 5.5']],
            ],
        ],
    ],
    [
        'test_code' => 'FT3',
        'name' => 'Free T3',
        'category' => 'Biochemistry',
        'description' => 'Free triiodothyronine — active thyroid hormone.',
        'interpretation' => 'Elevated: Hyperthyroidism, T3 thyrotoxicosis. Low: Hypothyroidism, Sick euthyroid syndrome.',
        'suggested_price' => 350,
        'default_parameters' => [
            [
                'name' => 'Free T3', 'unit' => 'pg/mL', 'short_code' => 'FT3', 'input_type' => 'numeric',
                'method' => 'ECLIA (Electrochemiluminescence)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '2.0', 'max_val' => '4.4', 'display_range' => '2.0 - 4.4']],
            ],
        ],
    ],
    [
        'test_code' => 'FT4',
        'name' => 'Free T4',
        'category' => 'Biochemistry',
        'description' => 'Free thyroxine — biologically active form not bound to proteins.',
        'interpretation' => 'Elevated: Hyperthyroidism, Thyroiditis. Low: Hypothyroidism, Pituitary failure.',
        'suggested_price' => 350,
        'default_parameters' => [
            [
                'name' => 'Free T4', 'unit' => 'ng/dL', 'short_code' => 'FT4', 'input_type' => 'numeric',
                'method' => 'ECLIA (Electrochemiluminescence)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.93', 'max_val' => '1.70', 'display_range' => '0.93 - 1.70']],
            ],
        ],
    ],
    [
        'test_code' => 'GTT',
        'name' => 'Glucose Tolerance Test (OGTT)',
        'category' => 'Biochemistry',
        'description' => 'Oral Glucose Tolerance Test with 75g glucose load.',
        'interpretation' => 'One or more abnormal values = Gestational Diabetes Mellitus.',
        'suggested_price' => 300,
        'default_parameters' => [
            [
                'name' => 'Fasting Glucose', 'unit' => 'mg/dL', 'short_code' => 'GTTF', 'input_type' => 'numeric',
                'method' => 'GOD-POD (Enzymatic)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '70', 'max_val' => '92', 'display_range' => '70 - 92']],
            ],
            [
                'name' => '1 Hour Glucose', 'unit' => 'mg/dL', 'short_code' => 'GTT1', 'input_type' => 'numeric',
                'method' => 'GOD-POD (Enzymatic)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '180', 'display_range' => '< 180']],
            ],
            [
                'name' => '2 Hour Glucose', 'unit' => 'mg/dL', 'short_code' => 'GTT2', 'input_type' => 'numeric',
                'method' => 'GOD-POD (Enzymatic)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '153', 'display_range' => '< 153']],
            ],
        ],
    ],
    [
        'test_code' => 'INSULIN-F',
        'name' => 'Fasting Insulin',
        'category' => 'Biochemistry',
        'description' => 'Measures fasting serum insulin.',
        'interpretation' => 'Use with glucose for HOMA-IR calculation.',
        'suggested_price' => 600,
        'default_parameters' => [
            [
                'name' => 'Fasting Glucose (for HOMA)', 'unit' => 'mg/dL', 'short_code' => 'GHOMA', 'input_type' => 'numeric',
                'method' => 'GOD-POD (Enzymatic)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '70', 'max_val' => '100', 'display_range' => '70 - 100']],
            ],
            [
                'name' => 'Fasting Insulin', 'unit' => 'µIU/mL', 'short_code' => 'INSF', 'input_type' => 'numeric',
                'method' => 'CLIA (Chemiluminescence Immunoassay)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '2.6', 'max_val' => '24.9', 'display_range' => '2.6 - 24.9']],
            ],
            [
                'name' => 'HOMA-IR (Insulin Resistance)', 'unit' => 'index', 'short_code' => 'HOMAIR', 'input_type' => 'calculated',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '({INSF} * {GHOMA}) / 405',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '2.5', 'display_range' => '< 2.5']],
            ],
        ],
    ],
    [
        'test_code' => 'CRP',
        'name' => 'C-Reactive Protein (CRP)',
        'category' => 'Biochemistry',
        'description' => 'Marker of inflammation.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-danger mb-2">C-Reactive Protein (CRP) Clinical Utility</h6>
    <p class="fs-12">CRP is an acute-phase reactant produced by the liver. Its concentration increases significantly during systemic inflammation.</p>
    <ul class="fs-11">
        <li><strong>Bacterial Infections:</strong> Typically causes high elevation (>50 mg/L).</li>
        <li><strong>Viral Infections:</strong> Usually shows mild to moderate elevation (10-40 mg/L).</li>
        <li><strong>Inflammatory Conditions:</strong> Rheumatoid arthritis, Vasculitis, Tissue injury.</li>
    </ul>
</div>',
        'suggested_price' => 500,
        'default_parameters' => [
            [
                'name' => 'CRP (Quantitative)', 'unit' => 'mg/L', 'short_code' => 'CRP', 'input_type' => 'numeric',
                'method' => 'Immunoturbidimetry',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '5.0', 'display_range' => '0 - 5.0']],
            ],
        ],
    ],
    [
        'test_code' => 'ELEC',
        'name' => 'Serum Electrolytes (Na, K, Cl)',
        'category' => 'Biochemistry',
        'description' => 'Essential electrolyte panel.',
        'interpretation' => 'Critical for fluid balance assessment.',
        'suggested_price' => 400,
        'default_parameters' => [
            [
                'name' => 'Sodium (Na)', 'unit' => 'mEq/L', 'short_code' => 'NA', 'input_type' => 'numeric',
                'method' => 'ISE (Ion Selective Electrode)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '136', 'max_val' => '146', 'display_range' => '136 - 146']],
            ],
            [
                'name' => 'Potassium (K)', 'unit' => 'mEq/L', 'short_code' => 'K', 'input_type' => 'numeric',
                'method' => 'ISE (Ion Selective Electrode)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '3.5', 'max_val' => '5.1', 'display_range' => '3.5 - 5.1']],
            ],
            [
                'name' => 'Chloride (Cl)', 'unit' => 'mEq/L', 'short_code' => 'CL', 'input_type' => 'numeric',
                'method' => 'ISE (Ion Selective Electrode)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '98', 'max_val' => '106', 'display_range' => '98 - 106']],
            ],
            [
                'name' => 'Bicarbonate (HCO3)', 'unit' => 'mEq/L', 'short_code' => 'HCO3', 'input_type' => 'numeric',
                'method' => 'ISE (Ion Selective Electrode)',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '22', 'max_val' => '28', 'display_range' => '22 - 28']],
            ],
            [
                'name' => 'Anion Gap', 'unit' => 'mEq/L', 'short_code' => 'AGAP', 'input_type' => 'calculated',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '{NA} - ({CL} + {HCO3})',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '8', 'max_val' => '14', 'display_range' => '8 - 14']],
            ],
        ],
    ],
];
