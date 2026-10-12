<?php

// Tumor Markers & Hormones
return [
    [
        'test_code' => 'AFP',
        'name' => 'Alpha-Fetoprotein (AFP)',
        'category' => 'Biochemistry',
        'description' => 'Tumor marker for liver, germ cell, and certain other cancers.',
        'interpretation' => '<table><tr><th>Level (ng/mL)</th><th>Significance</th></tr><tr><td>&lt; 10</td><td>Normal</td></tr><tr><td>10 - 200</td><td>Elevated — Pregnancy, Liver cirrhosis</td></tr><tr><td>&gt; 400</td><td>Very High — HCC or Germ cell tumor</td></tr></table>',
        'suggested_price' => 800,
        'default_parameters' => [
            ['name' => 'AFP (Tumor Marker)', 'unit' => 'ng/mL', 'short_code' => 'AFP', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '10', 'display_range' => '0 - 10 ng/mL']]],
        ],
    ],
    [
        'test_code' => 'CEA',
        'name' => 'Carcinoembryonic Antigen (CEA)',
        'category' => 'Biochemistry',
        'description' => 'Cancer marker. Monitoring of colorectal, lung, breast cancer.',
        'interpretation' => 'Non-smoker: < 3.0 ng/mL. Smoker: < 5.0 ng/mL.',
        'suggested_price' => 800,
        'default_parameters' => [
            ['name' => 'CEA (Serum)', 'unit' => 'ng/mL', 'short_code' => 'CEA', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '5.0', 'display_range' => '0 - 5.0 ng/mL']]],
        ],
    ],
    [
        'test_code' => 'CA125',
        'name' => 'Cancer Antigen 125 (CA-125)',
        'category' => 'Biochemistry',
        'description' => 'Ovarian cancer screening and monitoring.',
        'interpretation' => 'Elevated in ovarian cancer, endometriosis, PID.',
        'suggested_price' => 1200,
        'default_parameters' => [
            ['name' => 'CA-125', 'unit' => 'U/mL', 'short_code' => 'CA125', 'input_type' => 'numeric', 'method' => 'ECLIA (Electrochemiluminescence)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '35', 'display_range' => '0 - 35 U/mL']]],
        ],
    ],
    [
        'test_code' => 'CA199',
        'name' => 'Cancer Antigen 19-9 (CA 19-9)',
        'category' => 'Biochemistry',
        'description' => 'Pancreatic and GI cancer marker.',
        'interpretation' => 'Elevated in pancreatic cancer, cholangiocarcinoma.',
        'suggested_price' => 1200,
        'default_parameters' => [
            ['name' => 'CA 19-9', 'unit' => 'U/mL', 'short_code' => 'CA199', 'input_type' => 'numeric', 'method' => 'ECLIA (Electrochemiluminescence)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '37', 'display_range' => '0 - 37 U/mL']]],
        ],
    ],
    [
        'test_code' => 'T-TESTO',
        'name' => 'Testosterone (Total)',
        'category' => 'Hormones',
        'description' => 'Total serum testosterone. Primary male sex hormone.',
        'interpretation' => 'Low in males: Hypogonadism, Obesity. Elevated in females: PCOS.',
        'suggested_price' => 800,
        'default_parameters' => [
            ['name' => 'Total Testosterone', 'unit' => 'ng/dL', 'short_code' => 'TESTO', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '250', 'max_val' => '1100', 'display_range' => '250 - 1100 ng/dL'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '2', 'max_val' => '45', 'display_range' => '2 - 45 ng/dL'],
            ]],
        ],
    ],
    [
        'test_code' => 'LH',
        'name' => 'Luteinizing Hormone (LH)',
        'category' => 'Hormones',
        'description' => 'Pituitary hormone regulating reproductive function.',
        'interpretation' => 'Elevated in menopause, PCOS. Low in pituitary failure.',
        'suggested_price' => 450,
        'default_parameters' => [
            ['name' => 'LH (Serum)', 'unit' => 'mIU/mL', 'short_code' => 'LH', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1.5', 'max_val' => '9.3', 'display_range' => '1.5 - 9.3 mIU/mL'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1.9', 'max_val' => '76', 'display_range' => '1.9 - 76 mIU/mL'],
            ]],
        ],
    ],
    [
        'test_code' => 'FSH',
        'name' => 'Follicle Stimulating Hormone (FSH)',
        'category' => 'Hormones',
        'description' => 'Pituitary hormone essential for reproductive function.',
        'interpretation' => 'Elevated in menopause, ovarian failure. Low in pituitary failure.',
        'suggested_price' => 450,
        'default_parameters' => [
            ['name' => 'FSH (Serum)', 'unit' => 'mIU/mL', 'short_code' => 'FSH', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1.4', 'max_val' => '18.1', 'display_range' => '1.4 - 18.1 mIU/mL'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '2.5', 'max_val' => '116', 'display_range' => '2.5 - 116 mIU/mL'],
            ]],
        ],
    ],
    [
        'test_code' => 'AMH',
        'name' => 'Anti-Mullerian Hormone (AMH)',
        'category' => 'Hormones',
        'description' => 'Ovarian reserve marker. Used in fertility assessment.',
        'interpretation' => 'Optimal: 1.0 - 3.0 ng/mL. Low: Diminished ovarian reserve.',
        'suggested_price' => 2500,
        'default_parameters' => [
            ['name' => 'AMH', 'unit' => 'ng/mL', 'short_code' => 'AMH', 'input_type' => 'numeric', 'method' => 'ECLIA (Electrochemiluminescence)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1.0', 'max_val' => '3.0', 'display_range' => '1.0 - 3.0 ng/mL']]],
        ],
    ],
    [
        'test_code' => 'ESTRADIOL',
        'name' => 'Estradiol (E2)',
        'category' => 'Hormones',
        'description' => 'Primary female sex hormone. Used in fertility and menopause assessment.',
        'interpretation' => 'Varies with menstrual cycle phase.',
        'suggested_price' => 600,
        'default_parameters' => [
            ['name' => 'Estradiol (E2)', 'unit' => 'pg/mL', 'short_code' => 'E2', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '10', 'max_val' => '40', 'display_range' => '10 - 40 pg/mL'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '12.5', 'max_val' => '498', 'display_range' => '12.5 - 498 pg/mL (phase dependent)'],
            ]],
        ],
    ],
    [
        'test_code' => 'PROGEST',
        'name' => 'Progesterone',
        'category' => 'Hormones',
        'description' => 'Female hormone for luteal phase and pregnancy assessment.',
        'interpretation' => 'Elevated in pregnancy and luteal phase.',
        'suggested_price' => 600,
        'default_parameters' => [
            ['name' => 'Progesterone', 'unit' => 'ng/mL', 'short_code' => 'PROG', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.2', 'max_val' => '1.4', 'display_range' => '0.2 - 1.4 ng/mL'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.2', 'max_val' => '25', 'display_range' => '0.2 - 25 ng/mL (phase dependent)'],
            ]],
        ],
    ],
    [
        'test_code' => 'CORTISOL',
        'name' => 'Cortisol (Morning)',
        'category' => 'Hormones',
        'description' => 'Stress hormone. Morning sample preferred (8-10 AM).',
        'interpretation' => 'Elevated in Cushing syndrome. Low in Addison disease.',
        'suggested_price' => 500,
        'default_parameters' => [
            ['name' => 'Cortisol (Morning)', 'unit' => 'µg/dL', 'short_code' => 'CORT', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '6.2', 'max_val' => '19.4', 'display_range' => '6.2 - 19.4 µg/dL']]],
        ],
    ],
    [
        'test_code' => 'BHCG',
        'name' => 'Beta HCG (Quantitative)',
        'category' => 'Hormones',
        'description' => 'Pregnancy hormone. Quantitative measurement for pregnancy confirmation and monitoring.',
        'interpretation' => 'Doubles every 48-72 hours in early pregnancy. > 5 mIU/mL is positive.',
        'suggested_price' => 600,
        'default_parameters' => [
            ['name' => 'Beta HCG', 'unit' => 'mIU/mL', 'short_code' => 'BHCG', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '5', 'display_range' => '< 5 mIU/mL (Non-pregnant)']]],
        ],
    ],
];
