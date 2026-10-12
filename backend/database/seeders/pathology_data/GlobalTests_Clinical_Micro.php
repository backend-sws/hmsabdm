<?php

// Clinical Microbiology Tests - Part 1: Cultures (Blood, Urine, Sputum, Wound, Throat)
return [
    [
        'test_code' => 'BC',
        'name' => 'Blood Culture & Sensitivity (Aerobic)',
        'category' => 'Microbiology',
        'description' => 'Gold standard for bacteremia/sepsis diagnosis. Identifies organism and antibiotic susceptibility.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Blood Culture Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>No Growth (5 days)</strong></td><td>Negative — Bacteremia unlikely. Consider atypical organisms if clinical suspicion high.</td></tr><tr><td><strong>Growth Detected</strong></td><td>Identify organism + Sensitivity pattern. Common: S. aureus, E. coli, Klebsiella, Streptococci. Contaminants: CoNS (single bottle), Corynebacterium.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> Collect 2-3 sets from different sites before antibiotics. Single positive CoNS may be contamination. Repeat if clinically significant.</div></div>',
        'suggested_price' => 800,
        'method' => 'Automated (BacT/ALERT / BACTEC)',
        'sample_type' => 'Blood (Aerobic Bottle)',
        'tat_hours' => 120,
        'default_parameters' => [
            ['name' => 'Culture & Sensitivity', 'unit' => '', 'short_code' => 'BCR', 'input_type' => 'culture_sensitivity', 'method' => 'Automated / Kirby-Bauer', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'No Growth', 'display_range' => 'No Growth']]],
        ],
    ],
    [
        'test_code' => 'UC',
        'name' => 'Urine Culture & Sensitivity',
        'category' => 'Microbiology',
        'description' => 'Identifies urinary tract pathogens and antibiotic susceptibility. Mid-stream clean-catch sample required.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Urine Culture Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Colony Count (CFU/mL)</th><th>Significance</th></tr></thead><tbody><tr><td><strong>No Growth / &lt; 10³</strong></td><td>No significant infection</td></tr><tr><td><strong>10³ - 10⁴</strong></td><td>Borderline — May be significant in symptomatic patients, catheterized specimens</td></tr><tr><td><strong>≥ 10⁵</strong></td><td>Significant bacteriuria — UTI confirmed. Common: E. coli (80%), Klebsiella, Proteus, Enterococcus</td></tr><tr><td><strong>Mixed Flora (≥3 organisms)</strong></td><td>Contamination likely — Repeat with proper clean-catch technique</td></tr></tbody></table></div>',
        'suggested_price' => 500,
        'method' => 'Semi-Quantitative Culture (CLED / MacConkey)',
        'sample_type' => 'Mid-stream Clean-Catch Urine',
        'tat_hours' => 72,
        'default_parameters' => [
            ['name' => 'Culture & Sensitivity', 'unit' => '', 'short_code' => 'UCR', 'input_type' => 'culture_sensitivity', 'method' => 'Culture / Kirby-Bauer', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'No Growth', 'display_range' => 'No Growth']]],
        ],
    ],
    [
        'test_code' => 'SPC',
        'name' => 'Sputum Culture & Sensitivity',
        'category' => 'Microbiology',
        'description' => 'Identifies respiratory pathogens. Early morning deep cough sputum preferred.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Sputum Culture Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Finding</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Normal Flora</strong></td><td>No pathogenic organism isolated. Oropharyngeal contamination possible.</td></tr><tr><td><strong>Pathogen Isolated</strong></td><td>Common: S. pneumoniae, H. influenzae, Klebsiella, Pseudomonas, S. aureus (MRSA)</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Sputum quality assessed by Gram stain — &gt;25 PMNs and &lt;10 squamous epithelial cells/LPF indicates good quality specimen.</div></div>',
        'suggested_price' => 600,
        'method' => 'Conventional Culture (Blood Agar / MacConkey / Chocolate Agar)',
        'sample_type' => 'Sputum (Early Morning)',
        'tat_hours' => 72,
        'default_parameters' => [
            ['name' => 'Culture & Sensitivity', 'unit' => '', 'short_code' => 'SPCR', 'input_type' => 'culture_sensitivity', 'method' => 'Conventional Culture / Kirby-Bauer', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Normal Flora', 'display_range' => 'Normal Flora']]],
        ],
    ],
    [
        'test_code' => 'WC',
        'name' => 'Wound / Pus Culture & Sensitivity',
        'category' => 'Microbiology',
        'description' => 'Identifies wound pathogens and guides antibiotic therapy. Swab or aspirate from infected site.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Wound Culture Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>No Growth</strong></td><td>No bacterial pathogen isolated. Consider fungal or anaerobic culture if clinical suspicion.</td></tr><tr><td><strong>Pathogen Isolated</strong></td><td>Common: S. aureus (MRSA/MSSA), Streptococcus pyogenes, Pseudomonas, E. coli, Anaerobes</td></tr><tr><td><strong>Mixed Growth</strong></td><td>Polymicrobial infection — Common in diabetic foot, Abscesses, Bite wounds</td></tr></tbody></table></div>',
        'suggested_price' => 600,
        'method' => 'Conventional Culture (BA / MacConkey)',
        'sample_type' => 'Wound Swab / Pus Aspirate',
        'tat_hours' => 72,
        'default_parameters' => [
            ['name' => 'Culture & Sensitivity', 'unit' => '', 'short_code' => 'WCR', 'input_type' => 'culture_sensitivity', 'method' => 'Conventional Culture / Kirby-Bauer', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'No Growth', 'display_range' => 'No Growth']]],
        ],
    ],
    [
        'test_code' => 'TC',
        'name' => 'Throat Culture & Sensitivity',
        'category' => 'Microbiology',
        'description' => 'Identifies pharyngeal pathogens, primarily Group A Streptococcus. Throat swab collection.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Throat Culture Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Normal Flora</strong></td><td>No pathogenic organism. Viral pharyngitis likely.</td></tr><tr><td><strong>Group A Streptococcus (GAS)</strong></td><td>Strep throat — Treat with Penicillin/Amoxicillin. Prevents Rheumatic Fever.</td></tr><tr><td><strong>Other Pathogens</strong></td><td>C. diphtheriae (diphtheria), Neisseria gonorrhoeae, Arcanobacterium haemolyticum</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Rapid Strep Test (Antigen detection) gives results in 15 minutes. Negative rapid test should be confirmed with culture in children.</div></div>',
        'suggested_price' => 500,
        'method' => 'Culture on Blood Agar (Bacitracin Test)',
        'sample_type' => 'Throat Swab',
        'tat_hours' => 72,
        'default_parameters' => [
            ['name' => 'Culture & Sensitivity', 'unit' => '', 'short_code' => 'TCR', 'input_type' => 'culture_sensitivity', 'method' => 'Blood Agar Culture / Kirby-Bauer', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Normal Flora', 'display_range' => 'Normal Flora']]],
        ],
    ],
];
