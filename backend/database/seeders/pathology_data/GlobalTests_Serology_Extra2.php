<?php

// Additional Serology & Immunology Tests - Part 2
return [
    [
        'test_code' => 'IGG-SUB',
        'name' => 'Immunoglobulin Profile (IgG, IgA, IgM)',
        'category' => 'Serology & Immunology',
        'description' => 'Quantitative measurement of major immunoglobulins. Screens for immunodeficiency and lymphoproliferative disorders.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Immunoglobulin Profile</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Immunoglobulin</th><th>Elevated In</th><th>Decreased In</th></tr></thead><tbody><tr><td><strong>IgG</strong></td><td>Chronic infections, Autoimmune, Liver disease, IgG myeloma</td><td>Primary immunodeficiency, Nephrotic syndrome, Protein-losing enteropathy</td></tr><tr><td><strong>IgA</strong></td><td>IgA nephropathy, Liver disease, IgA myeloma</td><td>Selective IgA deficiency (most common PID - 1:500)</td></tr><tr><td><strong>IgM</strong></td><td>Primary immune response, Waldenstrom, EBV infection</td><td>Hyper-IgM syndrome, CLL</td></tr></tbody></table></div>',
        'suggested_price' => 1500,
        'method' => 'Nephelometry / Immunoturbidimetry',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'IgG', 'unit' => 'mg/dL', 'short_code' => 'IGG', 'input_type' => 'numeric', 'method' => 'Nephelometry', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '700', 'max_val' => '1600', 'display_range' => '700 - 1600']]],
            ['name' => 'IgA', 'unit' => 'mg/dL', 'short_code' => 'IGA', 'input_type' => 'numeric', 'method' => 'Nephelometry', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '70', 'max_val' => '400', 'display_range' => '70 - 400']]],
            ['name' => 'IgM', 'unit' => 'mg/dL', 'short_code' => 'IGM', 'input_type' => 'numeric', 'method' => 'Nephelometry', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '40', 'max_val' => '230', 'display_range' => '40 - 230']]],
        ],
    ],
    [
        'test_code' => 'SCRUB',
        'name' => 'Scrub Typhus IgM (Orientia tsutsugamushi)',
        'category' => 'Serology & Immunology',
        'description' => 'Serological diagnosis of Scrub Typhus. Endemic rickettsial infection transmitted by chigger mite.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Scrub Typhus IgM</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Significance</th></tr></thead><tbody><tr><td><strong>Negative</strong></td><td>Scrub typhus unlikely. Consider other causes of fever with eschar.</td></tr><tr><td><strong>Positive</strong></td><td>Active/Recent Scrub Typhus. Classic triad: Fever + Eschar + Lymphadenopathy. Treat with Doxycycline/Azithromycin.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> IgM may be negative in first week. Repeat in 7-10 days if clinical suspicion high. Empirical Doxycycline should NOT be delayed for lab confirmation.</div></div>',
        'suggested_price' => 800,
        'method' => 'ELISA / Rapid ICT',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'Scrub Typhus IgM', 'unit' => '', 'short_code' => 'SCBM', 'input_type' => 'selection', 'method' => 'ELISA / ICT', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
    [
        'test_code' => 'LEPTO',
        'name' => 'Leptospira IgM Antibody',
        'category' => 'Serology & Immunology',
        'description' => 'Serological test for Leptospirosis. Zoonotic disease transmitted through contaminated water.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Leptospira IgM Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Negative</strong></td><td>Leptospirosis unlikely. Consider in early disease (IgM appears day 5-7).</td></tr><tr><td><strong>Positive</strong></td><td>Active/Recent Leptospirosis. Weil disease (severe form): Jaundice + AKI + Hemorrhage. Treat with IV Penicillin/Ceftriaxone.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> MAT (Microscopic Agglutination Test) is gold standard. 4-fold rise in paired sera is confirmatory. Risk: Flooding, Sewage exposure, Animal contact.</div></div>',
        'suggested_price' => 700,
        'method' => 'ELISA / Rapid ICT',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'Leptospira IgM', 'unit' => '', 'short_code' => 'LEPM', 'input_type' => 'selection', 'method' => 'ELISA / ICT', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
    [
        'test_code' => 'CHIKG',
        'name' => 'Chikungunya IgM',
        'category' => 'Serology & Immunology',
        'description' => 'Serological test for Chikungunya virus infection. Mosquito-borne alphavirus causing joint pain.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Chikungunya IgM</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Significance</th></tr></thead><tbody><tr><td><strong>Negative</strong></td><td>No recent Chikungunya infection. Consider Dengue (similar presentation).</td></tr><tr><td><strong>Positive</strong></td><td>Recent Chikungunya infection. Severe polyarthralgia is characteristic. Self-limiting but joint pain may persist for months.</td></tr></tbody></table></div>',
        'suggested_price' => 800,
        'method' => 'ELISA / Rapid ICT',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'Chikungunya IgM', 'unit' => '', 'short_code' => 'CHKM', 'input_type' => 'selection', 'method' => 'ELISA / ICT', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
    [
        'test_code' => 'TPHA',
        'name' => 'TPHA (Treponema Pallidum Hemagglutination Assay)',
        'category' => 'Serology & Immunology',
        'description' => 'Confirmatory treponemal test for syphilis. Remains positive for life after infection.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">TPHA Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>VDRL/RPR</th><th>TPHA</th><th>Interpretation</th></tr></thead><tbody><tr><td><strong>Non-Reactive</strong></td><td><strong>Non-Reactive</strong></td><td>No syphilis (or very early primary syphilis — window period)</td></tr><tr><td><strong>Reactive</strong></td><td><strong>Reactive</strong></td><td>Syphilis confirmed (active or treated). Use RPR titre for activity.</td></tr><tr><td><strong>Reactive</strong></td><td><strong>Non-Reactive</strong></td><td>Biological false positive (SLE, Pregnancy, Infections, APLA)</td></tr><tr><td><strong>Non-Reactive</strong></td><td><strong>Reactive</strong></td><td>Past treated syphilis (serofast) or late/latent syphilis</td></tr></tbody></table></div>',
        'suggested_price' => 500,
        'method' => 'Hemagglutination (Treponemal)',
        'sample_type' => 'Clotted Blood',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'TPHA', 'unit' => '', 'short_code' => 'TPHA', 'input_type' => 'selection', 'method' => 'Hemagglutination', 'options' => ['Non-Reactive', 'Reactive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Non-Reactive', 'display_range' => 'Non-Reactive']]],
        ],
    ],
];
