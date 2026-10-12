<?php

// Vitamins & Minerals
return [
    [
        'test_code' => 'FOLATE',
        'name' => 'Serum Folate (Folic Acid)',
        'category' => 'Vitamins',
        'description' => 'Measures Vitamin B9 level. Vital for DNA synthesis and RBC formation.',
        'interpretation' => '<table><tr><th>Level (ng/mL)</th><th>Status</th></tr><tr><td>&lt; 3.0</td><td>Deficiency</td></tr><tr><td>3.0 - 5.8</td><td>Borderline</td></tr><tr><td>&gt; 5.9</td><td>Normal</td></tr></table>',
        'suggested_price' => 700,
        'default_parameters' => [
            ['name' => 'Folic Acid', 'unit' => 'ng/mL', 'short_code' => 'FOL', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '5.9', 'max_val' => '24.8', 'display_range' => '5.9 - 24.8']]],
        ],
    ],
    [
        'test_code' => 'MAG',
        'name' => 'Serum Magnesium',
        'category' => 'Biochemistry',
        'description' => 'Essential mineral for muscle and nerve function.',
        'interpretation' => 'Electrolyte balance marker. Low in alcoholism, malabsorption.',
        'suggested_price' => 250,
        'default_parameters' => [
            ['name' => 'Magnesium', 'unit' => 'mg/dL', 'short_code' => 'MG', 'input_type' => 'numeric', 'method' => 'Xylidyl Blue (Photometric)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1.7', 'max_val' => '2.5', 'display_range' => '1.7 - 2.5']]],
        ],
    ],
    [
        'test_code' => 'ZINC',
        'name' => 'Serum Zinc',
        'category' => 'Biochemistry',
        'description' => 'Trace element vital for immunity and wound healing.',
        'interpretation' => 'Low in malnutrition, chronic infections.',
        'suggested_price' => 800,
        'default_parameters' => [
            ['name' => 'Serum Zinc', 'unit' => 'µg/dL', 'short_code' => 'ZN', 'input_type' => 'numeric', 'method' => '5-Br-PAPS (Colorimetric)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '60', 'max_val' => '120', 'display_range' => '60 - 120']]],
        ],
    ],
    [
        'test_code' => 'COPPER',
        'name' => 'Serum Copper',
        'category' => 'Biochemistry',
        'description' => 'Trace mineral. Wilson disease evaluation.',
        'interpretation' => 'Low in Wilson disease. Elevated in infections, pregnancy.',
        'suggested_price' => 800,
        'default_parameters' => [
            ['name' => 'Serum Copper', 'unit' => 'µg/dL', 'short_code' => 'CU', 'input_type' => 'numeric', 'method' => 'Dibromoquinone (Colorimetric)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '70', 'max_val' => '140', 'display_range' => '70 - 140']]],
        ],
    ],
    [
        'test_code' => 'VITA',
        'name' => 'Vitamin A (Retinol)',
        'category' => 'Vitamins',
        'description' => 'Fat-soluble vitamin essential for vision and immunity.',
        'interpretation' => 'Low: Night blindness, Xerophthalmia. High: Toxicity.',
        'suggested_price' => 1500,
        'default_parameters' => [
            ['name' => 'Vitamin A', 'unit' => 'µg/dL', 'short_code' => 'VITA', 'input_type' => 'numeric', 'method' => 'HPLC (High-Performance Liquid Chromatography)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '30', 'max_val' => '80', 'display_range' => '30 - 80']]],
        ],
    ],
];
