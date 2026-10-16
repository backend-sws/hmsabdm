<?php

// Clinical Microbiology Tests - Part 5: MRSA Screening, Mantoux, India Ink, Calprotectin, Urine AFB
return [
    [
        'test_code' => 'MRSA-SC',
        'name' => 'MRSA Screening (Nasal Swab)',
        'category' => 'Microbiology',
        'description' => 'Screen for Methicillin-resistant Staphylococcus aureus colonization. Pre-operative and ICU screening.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">MRSA Screening Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>MRSA Not Detected</strong></td><td>No MRSA colonization detected. Standard surgical prophylaxis adequate.</td></tr><tr><td><strong>MRSA Detected</strong></td><td>MRSA carrier. Decolonization protocol: Mupirocin nasal ointment + Chlorhexidine bath. Vancomycin for surgical prophylaxis.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> MRSA colonization ≠ infection. Screening reduces surgical site infections by 50%. Contact precautions in hospital settings.</div></div>',
        'suggested_price' => 600,
        'method' => 'Chromogenic Agar / PCR',
        'sample_type' => 'Nasal Swab (Bilateral)',
        'tat_hours' => 48,
        'default_parameters' => [
            ['name' => 'MRSA Screen', 'unit' => '', 'short_code' => 'MRSA', 'input_type' => 'selection', 'method' => 'Chromogenic Agar / PCR', 'options' => ['Not Detected', 'Detected'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Not Detected', 'display_range' => 'Not Detected']]],
        ],
    ],
    [
        'test_code' => 'MANTOUX',
        'name' => 'Mantoux Test (Tuberculin Skin Test)',
        'category' => 'Microbiology',
        'description' => 'Intradermal injection of PPD to detect delayed-type hypersensitivity to M. tuberculosis antigens.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Mantoux Test Interpretation (Induration)</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Induration (mm)</th><th>Positive In</th></tr></thead><tbody><tr><td><strong>≥ 5 mm</strong></td><td>HIV patients, Close TB contacts, CXR findings, Immunosuppressed (steroids, organ transplant)</td></tr><tr><td><strong>≥ 10 mm</strong></td><td>Recent immigrants from endemic areas, Healthcare workers, Diabetes, Renal failure, Children &lt;4 yrs</td></tr><tr><td><strong>≥ 15 mm</strong></td><td>Positive in any person (no risk factors needed)</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> Read at 48-72 hours. Measure INDURATION not erythema. False negative: Anergy (HIV, Miliary TB, Malnutrition). BCG vaccination may cause false positive (usually &lt;10mm).</div></div>',
        'suggested_price' => 200,
        'method' => 'Intradermal PPD (5 TU) — Mantoux Method',
        'sample_type' => 'Intradermal (Left Forearm)',
        'tat_hours' => 72,
        'default_parameters' => [
            ['name' => 'Induration', 'unit' => 'mm', 'short_code' => 'MTXR', 'input_type' => 'numeric', 'method' => 'Mantoux (PPD Intradermal)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '9', 'display_range' => '< 10 (Negative for most)']]],
            ['name' => 'Interpretation', 'unit' => '', 'short_code' => 'MTXI', 'input_type' => 'selection', 'method' => 'Clinical', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
    [
        'test_code' => 'INDIA-INK',
        'name' => 'India Ink Preparation (CSF)',
        'category' => 'Microbiology',
        'description' => 'Negative staining technique for Cryptococcus neoformans capsule visualization in CSF.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">India Ink Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Negative</strong></td><td>No encapsulated yeast seen. Does not exclude cryptococcal meningitis (sensitivity ~50-80%).</td></tr><tr><td><strong>Positive</strong></td><td>Encapsulated budding yeast seen — Cryptococcus neoformans. Highly associated with HIV/AIDS (CD4 &lt;100). Confirm with Cryptococcal Antigen (CrAg) test.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> CrAg (Latex agglutination/LFA) has higher sensitivity (95-100%) than India ink. Positive India ink has high positive predictive value.</div></div>',
        'suggested_price' => 200,
        'method' => 'India Ink Negative Staining (Microscopy)',
        'sample_type' => 'CSF',
        'tat_hours' => 2,
        'default_parameters' => [
            ['name' => 'India Ink Result', 'unit' => '', 'short_code' => 'IINK', 'input_type' => 'selection', 'method' => 'India Ink Negative Staining', 'options' => ['Negative', 'Positive (Encapsulated Yeast Seen)'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
    [
        'test_code' => 'FCALP',
        'name' => 'Fecal Calprotectin',
        'category' => 'Clinical Pathology',
        'description' => 'Non-invasive marker of intestinal inflammation. Differentiates IBD from IBS. Monitors IBD activity.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Fecal Calprotectin Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (µg/g)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&lt; 50</strong></td><td>Normal — IBD very unlikely. IBS or functional disorder likely.</td></tr><tr><td><strong>50 - 200</strong></td><td>Borderline — Mild intestinal inflammation. Repeat in 4-6 weeks. May be seen in NSAID use, infections.</td></tr><tr><td><strong>200 - 500</strong></td><td>Moderate inflammation — Likely IBD. Endoscopy recommended.</td></tr><tr><td><strong>&gt; 500</strong></td><td>Severe inflammation — Active IBD (Crohn disease, Ulcerative colitis). Treatment escalation needed.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Excellent negative predictive value (&gt;95%). Avoids unnecessary colonoscopies in young patients with GI symptoms. Also elevated in colorectal cancer and infectious colitis.</div></div>',
        'suggested_price' => 2500,
        'method' => 'ELISA (Quantitative)',
        'sample_type' => 'Fresh Stool',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'Fecal Calprotectin', 'unit' => 'µg/g', 'short_code' => 'FCAL', 'input_type' => 'numeric', 'method' => 'ELISA', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '50', 'display_range' => '< 50']]],
        ],
    ],
    [
        'test_code' => 'SFOCC',
        'name' => 'Stool for Occult Blood (iFOBT)',
        'category' => 'Clinical Pathology',
        'description' => 'Immunochemical fecal occult blood test for colorectal cancer screening. No dietary restrictions needed.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">iFOBT Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Negative</strong></td><td>No hemoglobin detected in stool. Repeat annually for CRC screening (age ≥45).</td></tr><tr><td><strong>Positive</strong></td><td>Occult GI bleeding — Colonoscopy recommended. Causes: Colorectal cancer/polyps, IBD, Hemorrhoids, GI ulcers, Angiodysplasia.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> iFOBT is specific for human hemoglobin (no dietary restrictions unlike guaiac test). Annual screening reduces CRC mortality by 33%. Positive result requires colonoscopy regardless of hemorrhoid status.</div></div>',
        'suggested_price' => 250,
        'method' => 'Immunochromatographic (iFOBT)',
        'sample_type' => 'Fresh Stool',
        'tat_hours' => 4,
        'default_parameters' => [
            ['name' => 'Occult Blood (iFOBT)', 'unit' => '', 'short_code' => 'FOBT', 'input_type' => 'selection', 'method' => 'iFOBT (Immunochromatographic)', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
];
