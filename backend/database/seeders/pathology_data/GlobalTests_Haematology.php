<?php

// Haematology Tests
return [
    [
        'test_code' => 'CBC',
        'name' => 'Complete Blood Count (CBC)',
        'category' => 'Haematology',
        'description' => 'Evaluates overall health and detects a wide range of disorders including anemia, infection and leukemia.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-primary mb-3">Clinical Interpretation of Complete Blood Count (CBC)</h6>
    <div class="table-responsive">
        <table class="table table-bordered table-sm fs-12">
            <thead class="bg-light">
                <tr><th>Parameter</th><th>Low Levels (Cytopenia)</th><th>High Levels (Cytosis)</th></tr>
            </thead>
            <tbody>
                <tr><td><strong>Hemoglobin (Hb)</strong></td><td>Anemia, Chronic blood loss, Nutritional deficiency (Iron/B12).</td><td>Polycythemia vera, Congenital heart disease, Chronic smoking, Dehydration.</td></tr>
                <tr><td><strong>WBC Count</strong></td><td>Leukopenia: Viral infections, Bone marrow suppression, Autoimmune disorders.</td><td>Leukocytosis: Acute infection, Inflammation, Tissue necrosis, Leukemia.</td></tr>
                <tr><td><strong>Platelet Count</strong></td><td>Thrombocytopenia: Dengue, Malaria, ITP, Bone marrow failure.</td><td>Thrombocytosis: Chronic inflammation, Splenectomy, Essential thrombocythemia.</td></tr>
                <tr><td><strong>RBC Indices</strong></td><td>Microcytic (Low MCV): Iron deficiency. Macrocytic (High MCV): B12/Folate deficiency.</td><td>Indicators of RBC morphology and hemoglobin concentration.</td></tr>
            </tbody>
        </table>
    </div>
    <div class="mt-3 p-2 bg-soft-info border rounded-3 fs-11">
        <i class="feather-info me-2"></i><strong>Note:</strong> CBC results must be correlated with clinical symptoms and peripheral smear findings for definitive diagnosis.
    </div>
</div>',
        'suggested_price' => 350,
        'default_parameters' => [
            [
                'name' => 'Hemoglobin (Hb)', 'unit' => 'g/dL', 'short_code' => 'HB', 'input_type' => 'numeric',
                'method' => 'Cyanmethemoglobin',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [
                    ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '13.0', 'max_val' => '17.0', 'display_range' => '13.0 - 17.0'],
                    ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '12.0', 'max_val' => '15.5', 'display_range' => '12.0 - 15.5'],
                ],
            ],
            [
                'name' => 'Total RBC Count', 'unit' => 'million/cumm', 'short_code' => 'RBC', 'input_type' => 'numeric',
                'method' => 'Electrical Impedance',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [
                    ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '4.5', 'max_val' => '5.5', 'display_range' => '4.5 - 5.5'],
                    ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '3.8', 'max_val' => '4.8', 'display_range' => '3.8 - 4.8'],
                ],
            ],
            [
                'name' => 'Packed Cell Volume (PCV)', 'unit' => '%', 'short_code' => 'PCV', 'input_type' => 'numeric',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [
                    ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '40', 'max_val' => '50', 'display_range' => '40 - 50'],
                    ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '36', 'max_val' => '46', 'display_range' => '36 - 46'],
                ],
            ],
            [
                'name' => 'Mean Corpuscular Volume (MCV)', 'unit' => 'fL', 'short_code' => 'MCV', 'input_type' => 'calculated',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '({PCV} * 10) / {RBC}',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '83', 'max_val' => '101', 'display_range' => '83 - 101']],
            ],
            [
                'name' => 'MCH', 'unit' => 'pg', 'short_code' => 'MCH', 'input_type' => 'calculated',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '({HB} * 10) / {RBC}',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '27', 'max_val' => '32', 'display_range' => '27 - 32']],
            ],
            [
                'name' => 'MCHC', 'unit' => 'g/dL', 'short_code' => 'MCHC', 'input_type' => 'calculated',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '({HB} * 100) / {PCV}',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '31.5', 'max_val' => '34.5', 'display_range' => '31.5 - 34.5']],
            ],
            [
                'name' => 'RDW-CV', 'unit' => '%', 'short_code' => 'RDW_CV', 'input_type' => 'numeric',
                'method' => 'Electrical Impedance',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '11.5', 'max_val' => '14.5', 'display_range' => '11.5 - 14.5']],
            ],
            [
                'name' => 'RDW-SD', 'unit' => 'fL', 'short_code' => 'RDW_SD', 'input_type' => 'numeric',
                'method' => 'Electrical Impedance',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '39', 'max_val' => '46', 'display_range' => '39 - 46']],
            ],
            [
                'name' => 'Total Leukocyte Count (TLC)', 'unit' => 'cells/cumm', 'short_code' => 'TLC', 'input_type' => 'numeric',
                'method' => 'Electrical Impedance',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '4000', 'max_val' => '11000', 'display_range' => '4000 - 11000']],
            ],
            [
                'name' => 'Neutrophils', 'unit' => '%', 'short_code' => 'NEU', 'input_type' => 'numeric',
                'method' => 'Flow Cytometry / Microscopy',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '40', 'max_val' => '80', 'display_range' => '40 - 80']],
            ],
            [
                'name' => 'Lymphocytes', 'unit' => '%', 'short_code' => 'LYM', 'input_type' => 'numeric',
                'method' => 'Flow Cytometry / Microscopy',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '20', 'max_val' => '45', 'display_range' => '20 - 45']],
            ],
            [
                'name' => 'Monocytes', 'unit' => '%', 'short_code' => 'MONO', 'input_type' => 'numeric',
                'method' => 'Flow Cytometry / Microscopy',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '2', 'max_val' => '10', 'display_range' => '2 - 10']],
            ],
            [
                'name' => 'Eosinophils', 'unit' => '%', 'short_code' => 'EOS', 'input_type' => 'numeric',
                'method' => 'Flow Cytometry / Microscopy',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1', 'max_val' => '6', 'display_range' => '1 - 6']],
            ],
            [
                'name' => 'Basophils', 'unit' => '%', 'short_code' => 'BASO', 'input_type' => 'numeric',
                'method' => 'Flow Cytometry / Microscopy',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '1', 'display_range' => '0 - 1']],
            ],
            [
                'name' => 'Platelet Count', 'unit' => 'lakhs/cumm', 'short_code' => 'PLT', 'input_type' => 'numeric',
                'method' => 'Electrical Impedance',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1.5', 'max_val' => '4.5', 'display_range' => '1.5 - 4.5']],
            ],
            [
                'name' => 'Mean Platelet Volume (MPV)', 'unit' => 'fL', 'short_code' => 'MPV', 'input_type' => 'numeric',
                'method' => 'Electrical Impedance',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '9.0', 'max_val' => '13.0', 'display_range' => '9.0 - 13.0']],
            ],
            [
                'name' => 'Platelet Distribution Width (PDW)', 'unit' => 'fL', 'short_code' => 'PDW', 'input_type' => 'numeric',
                'method' => 'Electrical Impedance',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '9.0', 'max_val' => '17.0', 'display_range' => '9.0 - 17.0']],
            ],
            [
                'name' => 'Plateletcrit (PCT)', 'unit' => '%', 'short_code' => 'PCT', 'input_type' => 'calculated',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '({PLT} * {MPV}) / 100',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.17', 'max_val' => '0.35', 'display_range' => '0.17 - 0.35']],
            ],
            [
                'name' => 'Platelet Large Cell Ratio (P-LCR)', 'unit' => '%', 'short_code' => 'P_LCR', 'input_type' => 'numeric',
                'method' => 'Electrical Impedance',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '13.0', 'max_val' => '43.0', 'display_range' => '13.0 - 43.0']],
            ],
            [
                'name' => 'Absolute Neutrophil Count (ANC)', 'unit' => 'cells/cumm', 'short_code' => 'ANC', 'input_type' => 'calculated',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '({NEU} * {TLC}) / 100',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '2000', 'max_val' => '7000', 'display_range' => '2000 - 7000']],
            ],
            [
                'name' => 'Absolute Lymphocyte Count (ALC)', 'unit' => 'cells/cumm', 'short_code' => 'ALC', 'input_type' => 'calculated',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '({LYM} * {TLC}) / 100',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1000', 'max_val' => '3000', 'display_range' => '1000 - 3000']],
            ],
            [
                'name' => 'Absolute Monocyte Count (AMC)', 'unit' => 'cells/cumm', 'short_code' => 'AMC', 'input_type' => 'calculated',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '({MONO} * {TLC}) / 100',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '200', 'max_val' => '1000', 'display_range' => '200 - 1000']],
            ],
            [
                'name' => 'Absolute Eosinophil Count (AEC)', 'unit' => 'cells/cumm', 'short_code' => 'AEC', 'input_type' => 'calculated',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '({EOS} * {TLC}) / 100',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '20', 'max_val' => '500', 'display_range' => '20 - 500']],
            ],
            [
                'name' => 'Absolute Basophil Count (ABC)', 'unit' => 'cells/cumm', 'short_code' => 'ABC', 'input_type' => 'calculated',
                'method' => 'Calculated',
                'range_type' => 'flexible', 'formula' => '({BASO} * {TLC}) / 100',
                'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '20', 'max_val' => '100', 'display_range' => '20 - 100']],
            ],
        ],
    ],
    [
        'test_code' => 'BG-RH',
        'name' => 'Blood Group & Rh Type',
        'category' => 'Haematology',
        'description' => 'Determination of ABO blood group and Rhesus factor.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-primary mb-2">ABO & Rh Factor Significance</h6>
    <p class="fs-12">The ABO blood group system is the most important blood type system in human blood transfusion. Antigens are located on the surface of the red blood cells.</p>
    <div class="row g-3 fs-11 mt-1">
        <div class="col-6">
            <div class="p-2 border rounded bg-light">
                <strong>Compatibility:</strong> Critical for blood transfusions to prevent acute hemolytic reactions.
            </div>
        </div>
        <div class="col-6">
            <div class="p-2 border rounded bg-light">
                <strong>Pregnancy:</strong> Rh compatibility between mother and fetus is essential to prevent Erythroblastosis Fetalis.
            </div>
        </div>
    </div>
</div>',
        'suggested_price' => 150,
        'default_parameters' => [
            [
                'name' => 'Blood Group', 'unit' => '', 'short_code' => 'BG', 'input_type' => 'selection',
                'method' => 'Slide Agglutination',
                'options' => ['A', 'B', 'AB', 'O'],
                'range_type' => 'flexible', 'formula' => '', 'ranges' => [],
            ],
            [
                'name' => 'Rh Factor', 'unit' => '', 'short_code' => 'RH', 'input_type' => 'selection',
                'method' => 'Slide Agglutination',
                'options' => ['Positive', 'Negative'],
                'range_type' => 'flexible', 'formula' => '', 'ranges' => [],
            ],
        ],
    ],
    [
        'test_code' => 'ESR',
        'name' => 'Erythrocyte Sedimentation Rate (ESR)',
        'category' => 'Haematology',
        'description' => 'Non-specific measure of inflammation. Westergren method.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-danger mb-2">ESR Clinical Correlation</h6>
    <p class="fs-12">The Erythrocyte Sedimentation Rate is a non-specific marker of inflammation. It measures how quickly red blood cells sink to the bottom of a tube of anticoagulated blood.</p>
    <ul class="fs-12">
        <li><strong>Significant Elevation (>100 mm/hr):</strong> Suggests Multiple Myeloma, Temporal Arteritis, or severe systemic infection.</li>
        <li><strong>Moderate Elevation:</strong> Seen in Pregnancy, Rheumatoid Arthritis, Anemia, and various infections.</li>
    </ul>
    <div class="alert alert-soft-warning py-2 px-3 fs-11">ESR is not used for specific diagnosis but for monitoring disease activity and response to treatment.</div>
</div>',
        'suggested_price' => 100,
        'default_parameters' => [
            [
                'name' => 'ESR (Westergren)', 'unit' => 'mm/1st hr', 'short_code' => 'ESR', 'input_type' => 'numeric',
                'method' => 'Westergren Method',
                'range_type' => 'flexible', 'formula' => '',
                'ranges' => [
                    ['gender' => 'Male', 'age_min' => 0, 'age_max' => 50, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '15', 'display_range' => '0 - 15'],
                    ['gender' => 'Male', 'age_min' => 51, 'age_max' => 150, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '20', 'display_range' => '0 - 20'],
                    ['gender' => 'Female', 'age_min' => 0, 'age_max' => 50, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '20', 'display_range' => '0 - 20'],
                    ['gender' => 'Female', 'age_min' => 51, 'age_max' => 150, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '30', 'display_range' => '0 - 30'],
                ],
            ],
        ],
    ],
    [
        'test_code' => 'PS',
        'name' => 'Peripheral Blood Smear',
        'category' => 'Haematology',
        'description' => 'Microscopic examination of blood film for RBC morphology, WBC differential and platelet estimation.',
        'interpretation' => 'RBC morphology assessment helps differentiate types of anemia. WBC morphology helps identify blast cells or abnormal forms.',
        'suggested_price' => 200,
        'default_parameters' => [
            ['name' => 'RBC Morphology', 'unit' => '', 'short_code' => 'RBCM', 'input_type' => 'text', 'method' => 'Leishman Stain / Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Normocytic Normochromic', 'display_range' => 'n/a']]],
            ['name' => 'WBC Morphology', 'unit' => '', 'short_code' => 'WBCM', 'input_type' => 'text', 'method' => 'Leishman Stain / Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Normal', 'display_range' => 'n/a']]],
            ['name' => 'Platelet Estimate', 'unit' => '', 'short_code' => 'PLTE', 'input_type' => 'text', 'method' => 'Leishman Stain / Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Adequate', 'display_range' => 'n/a']]],
            ['name' => 'Parasites', 'unit' => '', 'short_code' => 'PARA', 'input_type' => 'text', 'method' => 'Leishman Stain / Microscopy', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'normal_value' => 'Not Seen', 'display_range' => 'n/a']]],
        ],
    ],
    [
        'test_code' => 'RETIC',
        'name' => 'Reticulocyte Count',
        'category' => 'Haematology',
        'description' => 'Measures immature red blood cells. Useful in evaluating bone marrow response.',
        'interpretation' => '<table><tr><th>Level</th><th>Significance</th></tr><tr><td>Low (&lt; 0.5%)</td><td>Bone marrow suppression, Aplastic anemia</td></tr><tr><td>Normal (0.5 - 2.5%)</td><td>Normal bone marrow function</td></tr><tr><td>High (&gt; 2.5%)</td><td>Hemolytic anemia, Blood loss recovery</td></tr></table>',
        'suggested_price' => 200,
        'default_parameters' => [
            ['name' => 'Reticulocyte Count', 'unit' => '%', 'short_code' => 'RETIC', 'input_type' => 'numeric', 'method' => 'Supravital Staining (Brilliant Cresyl Blue)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.5', 'max_val' => '2.5', 'display_range' => '0.5 - 2.5']]],
        ],
    ],
    [
        'test_code' => 'BT-CT',
        'name' => 'Bleeding Time & Clotting Time',
        'category' => 'Haematology',
        'description' => 'Screening tests for platelet function and coagulation pathway.',
        'interpretation' => 'Prolonged BT: Platelet disorders, Von Willebrand disease. Prolonged CT: Factor deficiency, Hemophilia, Anticoagulant therapy.',
        'suggested_price' => 150,
        'default_parameters' => [
            ['name' => 'Bleeding Time (BT)', 'unit' => 'minutes', 'short_code' => 'BT', 'input_type' => 'numeric', 'method' => 'Duke Method', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1', 'max_val' => '6', 'display_range' => '1 - 6']]],
            ['name' => 'Clotting Time (CT)', 'unit' => 'minutes', 'short_code' => 'CT', 'input_type' => 'numeric', 'method' => 'Capillary Tube Method', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '4', 'max_val' => '9', 'display_range' => '4 - 9']]],
        ],
    ],
    [
        'test_code' => 'PT-INR',
        'name' => 'Prothrombin Time (PT/INR)',
        'category' => 'Haematology',
        'description' => 'Evaluates extrinsic and common coagulation pathways. Essential for warfarin monitoring.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-primary mb-2">PT/INR Clinical Guidelines</h6>
    <div class="table-responsive">
        <table class="table table-sm table-bordered fs-11">
            <thead class="bg-light"><tr><th>INR Range</th><th>Interpretation & Clinical Use</th></tr></thead>
            <tbody>
                <tr><td><strong>&lt; 1.1</strong></td><td>Normal range for healthy individuals not on anticoagulants.</td></tr>
                <tr><td><strong>2.0 - 3.0</strong></td><td>Target range for patients on Warfarin for DVT, PE, or Atrial Fibrillation.</td></tr>
                <tr><td><strong>2.5 - 3.5</strong></td><td>Target range for patients with mechanical prosthetic heart valves.</td></tr>
                <tr><td><strong>&gt; 4.5</strong></td><td>Critical Value: High risk of spontaneous bleeding. Requires immediate clinical attention.</td></tr>
            </tbody>
        </table>
    </div>
</div>',
        'suggested_price' => 350,
        'default_parameters' => [
            ['name' => 'Prothrombin Time (PT)', 'unit' => 'seconds', 'short_code' => 'PT', 'input_type' => 'numeric', 'method' => 'Coagulometry (Clot Detection)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '11', 'max_val' => '16', 'display_range' => '11 - 16']]],
            ['name' => 'Control', 'unit' => 'seconds', 'short_code' => 'CTRL', 'input_type' => 'numeric', 'method' => 'Coagulometry (Clot Detection)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '12', 'max_val' => '16', 'display_range' => '12 - 16']]],
            ['name' => 'INR', 'unit' => '', 'short_code' => 'INR', 'input_type' => 'numeric', 'method' => 'Calculated', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.8', 'max_val' => '1.1', 'display_range' => '0.8 - 1.1']]],
        ],
    ],
    [
        'test_code' => 'APTT',
        'name' => 'Activated Partial Thromboplastin Time (APTT)',
        'category' => 'Haematology',
        'description' => 'Evaluates intrinsic coagulation pathway. Used for heparin monitoring.',
        'interpretation' => 'Prolonged APTT: Hemophilia A/B, Von Willebrand, Heparin therapy, Lupus anticoagulant, DIC.',
        'suggested_price' => 400,
        'default_parameters' => [
            ['name' => 'APTT (Patient)', 'unit' => 'seconds', 'short_code' => 'APTT', 'input_type' => 'numeric', 'method' => 'Coagulometry (Clot Detection)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '25', 'max_val' => '35', 'display_range' => '25 - 35']]],
            ['name' => 'APTT (Control)', 'unit' => 'seconds', 'short_code' => 'APTTC', 'input_type' => 'numeric', 'method' => 'Coagulometry (Clot Detection)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '25', 'max_val' => '35', 'display_range' => '25 - 35']]],
        ],
    ],
    [
        'test_code' => 'DDIMER',
        'name' => 'D-Dimer',
        'category' => 'Haematology',
        'description' => 'Fibrin degradation product. Used to rule out DVT, PE, and DIC.',
        'interpretation' => '<table><tr><th>Range</th><th>Significance</th></tr><tr><td>&lt; 0.5 µg/mL</td><td>Normal — DVT/PE unlikely</td></tr><tr><td>0.5 - 1.0 µg/mL</td><td>Borderline — Correlate clinically</td></tr><tr><td>&gt; 1.0 µg/mL</td><td>Elevated — Consider DVT, PE, DIC</td></tr></table>',
        'suggested_price' => 800,
        'default_parameters' => [
            ['name' => 'D-Dimer', 'unit' => 'µg/mL FEU', 'short_code' => 'DDIM', 'input_type' => 'numeric', 'method' => 'Immunoturbidimetry', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '0.5', 'display_range' => '0 - 0.5']]],
        ],
    ],
];
