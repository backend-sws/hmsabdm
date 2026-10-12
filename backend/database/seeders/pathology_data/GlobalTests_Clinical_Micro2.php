<?php

// Clinical Microbiology Tests - Part 2: Stool Culture, AFB, Gram Stain, KOH, Body Fluid Analysis
return [
    [
        'test_code' => 'STLC',
        'name' => 'Stool Culture & Sensitivity',
        'category' => 'Microbiology',
        'description' => 'Identifies enteric pathogens causing infectious diarrhea. Fresh stool sample required.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Stool Culture Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Organism</th><th>Clinical Association</th></tr></thead><tbody><tr><td><strong>Salmonella spp.</strong></td><td>Enteric fever (Typhoid), Gastroenteritis</td></tr><tr><td><strong>Shigella spp.</strong></td><td>Bacillary dysentery (bloody diarrhea)</td></tr><tr><td><strong>Vibrio cholerae</strong></td><td>Rice-water stools, Severe dehydration</td></tr><tr><td><strong>E. coli (EHEC/ETEC)</strong></td><td>Travelers diarrhea, HUS (O157:H7)</td></tr><tr><td><strong>Campylobacter jejuni</strong></td><td>Most common bacterial cause worldwide, Guillain-Barre association</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Request specific media for Vibrio (TCBS) and Campylobacter (Skirrow medium) if suspected. C. difficile requires toxin assay, not routine stool culture.</div></div>',
        'suggested_price' => 700,
        'method' => 'Conventional Culture (SS / MacConkey / XLD Agar)',
        'sample_type' => 'Fresh Stool',
        'tat_hours' => 72,
        'default_parameters' => [
            ['name' => 'Culture & Sensitivity', 'unit' => '', 'short_code' => 'STCR', 'input_type' => 'culture_sensitivity', 'method' => 'Selective Media Culture / Kirby-Bauer', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'No Pathogen Isolated', 'display_range' => 'No Pathogen Isolated']]],
        ],
    ],
    [
        'test_code' => 'AFB-SM',
        'name' => 'AFB Smear (Ziehl-Neelsen Stain)',
        'category' => 'Microbiology',
        'description' => 'Acid-Fast Bacilli smear for Tuberculosis screening. Sputum, body fluids, or tissue.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">AFB Smear Grading (WHO/RNTCP)</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Grade</th><th>AFB Count</th><th>Fields Examined</th></tr></thead><tbody><tr><td><strong>Negative</strong></td><td>No AFB in 100 oil-immersion fields</td><td>300 fields</td></tr><tr><td><strong>Scanty (1-9 AFB)</strong></td><td>Record exact number</td><td>100 fields</td></tr><tr><td><strong>1+</strong></td><td>10-99 AFB per 100 fields</td><td>100 fields</td></tr><tr><td><strong>2+</strong></td><td>1-10 AFB per field</td><td>50 fields</td></tr><tr><td><strong>3+</strong></td><td>&gt; 10 AFB per field</td><td>20 fields</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11"><i class="feather-alert-triangle me-2"></i><strong>Important:</strong> Negative smear does NOT rule out TB (sensitivity ~60%). Confirm with GeneXpert MTB/RIF or culture. Three early morning samples recommended.</div></div>',
        'suggested_price' => 200,
        'method' => 'Ziehl-Neelsen (ZN) Stain / Auramine-Rhodamine (Fluorescent)',
        'sample_type' => 'Sputum (Early Morning)',
        'tat_hours' => 6,
        'default_parameters' => [
            ['name' => 'AFB Smear Result', 'unit' => '', 'short_code' => 'AFBS', 'input_type' => 'selection', 'method' => 'Ziehl-Neelsen Stain', 'options' => ['Negative', 'Scanty', '1+', '2+', '3+'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
        ],
    ],
    [
        'test_code' => 'AFB-CUL',
        'name' => 'AFB Culture (Mycobacterial Culture)',
        'category' => 'Microbiology',
        'description' => 'Gold standard for TB diagnosis. Detects M. tuberculosis and NTM. MGIT or LJ medium.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">AFB Culture Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Result</th><th>Clinical Significance</th></tr></thead><tbody><tr><td><strong>No Growth (8 weeks)</strong></td><td>Negative — Active TB unlikely (sensitivity ~80-85%)</td></tr><tr><td><strong>M. tuberculosis Complex</strong></td><td>Confirmed TB. Drug Sensitivity Testing (DST) mandatory.</td></tr><tr><td><strong>NTM (Non-Tuberculous Mycobacteria)</strong></td><td>M. avium, M. abscessus, M. kansasii — Clinical significance depends on site and patient immunity.</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> MGIT (liquid) detects growth in 1-3 weeks. LJ (solid) takes 4-8 weeks. GeneXpert provides rapid diagnosis (2 hours) with Rifampicin resistance.</div></div>',
        'suggested_price' => 1200,
        'method' => 'MGIT (Mycobacteria Growth Indicator Tube) / LJ Medium',
        'sample_type' => 'Sputum / Body Fluid / Tissue',
        'tat_hours' => 1344,
        'default_parameters' => [
            ['name' => 'Culture Result', 'unit' => '', 'short_code' => 'AFBC', 'input_type' => 'text', 'method' => 'MGIT / LJ Culture', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'No Growth', 'display_range' => 'No Growth']]],
            ['name' => 'Organism Identified', 'unit' => '', 'short_code' => 'AFBO', 'input_type' => 'text', 'method' => 'MPT64 / Biochemical', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'N/A', 'display_range' => 'N/A']]],
            ['name' => 'Drug Sensitivity', 'unit' => '', 'short_code' => 'AFBD', 'input_type' => 'text', 'method' => 'Proportion / MGIT-DST', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'N/A', 'display_range' => 'N/A']]],
        ],
    ],
    [
        'test_code' => 'GRAM',
        'name' => 'Gram Stain',
        'category' => 'Microbiology',
        'description' => 'Rapid microscopic examination to classify bacteria as Gram-positive or Gram-negative and guide empirical therapy.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">Gram Stain Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Finding</th><th>Common Organisms</th></tr></thead><tbody><tr><td><strong>Gram +ve Cocci in clusters</strong></td><td>Staphylococcus aureus, CoNS</td></tr><tr><td><strong>Gram +ve Cocci in chains</strong></td><td>Streptococcus species, Enterococcus</td></tr><tr><td><strong>Gram -ve Bacilli</strong></td><td>E. coli, Klebsiella, Pseudomonas, Proteus</td></tr><tr><td><strong>Gram +ve Bacilli</strong></td><td>Clostridium, Listeria, Corynebacterium</td></tr><tr><td><strong>Gram -ve Diplococci</strong></td><td>Neisseria (meningitidis, gonorrhoeae)</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> Gram stain provides preliminary results within 1 hour. Guides initial empirical antibiotic choice before culture results.</div></div>',
        'suggested_price' => 150,
        'method' => 'Gram Staining (Crystal Violet / Safranin)',
        'sample_type' => 'Pus / Body Fluid / Swab',
        'tat_hours' => 2,
        'default_parameters' => [
            ['name' => 'Gram Stain Result', 'unit' => '', 'short_code' => 'GRSM', 'input_type' => 'text', 'method' => 'Gram Stain Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'No Organisms Seen', 'display_range' => 'No Organisms Seen']]],
            ['name' => 'Pus Cells', 'unit' => '/HPF', 'short_code' => 'GRPC', 'input_type' => 'text', 'method' => 'Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Occasional', 'display_range' => 'Occasional']]],
        ],
    ],
    [
        'test_code' => 'KOH',
        'name' => 'KOH Mount (Fungal Wet Mount)',
        'category' => 'Microbiology',
        'description' => 'Direct microscopic examination for fungal elements using potassium hydroxide preparation.',
        'interpretation' => '<div class="detailed-interpretation"><h6 class="fw-bold text-primary mb-3">KOH Mount Interpretation</h6><table class="table table-bordered table-sm fs-12"><thead class="bg-light"><tr><th>Finding</th><th>Clinical Association</th></tr></thead><tbody><tr><td><strong>Negative</strong></td><td>No fungal elements seen. Does not rule out fungal infection — consider culture.</td></tr><tr><td><strong>Septate Hyphae</strong></td><td>Dermatophytes (Trichophyton, Microsporum), Aspergillus</td></tr><tr><td><strong>Non-septate (Aseptate) Hyphae</strong></td><td>Mucor, Rhizopus (Mucormycosis)</td></tr><tr><td><strong>Budding Yeast Cells</strong></td><td>Candida species</td></tr><tr><td><strong>Pseudohyphae + Yeast</strong></td><td>Candida albicans</td></tr></tbody></table><div class="mt-2 p-2 bg-soft-info border rounded-3 fs-11"><i class="feather-info me-2"></i><strong>Note:</strong> KOH dissolves keratin to make fungal elements visible. Add India ink for Cryptococcus (capsule visualization). Confirm with fungal culture.</div></div>',
        'suggested_price' => 100,
        'method' => '10-20% KOH (Potassium Hydroxide) Wet Mount',
        'sample_type' => 'Skin Scraping / Nail / Hair / Discharge',
        'tat_hours' => 2,
        'default_parameters' => [
            ['name' => 'KOH Mount Result', 'unit' => '', 'short_code' => 'KOHR', 'input_type' => 'selection', 'method' => 'KOH Wet Mount Microscopy', 'options' => ['Negative', 'Fungal Elements Seen'], 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Negative', 'display_range' => 'Negative']]],
            ['name' => 'Morphology', 'unit' => '', 'short_code' => 'KOHM', 'input_type' => 'text', 'method' => 'Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'N/A', 'display_range' => 'N/A']]],
        ],
    ],
];
