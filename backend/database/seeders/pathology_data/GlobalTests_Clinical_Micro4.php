<?php

// Clinical Microbiology Tests - Part 4: Ear/Eye Swab, H. pylori, C. diff, Blood Parasite, Mantoux
return [
    [
        'test_code' => 'EAR-CS',
        'name' => 'Ear Swab Culture & Sensitivity',
        'category' => 'Microbiology',
        'description' => 'Culture of ear discharge for otitis media/externa pathogens.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Ear Swab Culture Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Organism</th><th>Condition</th></tr></thead><tbody><tr><td><strong>S. aureus</strong></td><td>Otitis externa, Chronic suppurative otitis media (CSOM)</td></tr><tr><td><strong>Pseudomonas aeruginosa</strong></td><td>Otitis externa (swimmers ear), Malignant otitis externa (diabetics)</td></tr><tr><td><strong>S. pneumoniae / H. influenzae</strong></td><td>Acute otitis media</td></tr><tr><td><strong>Aspergillus / Candida</strong></td><td>Otomycosis (fungal ear infection)</td></tr></tbody></table></div>',
        'suggested_price' => 500,
        'method' => 'Conventional Culture (BA / MacConkey)',
        'sample_type' => 'Ear Discharge Swab',
        'tat_hours' => 72,
        'default_parameters' => [
            ['name' => 'Culture & Sensitivity', 'unit' => '', 'short_code' => 'ECUR', 'input_type' => 'culture_sensitivity', 'method' => 'Culture / Kirby-Bauer', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'No Growth', 'display_range' => 'No Growth']]],
        ],
    ],
    [
        'test_code' => 'EYE-CS',
        'name' => 'Eye Swab / Conjunctival Culture & Sensitivity',
        'category' => 'Microbiology',
        'description' => 'Culture of conjunctival/corneal swab for bacterial keratitis and conjunctivitis pathogens.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Eye Culture Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Organism</th><th>Condition</th></tr></thead><tbody><tr><td><strong>S. aureus</strong></td><td>Bacterial conjunctivitis, Blepharitis, Keratitis</td></tr><tr><td><strong>S. pneumoniae</strong></td><td>Acute bacterial conjunctivitis</td></tr><tr><td><strong>Pseudomonas</strong></td><td>Contact lens-related keratitis (sight-threatening)</td></tr><tr><td><strong>N. gonorrhoeae</strong></td><td>Ophthalmia neonatorum, Hyperacute conjunctivitis</td></tr><tr><td><strong>Chlamydia trachomatis</strong></td><td>Trachoma, Inclusion conjunctivitis</td></tr></tbody></table></div>',
        'suggested_price' => 600,
        'method' => 'Culture (BA / Chocolate Agar / Thioglycolate)',
        'sample_type' => 'Conjunctival / Corneal Swab',
        'tat_hours' => 72,
        'default_parameters' => [
            ['name' => 'Culture & Sensitivity', 'unit' => '', 'short_code' => 'EYCR', 'input_type' => 'culture_sensitivity', 'method' => 'Culture / Kirby-Bauer', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'No Growth', 'display_range' => 'No Growth']]],
        ],
    ],
    [
        'test_code' => 'HPYL',
        'name' => 'H. pylori Antigen (Stool)',
        'category' => 'Microbiology',
        'description' => 'Detects H. pylori antigen in stool. Non-invasive test for active infection diagnosis and post-treatment eradication confirmation.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">H. pylori Stool Antigen Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Negative</strong></td><td>No active H. pylori infection. If post-treatment: Eradication successful.</td></tr><tr><td><strong>Positive</strong></td><td>Active H. pylori infection. Associated with: Peptic ulcer disease, Gastric MALT lymphoma, Gastric cancer risk.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Stop PPIs for 2 weeks and antibiotics for 4 weeks before testing. For eradication confirmation, test at least 4 weeks after completing treatment.</div></div>',
        'suggested_price' => 800,
        'method' => 'ELISA / Rapid ICT (Immunochromatography)',
        'sample_type' => 'Fresh Stool',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'H. pylori Antigen', 'unit' => '', 'short_code' => 'HPAG', 'input_type' => 'selection', 'method' => 'ELISA / Rapid ICT', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
    [
        'test_code' => 'CDIFF',
        'name' => 'C. difficile Toxin (Stool)',
        'category' => 'Microbiology',
        'description' => 'Detects Clostridioides difficile toxins A/B in stool. Diagnosis of antibiotic-associated diarrhea/colitis.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">C. difficile Toxin Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>Negative</strong></td><td>C. difficile infection unlikely. Consider other causes of diarrhea.</td></tr><tr><td><strong>Positive (Toxin A/B)</strong></td><td>C. difficile Infection (CDI) confirmed. Stop offending antibiotic. Treat with oral Vancomycin or Fidaxomicin.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> Test only unformed (diarrheal) stool. Do NOT test asymptomatic patients or as test of cure. Risk factors: Recent antibiotics (Clindamycin, Fluoroquinolones, Cephalosporins), Hospitalization, PPI use.</div></div>',
        'suggested_price' => 1200,
        'method' => 'GDH + Toxin EIA / PCR',
        'sample_type' => 'Unformed Stool',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'GDH Screen', 'unit' => '', 'short_code' => 'CDGH', 'input_type' => 'selection', 'method' => 'EIA', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
            ['name' => 'Toxin A/B', 'unit' => '', 'short_code' => 'CDTX', 'input_type' => 'selection', 'method' => 'EIA / PCR', 'options' => ['Negative', 'Positive'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
    [
        'test_code' => 'MP-SMEAR',
        'name' => 'Malarial Parasite (Thick & Thin Smear)',
        'category' => 'Clinical Pathology',
        'description' => 'Gold standard microscopic detection and species identification of malaria parasites.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Malaria Smear Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Smear</th><th>Purpose</th><th>Findings</th></tr></thead><tbody><tr><td><strong>Thick Smear</strong></td><td>Screening (higher sensitivity)</td><td>Detects parasites at low parasitemia (&gt;50 parasites/µL)</td></tr><tr><td><strong>Thin Smear</strong></td><td>Species identification + Parasitemia %</td><td>P. vivax: Enlarged RBCs, Schuffner dots. P. falciparum: Multiple ring forms, Banana gametocytes.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> Negative smear does NOT exclude malaria. Repeat every 12-24 hours for 3 days. P. falciparum parasitemia &gt;2% requires urgent treatment.</div></div>',
        'suggested_price' => 150,
        'method' => 'Giemsa / Leishman Stain Microscopy',
        'sample_type' => 'EDTA Blood',
        'tat_hours' => 4,
        'default_parameters' => [
            ['name' => 'Thick Smear', 'unit' => '', 'short_code' => 'MPTH', 'input_type' => 'selection', 'method' => 'Giemsa Stain', 'options' => ['No Parasites Seen', 'Parasites Seen'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'No Parasites Seen', 'display_range' => 'No Parasites Seen']]],
            ['name' => 'Thin Smear', 'unit' => '', 'short_code' => 'MPTN', 'input_type' => 'text', 'method' => 'Giemsa Stain', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'No Parasites Seen', 'display_range' => 'No Parasites Seen']]],
            ['name' => 'Species', 'unit' => '', 'short_code' => 'MPSP', 'input_type' => 'text', 'method' => 'Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'N/A', 'display_range' => 'N/A']]],
            ['name' => 'Parasitemia', 'unit' => '%', 'short_code' => 'MPPD', 'input_type' => 'text', 'method' => 'Calculated', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'N/A', 'display_range' => 'N/A']]],
        ],
    ],
];
