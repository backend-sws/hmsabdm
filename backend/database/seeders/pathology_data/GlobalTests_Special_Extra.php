<?php

// Additional Special Tests & Molecular Diagnostics
return [
    [
        'test_code' => 'HCVRNA',
        'name' => 'HCV RNA Quantitative (Viral Load)',
        'category' => 'Molecular Diagnostics',
        'description' => 'Quantitative HCV RNA by Real-Time PCR. Monitors antiviral treatment response and confirms active infection.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">HCV RNA Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (IU/mL)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Not Detected</strong></td><td>No active HCV infection. If post-treatment (SVR12): Cure confirmed.</td></tr><tr><td><strong>&lt; 800,000</strong></td><td>Low viral load — Better treatment response</td></tr><tr><td><strong>&gt; 800,000</strong></td><td>High viral load — May require longer treatment duration. Monitor at weeks 4, 12, EOT, SVR12.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> SVR12 (Sustained Virological Response at 12 weeks post-treatment) = Cure. DAA therapy achieves &gt;95% SVR rates.</div></div>',
        'suggested_price' => 5000,
        'method' => 'Real-Time RT-PCR (TaqMan)',
        'sample_type' => 'EDTA Plasma',
        'tat_hours' => 48,
        'default_parameters' => [
            ['name' => 'HCV RNA (Quantitative)', 'unit' => 'IU/mL', 'short_code' => 'HCVQ', 'input_type' => 'numeric', 'method' => 'Real-Time RT-PCR', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Not Detected', 'display_range' => 'Not Detected']]],
        ],
    ],
    [
        'test_code' => 'HIVVL',
        'name' => 'HIV-1 RNA Viral Load (Quantitative)',
        'category' => 'Molecular Diagnostics',
        'description' => 'Quantitative HIV-1 RNA for treatment monitoring. Target: Undetectable (&lt;20 copies/mL).',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">HIV Viral Load Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Level (copies/mL)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&lt; 20 (Undetectable)</strong></td><td>Viral suppression achieved — Continue ART. U=U (Undetectable = Untransmittable).</td></tr><tr><td><strong>20 - 1000</strong></td><td>Low-level viremia — Check adherence. May be blip (transient). Repeat in 3 months.</td></tr><tr><td><strong>&gt; 1000</strong></td><td>Virological failure — Resistance testing recommended. Switch ART regimen.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> Check viral load at 6 months, then every 12 months on stable ART. Two consecutive VL &gt;1000 = Confirmed failure. Genotypic resistance testing before switching.</div></div>',
        'suggested_price' => 4500,
        'method' => 'Real-Time RT-PCR (TaqMan)',
        'sample_type' => 'EDTA Plasma',
        'tat_hours' => 48,
        'default_parameters' => [
            ['name' => 'HIV-1 RNA', 'unit' => 'copies/mL', 'short_code' => 'HIVQ', 'input_type' => 'numeric', 'method' => 'Real-Time RT-PCR', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Not Detected', 'display_range' => 'Target: < 20']]],
        ],
    ],
    [
        'test_code' => 'CD4',
        'name' => 'CD4 Count (T-Lymphocyte Subset)',
        'category' => 'Immunology',
        'description' => 'Absolute CD4+ T-cell count. Guides ART initiation and opportunistic infection prophylaxis in HIV.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">CD4 Count Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>CD4 (cells/µL)</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>&gt; 500</strong></td><td>Normal immune function. Start ART regardless (WHO recommendation).</td></tr><tr><td><strong>350 - 500</strong></td><td>Mild immunosuppression. ART recommended.</td></tr><tr><td><strong>200 - 350</strong></td><td>Moderate immunosuppression. Start Cotrimoxazole prophylaxis.</td></tr><tr><td><strong>&lt; 200</strong></td><td>Severe immunosuppression — AIDS defining. High risk: PCP, Toxoplasmosis, Cryptococcal meningitis.</td></tr><tr><td><strong>&lt; 50</strong></td><td>Critical — Risk of MAC, CMV retinitis. Urgent ART initiation.</td></tr></tbody></table></div>',
        'suggested_price' => 1500,
        'method' => 'Flow Cytometry',
        'sample_type' => 'EDTA Blood',
        'tat_hours' => 24,
        'default_parameters' => [
            ['name' => 'CD4 Absolute Count', 'unit' => 'cells/µL', 'short_code' => 'CD4', 'input_type' => 'numeric', 'method' => 'Flow Cytometry', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '500', 'max_val' => '1500', 'display_range' => '500 - 1500']]],
            ['name' => 'CD4 Percentage', 'unit' => '%', 'short_code' => 'CD4P', 'input_type' => 'numeric', 'method' => 'Flow Cytometry', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '30', 'max_val' => '60', 'display_range' => '30 - 60']]],
            ['name' => 'CD8 Count', 'unit' => 'cells/µL', 'short_code' => 'CD8', 'input_type' => 'numeric', 'method' => 'Flow Cytometry', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '150', 'max_val' => '1000', 'display_range' => '150 - 1000']]],
            ['name' => 'CD4/CD8 Ratio', 'unit' => '', 'short_code' => 'CD48', 'input_type' => 'calculated', 'method' => 'Calculated', 'range_type' => 'flexible', 'formula' => '{CD4} / {CD8}', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1.0', 'max_val' => '3.0', 'display_range' => '1.0 - 3.0']]],
        ],
    ],
    [
        'test_code' => 'GENOX',
        'name' => 'GeneXpert MTB/RIF Ultra',
        'category' => 'Molecular Biology',
        'description' => 'Next-generation GeneXpert with improved sensitivity for paucibacillary TB (smear-negative, pediatric, extrapulmonary).',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">GeneXpert Ultra Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Significance</th></tr></thead><tbody><tr><td><strong>Not Detected</strong></td><td>MTB not detected. Higher sensitivity than standard Xpert — better negative predictive value.</td></tr><tr><td><strong>Trace</strong></td><td>Lowest bacillary burden. Clinically significant in HIV+ and children. Consider clinical context. Repeat if uncertain.</td></tr><tr><td><strong>Very Low / Low / Medium / High</strong></td><td>MTB confirmed. Semi-quantitative load estimate. Rifampicin resistance assessed.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Ultra has 17% higher sensitivity than Xpert for smear-negative TB. TRACE category is new — may represent very early or treated TB.</div></div>',
        'suggested_price' => 3000,
        'method' => 'Real-Time PCR (Cepheid GeneXpert Ultra)',
        'sample_type' => 'Sputum / Body Fluid',
        'tat_hours' => 4,
        'default_parameters' => [
            ['name' => 'MTB Detection', 'unit' => '', 'short_code' => 'GXUM', 'input_type' => 'selection', 'method' => 'GeneXpert Ultra', 'options' => ['Not Detected', 'Trace', 'Very Low', 'Low', 'Medium', 'High'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Not Detected', 'display_range' => 'Not Detected']]],
            ['name' => 'Rifampicin Resistance', 'unit' => '', 'short_code' => 'GXUR', 'input_type' => 'selection', 'method' => 'GeneXpert Ultra', 'options' => ['Not Applicable', 'Not Detected', 'Detected', 'Indeterminate'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Not Applicable', 'display_range' => 'N/A']]],
        ],
    ],
    [
        'test_code' => 'CRPAG',
        'name' => 'Cryptococcal Antigen (CrAg)',
        'category' => 'Serology & Immunology',
        'description' => 'Detects Cryptococcus neoformans capsular antigen. Highly sensitive test for cryptococcal meningitis.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Cryptococcal Antigen Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Negative</strong></td><td>Cryptococcal infection unlikely (NPV &gt;99%)</td></tr><tr><td><strong>Positive (Serum)</strong></td><td>Serum CrAg+ in HIV patients (CD4 &lt;200) — Screen for meningitis with LP. Start pre-emptive fluconazole if LP negative.</td></tr><tr><td><strong>Positive (CSF)</strong></td><td>Cryptococcal meningitis confirmed. Treat with Amphotericin B + Flucytosine induction.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> WHO recommends CrAg screening for all HIV patients with CD4 &lt;200. LFA (Lateral Flow Assay) provides results in 10 minutes at point-of-care.</div></div>',
        'suggested_price' => 800,
        'method' => 'Lateral Flow Assay (LFA) / Latex Agglutination',
        'sample_type' => 'Serum / CSF',
        'tat_hours' => 4,
        'default_parameters' => [
            ['name' => 'CrAg (Serum/CSF)', 'unit' => '', 'short_code' => 'CRAG', 'input_type' => 'selection', 'method' => 'Lateral Flow Assay', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
];
