<?php

// Biochemistry General Tests
return [
    [
        'test_code' => 'BSF',
        'name' => 'Blood Sugar Fasting',
        'category' => 'Biochemistry',
        'description' => 'Fasting blood glucose. 8-12 hours overnight fast required.',
        'interpretation' => '<table><tr><th>Level (mg/dL)</th><th>Category</th></tr><tr><td>&lt; 100</td><td>Normal</td></tr><tr><td>100 - 125</td><td>Impaired Fasting Glucose (Pre-Diabetes)</td></tr><tr><td>&ge; 126</td><td>Diabetes Mellitus</td></tr></table>',
        'suggested_price' => 80,
        'default_parameters' => [
            ['name' => 'Blood Sugar (Fasting)', 'unit' => 'mg/dL', 'short_code' => 'BSF', 'input_type' => 'numeric', 'method' => 'GOD-POD (Enzymatic)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '70', 'max_val' => '100', 'display_range' => '70 - 100']]],
        ],
    ],
    [
        'test_code' => 'BSPP',
        'name' => 'Blood Sugar Post Prandial',
        'category' => 'Biochemistry',
        'description' => 'Post meal blood glucose. Sample taken 2 hours after standard meal.',
        'interpretation' => '<table><tr><th>Level (mg/dL)</th><th>Category</th></tr><tr><td>&lt; 140</td><td>Normal</td></tr><tr><td>140 - 199</td><td>Impaired Glucose Tolerance</td></tr><tr><td>&ge; 200</td><td>Diabetes Mellitus</td></tr></table>',
        'suggested_price' => 80,
        'default_parameters' => [
            ['name' => 'Blood Sugar (PP)', 'unit' => 'mg/dL', 'short_code' => 'BSPP', 'input_type' => 'numeric', 'method' => 'GOD-POD (Enzymatic)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '70', 'max_val' => '140', 'display_range' => '70 - 140']]],
        ],
    ],
    [
        'test_code' => 'BSR',
        'name' => 'Blood Sugar Random',
        'category' => 'Biochemistry',
        'description' => 'Random blood glucose. No fasting required.',
        'interpretation' => 'Random glucose >= 200 mg/dL with symptoms is diagnostic of diabetes mellitus.',
        'suggested_price' => 80,
        'default_parameters' => [
            ['name' => 'Blood Sugar (Random)', 'unit' => 'mg/dL', 'short_code' => 'BSR', 'input_type' => 'numeric', 'method' => 'GOD-POD (Enzymatic)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '70', 'max_val' => '140', 'display_range' => '70 - 140']]],
        ],
    ],
    [
        'test_code' => 'HBA1C',
        'name' => 'Glycosylated Hemoglobin (HbA1c)',
        'category' => 'Biochemistry',
        'description' => 'Reflects average blood glucose over the past 2-3 months. Gold standard for diabetes monitoring.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-primary mb-3">HbA1c & Long-term Glycemic Control</h6>
    <div class="table-responsive">
        <table class="table table-bordered table-sm fs-11">
            <thead class="bg-light">
                <tr><th>HbA1c (%)</th><th>Category</th><th>Average Glucose (eAG)</th></tr>
            </thead>
            <tbody>
                <tr><td><strong>&lt; 5.7</strong></td><td>Normal / Non-diabetic</td><td>&lt; 117 mg/dL</td></tr>
                <tr><td><strong>5.7 - 6.4</strong></td><td>Pre-diabetes (Increased Risk)</td><td>117 - 137 mg/dL</td></tr>
                <tr><td><strong>&ge; 6.5</strong></td><td>Diabetes Mellitus</td><td>&ge; 140 mg/dL</td></tr>
            </tbody>
        </table>
    </div>
    <h6 class="fw-bold text-info mt-3 mb-2 fs-12">Therapeutic Targets for Diabetics:</h6>
    <ul class="fs-11">
        <li><strong>&lt; 7.0:</strong> Good Control (Target for most adults).</li>
        <li><strong>7.0 - 8.0:</strong> Fair Control (Consider treatment adjustment).</li>
        <li><strong>&gt; 8.0:</strong> Poor Control (High risk of complications).</li>
    </ul>
    <div class="alert alert-soft-secondary py-2 px-3 fs-10 mt-2">
        Note: HbA1c may be misleading in patients with certain anemias, hemoglobinopathies, or recent blood transfusions.
    </div>
</div>',
        'suggested_price' => 450,
        'default_parameters' => [
            ['name' => 'HbA1c', 'unit' => '%', 'short_code' => 'HBA1C', 'input_type' => 'numeric', 'method' => 'HPLC (High-Performance Liquid Chromatography)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '4.0', 'max_val' => '5.6', 'display_range' => '4.0 - 5.6']]],
            ['name' => 'Estimated Average Glucose', 'unit' => 'mg/dL', 'short_code' => 'EAG', 'input_type' => 'calculated', 'method' => 'Calculated', 'range_type' => 'flexible', 'formula' => '({HBA1C} * 28.7) - 46.7', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '68', 'max_val' => '114', 'display_range' => '68 - 114']]],
        ],
    ],
    [
        'test_code' => 'URIC',
        'name' => 'Uric Acid',
        'category' => 'Biochemistry',
        'description' => 'End product of purine metabolism. Elevated in gout and renal disease.',
        'interpretation' => '<table><tr><th>Condition</th><th>Significance</th></tr><tr><td>Elevated</td><td>Gout, Renal failure, Leukemia, Pre-eclampsia</td></tr><tr><td>Low</td><td>Wilson disease, Fanconi syndrome</td></tr></table>',
        'suggested_price' => 200,
        'default_parameters' => [
            ['name' => 'Uric Acid', 'unit' => 'mg/dL', 'short_code' => 'URIC', 'input_type' => 'numeric', 'method' => 'Uricase-PAP (Enzymatic Colorimetric)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '3.4', 'max_val' => '7.0', 'display_range' => '3.4 - 7.0'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '2.4', 'max_val' => '6.0', 'display_range' => '2.4 - 6.0'],
            ]],
        ],
    ],
    [
        'test_code' => 'CALC',
        'name' => 'Serum Calcium',
        'category' => 'Biochemistry',
        'description' => 'Total serum calcium. Essential for bone, nerve and muscle function.',
        'interpretation' => '<table><tr><th>Level</th><th>Significance</th></tr><tr><td>Low (&lt; 8.5)</td><td>Hypoparathyroidism, Vit D deficiency, CKD</td></tr><tr><td>Normal (8.5 - 10.5)</td><td>Normal calcium homeostasis</td></tr><tr><td>High (&gt; 10.5)</td><td>Hyperparathyroidism, Malignancy, Vit D excess</td></tr></table>',
        'suggested_price' => 200,
        'default_parameters' => [
            ['name' => 'Serum Calcium', 'unit' => 'mg/dL', 'short_code' => 'CA', 'input_type' => 'numeric', 'method' => 'Arsenazo III (Photometric)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '8.5', 'max_val' => '10.5', 'display_range' => '8.5 - 10.5']]],
        ],
    ],
    [
        'test_code' => 'PHOS',
        'name' => 'Serum Phosphorus',
        'category' => 'Biochemistry',
        'description' => 'Inorganic phosphorus. Important for bone metabolism.',
        'interpretation' => 'Elevated: CKD, Hypoparathyroidism, Tumor lysis. Low: Hyperparathyroidism, Rickets, Malnutrition.',
        'suggested_price' => 200,
        'default_parameters' => [
            ['name' => 'Serum Phosphorus', 'unit' => 'mg/dL', 'short_code' => 'PHOS', 'input_type' => 'numeric', 'method' => 'Phosphomolybdate (UV)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '2.5', 'max_val' => '4.5', 'display_range' => '2.5 - 4.5']]],
        ],
    ],
    [
        'test_code' => 'IRON',
        'name' => 'Iron Studies',
        'category' => 'Biochemistry',
        'description' => 'Comprehensive iron profile including Serum Iron, TIBC, Transferrin Saturation and Ferritin.',
        'interpretation' => '<table><tr><th>Pattern</th><th>Iron</th><th>TIBC</th><th>Ferritin</th><th>Diagnosis</th></tr><tr><td>Iron Deficiency</td><td>Low</td><td>High</td><td>Low</td><td>IDA</td></tr><tr><td>Chronic Disease</td><td>Low</td><td>Low</td><td>High</td><td>ACD</td></tr><tr><td>Overload</td><td>High</td><td>Low</td><td>High</td><td>Hemochromatosis</td></tr></table>',
        'suggested_price' => 600,
        'default_parameters' => [
            ['name' => 'Serum Iron', 'unit' => 'µg/dL', 'short_code' => 'FE', 'input_type' => 'numeric', 'method' => 'Ferrozine (Colorimetric)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '65', 'max_val' => '175', 'display_range' => '65 - 175'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '50', 'max_val' => '170', 'display_range' => '50 - 170'],
            ]],
            ['name' => 'TIBC', 'unit' => 'µg/dL', 'short_code' => 'TIBC', 'input_type' => 'numeric', 'method' => 'Ferrozine (Colorimetric)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '250', 'max_val' => '370', 'display_range' => '250 - 370']]],
            ['name' => 'Transferrin Saturation', 'unit' => '%', 'short_code' => 'TSAT', 'input_type' => 'calculated', 'method' => 'Calculated', 'range_type' => 'flexible', 'formula' => '({FE} / {TIBC}) * 100', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '20', 'max_val' => '50', 'display_range' => '20 - 50']]],
            ['name' => 'Serum Ferritin', 'unit' => 'ng/mL', 'short_code' => 'FERR', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '20', 'max_val' => '250', 'display_range' => '20 - 250'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '10', 'max_val' => '120', 'display_range' => '10 - 120'],
            ]],
        ],
    ],
    [
        'test_code' => 'VITD',
        'name' => 'Vitamin D (25-OH)',
        'category' => 'Vitamins',
        'description' => '25-Hydroxyvitamin D. Gold standard for vitamin D status assessment.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-warning mb-2">Vitamin D Status Assessment</h6>
    <p class="fs-12">Vitamin D is essential for calcium absorption and bone health. 25-Hydroxyvitamin D is the best indicator of overall Vitamin D status.</p>
    <div class="table-responsive">
        <table class="table table-sm table-bordered fs-11">
            <thead class="bg-light"><tr><th>Level (ng/mL)</th><th>Clinical Status</th></tr></thead>
            <tbody>
                <tr class="table-danger"><td>&lt; 20</td><td>Deficiency (Risk of Rickets / Osteomalacia)</td></tr>
                <tr class="table-warning"><td>20 - 30</td><td>Insufficiency (Sub-optimal bone health)</td></tr>
                <tr class="table-success"><td>30 - 100</td><td>Sufficiency (Optimal level)</td></tr>
                <tr class="table-danger"><td>&gt; 100</td><td>Potential Toxicity (Hypercalcemia risk)</td></tr>
            </tbody>
        </table>
    </div>
</div>',
        'suggested_price' => 1200,
        'default_parameters' => [
            ['name' => '25-OH Vitamin D', 'unit' => 'ng/mL', 'short_code' => 'VITD', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '30', 'max_val' => '100', 'display_range' => '30 - 100']]],
        ],
    ],
    [
        'test_code' => 'VITB12',
        'name' => 'Vitamin B12',
        'category' => 'Vitamins',
        'description' => 'Serum cobalamin level. Deficiency causes megaloblastic anemia and neuropathy.',
        'interpretation' => '<table><tr><th>Level (pg/mL)</th><th>Status</th></tr><tr><td>&lt; 200</td><td>Deficiency</td></tr><tr><td>200 - 300</td><td>Borderline / Possible deficiency</td></tr><tr><td>300 - 900</td><td>Normal</td></tr><tr><td>&gt; 900</td><td>Elevated (Liver disease, CML)</td></tr></table>',
        'suggested_price' => 800,
        'default_parameters' => [
            ['name' => 'Vitamin B12', 'unit' => 'pg/mL', 'short_code' => 'B12', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '200', 'max_val' => '900', 'display_range' => '200 - 900']]],
        ],
    ],
];
