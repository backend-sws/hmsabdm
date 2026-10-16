<?php

// Liver & Kidney Function Tests
return [
    [
        'test_code' => 'LFT',
        'name' => 'Liver Function Test (LFT)',
        'category' => 'Biochemistry',
        'description' => 'Comprehensive liver panel including bilirubin, enzymes and proteins.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-primary mb-3">Liver Function Test (LFT) Interpretation</h6>
    <p class="fs-12">LFTs are a group of blood tests that measure enzymes, proteins, and substances produced by the liver.</p>
    <div class="table-responsive">
        <table class="table table-bordered table-sm fs-11">
            <thead class="bg-light"><tr><th>Pattern</th><th>Findings</th><th>Clinical Correlation</th></tr></thead>
            <tbody>
                <tr><td><strong>Hepatocellular</strong></td><td>ALT & AST significantly elevated. ALP mild increase.</td><td>Viral hepatitis, Drug/Alcohol toxicity, Fatty liver.</td></tr>
                <tr><td><strong>Cholestatic</strong></td><td>ALP & GGT significantly elevated. Bilirubin may be high.</td><td>Biliary obstruction, Gallstones, Primary Biliary Cirrhosis.</td></tr>
                <tr><td><strong>Synthetic Failure</strong></td><td>Low Albumin, Prolonged PT/INR.</td><td>Chronic Liver Disease, Cirrhosis, Acute Liver Failure.</td></tr>
            </tbody>
        </table>
    </div>
    <div class="alert alert-soft-info py-2 px-3 fs-10 mt-2">Note: Isolated elevation of AST/ALT ratio > 2 suggests alcoholic liver disease.</div>
</div>',
        'suggested_price' => 500,
        'default_parameters' => [
            ['name' => 'Total Bilirubin', 'unit' => 'mg/dL', 'short_code' => 'TBIL', 'input_type' => 'numeric', 'method' => 'Diazo Method (Jendrassik-Grof)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.1', 'max_val' => '1.2', 'display_range' => '0.1 - 1.2']]],
            ['name' => 'Direct Bilirubin', 'unit' => 'mg/dL', 'short_code' => 'DBIL', 'input_type' => 'numeric', 'method' => 'Diazo Method (Jendrassik-Grof)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.0', 'max_val' => '0.3', 'display_range' => '0.0 - 0.3']]],
            ['name' => 'Indirect Bilirubin', 'unit' => 'mg/dL', 'short_code' => 'IBIL', 'input_type' => 'calculated', 'method' => 'Calculated', 'range_type' => 'flexible', 'formula' => '{TBIL} - {DBIL}', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.1', 'max_val' => '0.9', 'display_range' => '0.1 - 0.9']]],
            ['name' => 'SGOT (AST)', 'unit' => 'U/L', 'short_code' => 'AST', 'input_type' => 'numeric', 'method' => 'IFCC Modified (Kinetic UV)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '40', 'display_range' => '0 - 40']]],
            ['name' => 'SGPT (ALT)', 'unit' => 'U/L', 'short_code' => 'ALT', 'input_type' => 'numeric', 'method' => 'IFCC Modified (Kinetic UV)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '40', 'display_range' => '0 - 40']]],
            ['name' => 'Alkaline Phosphatase (ALP)', 'unit' => 'U/L', 'short_code' => 'ALP', 'input_type' => 'numeric', 'method' => 'PNPP (p-Nitrophenyl Phosphate)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '44', 'max_val' => '147', 'display_range' => '44 - 147']]],
            ['name' => 'GGT', 'unit' => 'U/L', 'short_code' => 'GGT', 'input_type' => 'numeric', 'method' => 'IFCC (Kinetic Photometric)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '8', 'max_val' => '61', 'display_range' => '8 - 61'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '5', 'max_val' => '36', 'display_range' => '5 - 36'],
            ]],
            ['name' => 'Total Protein', 'unit' => 'g/dL', 'short_code' => 'TP', 'input_type' => 'numeric', 'method' => 'Biuret Method', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '6.0', 'max_val' => '8.3', 'display_range' => '6.0 - 8.3']]],
            ['name' => 'Albumin', 'unit' => 'g/dL', 'short_code' => 'ALB', 'input_type' => 'numeric', 'method' => 'BCG (Bromocresol Green)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '3.5', 'max_val' => '5.5', 'display_range' => '3.5 - 5.5']]],
            ['name' => 'Globulin', 'unit' => 'g/dL', 'short_code' => 'GLOB', 'input_type' => 'calculated', 'method' => 'Calculated', 'range_type' => 'flexible', 'formula' => '{TP} - {ALB}', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '2.0', 'max_val' => '3.5', 'display_range' => '2.0 - 3.5']]],
            ['name' => 'A/G Ratio', 'unit' => '', 'short_code' => 'AG', 'input_type' => 'calculated', 'method' => 'Calculated', 'range_type' => 'flexible', 'formula' => '{ALB} / ({TP} - {ALB})', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '1.1', 'max_val' => '2.5', 'display_range' => '1.1 - 2.5']]],
        ],
    ],
    [
        'test_code' => 'KFT',
        'name' => 'Kidney Function Test (KFT/RFT)',
        'category' => 'Biochemistry',
        'description' => 'Renal function panel.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-primary mb-2">Kidney Function Test (KFT) Significance</h6>
    <p class="fs-12">Renal function tests help evaluate how well the kidneys are filtering waste from the blood.</p>
    <div class="row g-2 fs-11">
        <div class="col-6">
            <div class="p-2 border rounded bg-light">
                <strong>Serum Creatinine:</strong> Most reliable indicator of kidney function. Elevated levels suggest impaired GFR.
            </div>
        </div>
        <div class="col-6">
            <div class="p-2 border rounded bg-light">
                <strong>BUN/Urea:</strong> Influenced by diet and hydration. High BUN-to-Creatinine ratio may indicate dehydration.
            </div>
        </div>
    </div>
    <div class="mt-2 p-2 bg-soft-warning border rounded-3 fs-11">
        <strong>Electrolytes:</strong> Sodium, Potassium, and Chloride balance is crucial for nerve and muscle function and acid-base balance.
    </div>
</div>',
        'suggested_price' => 450,
        'default_parameters' => [
            ['name' => 'Blood Urea', 'unit' => 'mg/dL', 'short_code' => 'UREA', 'input_type' => 'numeric', 'method' => 'Urease-GLDH (Enzymatic UV)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '15', 'max_val' => '40', 'display_range' => '15 - 40']]],
            ['name' => 'BUN', 'unit' => 'mg/dL', 'short_code' => 'BUN', 'input_type' => 'calculated', 'method' => 'Calculated', 'range_type' => 'flexible', 'formula' => '{UREA} / 2.14', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '7', 'max_val' => '20', 'display_range' => '7 - 20']]],
            ['name' => 'Serum Creatinine', 'unit' => 'mg/dL', 'short_code' => 'CREAT', 'input_type' => 'numeric', 'method' => 'Modified Jaffe (Kinetic)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.7', 'max_val' => '1.3', 'display_range' => '0.7 - 1.3'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0.6', 'max_val' => '1.1', 'display_range' => '0.6 - 1.1'],
            ]],
            ['name' => 'Uric Acid', 'unit' => 'mg/dL', 'short_code' => 'UA', 'input_type' => 'numeric', 'method' => 'Uricase-PAP (Enzymatic Colorimetric)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [
                ['gender' => 'Male', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '3.4', 'max_val' => '7.0', 'display_range' => '3.4 - 7.0'],
                ['gender' => 'Female', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '2.4', 'max_val' => '6.0', 'display_range' => '2.4 - 6.0'],
            ]],
            ['name' => 'Sodium (Na)', 'unit' => 'mEq/L', 'short_code' => 'NA', 'input_type' => 'numeric', 'method' => 'ISE (Ion Selective Electrode)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '136', 'max_val' => '146', 'display_range' => '136 - 146']]],
            ['name' => 'Potassium (K)', 'unit' => 'mEq/L', 'short_code' => 'K', 'input_type' => 'numeric', 'method' => 'ISE (Ion Selective Electrode)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '3.5', 'max_val' => '5.1', 'display_range' => '3.5 - 5.1']]],
            ['name' => 'Chloride (Cl)', 'unit' => 'mEq/L', 'short_code' => 'CL', 'input_type' => 'numeric', 'method' => 'ISE (Ion Selective Electrode)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '98', 'max_val' => '106', 'display_range' => '98 - 106']]],
            ['name' => 'Calcium', 'unit' => 'mg/dL', 'short_code' => 'CA', 'input_type' => 'numeric', 'method' => 'Arsenazo III (Photometric)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '8.5', 'max_val' => '10.5', 'display_range' => '8.5 - 10.5']]],
            ['name' => 'Phosphorus', 'unit' => 'mg/dL', 'short_code' => 'PHOS', 'input_type' => 'numeric', 'method' => 'Phosphomolybdate (UV)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '2.5', 'max_val' => '4.5', 'display_range' => '2.5 - 4.5']]],
        ],
    ],
    [
        'test_code' => 'AMY',
        'name' => 'Serum Amylase',
        'category' => 'Biochemistry',
        'description' => 'Pancreatic enzyme.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-primary mb-2">Serum Amylase Interpretation</h6>
    <p class="fs-12">Amylase is an enzyme produced primarily by the pancreas and salivary glands to help digest carbohydrates.</p>
    <ul class="fs-11">
        <li><strong>Significant Elevation (>3x Normal):</strong> Highly suggestive of Acute Pancreatitis.</li>
        <li><strong>Other Causes of Elevation:</strong> Salivary gland inflammation (Mumps), Pancreatic cancer, Perforated peptic ulcer, or Intestinal obstruction.</li>
    </ul>
    <div class="alert alert-soft-info py-2 px-3 fs-10">Note: Amylase levels usually rise within 12 hours of onset and return to normal in 3-5 days.</div>
</div>',
        'suggested_price' => 350,
        'default_parameters' => [
            ['name' => 'Serum Amylase', 'unit' => 'U/L', 'short_code' => 'AMY', 'input_type' => 'numeric', 'method' => 'CNPG3 (Enzymatic Kinetic)', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '28', 'max_val' => '100', 'display_range' => '28 - 100']]],
        ],
    ],
    [
        'test_code' => 'LIPASE',
        'name' => 'Serum Lipase',
        'category' => 'Biochemistry',
        'description' => 'Specific for pancreatic disease.',
        'interpretation' => '<div class="detailed-interpretation">
    <h6 class="fw-bold text-primary mb-2">Serum Lipase Clinical Significance</h6>
    <p class="fs-12">Lipase is more specific than amylase for diagnosing pancreatic diseases.</p>
    <ul class="fs-11">
        <li><strong>Acute Pancreatitis:</strong> Levels rise within 4-8 hours and stay elevated for up to 14 days, making it more useful for late diagnosis.</li>
        <li><strong>Specificity:</strong> Unlike amylase, lipase is not produced by salivary glands, providing higher specificity for the pancreas.</li>
    </ul>
</div>',
        'suggested_price' => 400,
        'default_parameters' => [
            ['name' => 'Serum Lipase', 'unit' => 'U/L', 'short_code' => 'LIP', 'input_type' => 'numeric', 'method' => 'Enzymatic Colorimetric', 'range_type' => 'flexible', 'formula' => '', 'ranges' => [['gender' => 'Both', 'age_min' => 0, 'age_max' => 120, 'age_unit' => 'Years', 'min_val' => '0', 'max_val' => '160', 'display_range' => '0 - 160']]],
        ],
    ],
];
