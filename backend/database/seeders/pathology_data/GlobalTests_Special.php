<?php

// Special Tests, Molecular Diagnostics, and PCR
return [
    [
        'test_code' => 'COV19',
        'name' => 'COVID-19 RT-PCR (Qualitative)',
        'category' => 'Molecular Biology',
        'description' => 'Real-time PCR for detection of SARS-CoV-2 RNA.',
        'interpretation' => 'Positive: Viral RNA detected — suggests active infection. Negative: Not detected.',
        'suggested_price' => 1200,
        'default_parameters' => [
            ['name' => 'SARS-CoV-2 RNA', 'unit' => '', 'short_code' => 'COV2', 'input_type' => 'selection', 'method' => 'Real-Time RT-PCR', 'range_type' => 'flexible', 'formula' => '', 'options' => ['Not Detected', 'Detected', 'Inconclusive'], 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Not Detected', 'display_range' => 'Not Detected']]],
            ['name' => 'Ct Value (Target 1)', 'unit' => '', 'short_code' => 'CT1', 'input_type' => 'numeric', 'method' => 'Real-Time RT-PCR', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '35', 'max_val' => '50', 'display_range' => '> 35']]],
            ['name' => 'Ct Value (Target 2)', 'unit' => '', 'short_code' => 'CT2', 'input_type' => 'numeric', 'method' => 'Real-Time RT-PCR', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '35', 'max_val' => '50', 'display_range' => '> 35']]],
        ],
    ],
    [
        'test_code' => 'HLAB27',
        'name' => 'HLA-B27 (Flow Cytometry)',
        'category' => 'Serology & Immunology',
        'description' => 'Human Leukocyte Antigen B*27. Associated with Spondyloarthropathies.',
        'interpretation' => 'B*27 Positive: High association with Ankylosing Spondylitis.',
        'suggested_price' => 2500,
        'default_parameters' => [
            ['name' => 'HLA-B*27', 'unit' => '', 'short_code' => 'B27', 'input_type' => 'selection', 'method' => 'Flow Cytometry', 'range_type' => 'flexible', 'formula' => '', 'options' => ['Negative', 'Positive'], 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
    [
        'test_code' => 'HBVDNA-Q',
        'name' => 'HBV DNA Quantitative (Real Time PCR)',
        'category' => 'Molecular Diagnostics',
        'description' => 'Viral load monitoring for Hepatitis B.',
        'interpretation' => 'Lower Limit of Detection: 10 IU/mL. Undetectable is target on treatment.',
        'suggested_price' => 4500,
        'default_parameters' => [
            ['name' => 'Viral Load', 'unit' => 'IU/mL', 'short_code' => 'HBVQ', 'input_type' => 'numeric', 'method' => 'Real-Time PCR (TaqMan)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Not Detected', 'display_range' => 'Not Detected']]],
        ],
    ],
    [
        'test_code' => 'ALLERGY-P',
        'name' => 'Allergy Panel (Comprehensive)',
        'category' => 'Immunology',
        'description' => 'IgE antibodies panel for allergy screening.',
        'interpretation' => 'Class 0-6 risk assessment. Total IgE > 100 suggests atopy.',
        'suggested_price' => 5500,
        'default_parameters' => [
            ['name' => 'Total IgE', 'unit' => 'IU/mL', 'short_code' => 'IGE', 'input_type' => 'numeric', 'method' => 'CLIA (Chemiluminescence Immunoassay)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '100', 'display_range' => '0 - 100']]],
        ],
    ],
    [
        'test_code' => 'SEMEN',
        'name' => 'Semen Analysis (WHO 2021)',
        'category' => 'Clinical Pathology',
        'description' => 'Complete semen analysis as per WHO 2021 guidelines.',
        'interpretation' => 'Evaluated for fertility assessment. WHO 2021 reference values applied.',
        'suggested_price' => 500,
        'default_parameters' => [
            ['name' => 'Volume', 'unit' => 'mL', 'short_code' => 'SVOL', 'input_type' => 'numeric', 'method' => 'Graduated Pipette', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1.4', 'max_val' => '10', 'display_range' => '≥ 1.4']]],
            ['name' => 'Colour', 'unit' => '', 'short_code' => 'SCOL', 'input_type' => 'text', 'method' => 'Visual Examination', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Whitish Grey', 'display_range' => 'n/a']]],
            ['name' => 'Liquefaction Time', 'unit' => 'minutes', 'short_code' => 'SLIQ', 'input_type' => 'numeric', 'method' => 'Visual Examination', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '30', 'display_range' => '< 30']]],
            ['name' => 'Viscosity', 'unit' => '', 'short_code' => 'SVIS', 'input_type' => 'text', 'method' => 'Visual Examination', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Normal', 'display_range' => 'Normal']]],
            ['name' => 'pH', 'unit' => '', 'short_code' => 'SPH', 'input_type' => 'numeric', 'method' => 'pH Paper', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '7.2', 'max_val' => '8.0', 'display_range' => '≥ 7.2']]],
            ['name' => 'Sperm Count', 'unit' => 'million/mL', 'short_code' => 'SCNT', 'input_type' => 'numeric', 'method' => 'Neubauer Chamber (Microscopy)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '16', 'max_val' => '999', 'display_range' => '≥ 16']]],
            ['name' => 'Total Sperm Count', 'unit' => 'million/ejaculate', 'short_code' => 'STOT', 'input_type' => 'calculated', 'method' => 'Calculated', 'range_type' => 'flexible', 'formula' => '{SCNT} * {SVOL}', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '39', 'max_val' => '9999', 'display_range' => '≥ 39']]],
            ['name' => 'Progressive Motility', 'unit' => '%', 'short_code' => 'SMOT', 'input_type' => 'numeric', 'method' => 'Microscopic Examination', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '30', 'max_val' => '100', 'display_range' => '≥ 30']]],
            ['name' => 'Total Motility', 'unit' => '%', 'short_code' => 'STMOT', 'input_type' => 'numeric', 'method' => 'Microscopic Examination', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '42', 'max_val' => '100', 'display_range' => '≥ 42']]],
            ['name' => 'Normal Morphology', 'unit' => '%', 'short_code' => 'SMOR', 'input_type' => 'numeric', 'method' => 'Microscopic Examination (Strict Criteria)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '4', 'max_val' => '100', 'display_range' => '≥ 4']]],
            ['name' => 'Pus Cells', 'unit' => '/HPF', 'short_code' => 'SPUS', 'input_type' => 'numeric', 'method' => 'Microscopic Examination', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '5', 'display_range' => '0 - 5']]],
            ['name' => 'Fructose', 'unit' => '', 'short_code' => 'SFRU', 'input_type' => 'text', 'method' => 'Chemical Test', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Positive', 'display_range' => 'Positive']]],
        ],
    ],
];
