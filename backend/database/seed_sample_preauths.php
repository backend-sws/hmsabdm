<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\InsurancePreauth;
use App\Models\PatientInsuranceDetail;
use App\Models\InsurancePayer;
use App\Models\IpdAdmission;
use App\Models\User;

$user = User::where('email', 'superadmin@hospital.com')->first() ?? User::first();
$hospitalId = $user->hospital_id ?? 26;
$userId = $user->id;

// Find policies
$policy1 = PatientInsuranceDetail::where('hospital_id', $hospitalId)->first();
$policy2 = PatientInsuranceDetail::where('hospital_id', $hospitalId)->skip(1)->first() ?? $policy1;

$payer1 = InsurancePayer::where('hospital_id', $hospitalId)->first();
$payer2 = InsurancePayer::where('hospital_id', $hospitalId)->skip(1)->first() ?? $payer1;

$admission1 = IpdAdmission::where('hospital_id', $hospitalId)->first();
$admission2 = IpdAdmission::where('hospital_id', $hospitalId)->skip(1)->first() ?? $admission1;

if (!$policy1 || !$payer1) {
    echo "No policies or payers found for hospital {$hospitalId}\n";
    exit(1);
}

$sampleData = [
    [
        'hospital_id'            => $hospitalId,
        'payer_id'               => $policy1->payer_id ?? $payer1->id,
        'patient_insurance_id'   => $policy1->id,
        'admission_id'           => $admission1 ? $admission1->id : null,
        'preauth_number'         => 'PA-2026-0001',
        'tpa_preauth_number'     => 'MED-APPR-99214',
        'preauth_type'           => 'initial',
        'status'                 => 'approved',
        'primary_diagnosis'      => 'Acute appendicitis with localized peritonitis (ICD-10: K35.3)',
        'proposed_treatment'     => 'Laparoscopic Appendectomy under General Anaesthesia',
        'estimated_amount'       => 55000.00,
        'approved_amount'        => 50000.00,
        'estimated_los_days'     => 2,
        'room_rent_per_day'      => 3000.00,
        'valid_till'             => now()->addDays(5)->toDateString(),
        'submitted_at'           => now()->subDays(2),
        'approved_at'            => now()->subDay(),
        'created_by'             => $userId,
    ],
    [
        'hospital_id'            => $hospitalId,
        'payer_id'               => $policy2->payer_id ?? $payer2->id,
        'patient_insurance_id'   => $policy2->id,
        'admission_id'           => $admission2 ? $admission2->id : null,
        'preauth_number'         => 'PA-2026-0002',
        'tpa_preauth_number'     => 'STAR-QRY-4491',
        'preauth_type'           => 'initial',
        'status'                 => 'queried',
        'primary_diagnosis'      => 'Calculus of gallbladder with acute cholecystitis (ICD-10: K80.0)',
        'proposed_treatment'     => 'Laparoscopic Cholecystectomy',
        'estimated_amount'       => 65000.00,
        'approved_amount'        => null,
        'estimated_los_days'     => 3,
        'room_rent_per_day'      => 3000.00,
        'tpa_query'              => 'Please provide previous USG whole abdomen report, surgeon notes, and medical certificate verifying first symptom duration.',
        'query_raised_at'        => now()->subHours(6),
        'submitted_at'           => now()->subDay(),
        'created_by'             => $userId,
    ],
    [
        'hospital_id'            => $hospitalId,
        'payer_id'               => $policy1->payer_id ?? $payer1->id,
        'patient_insurance_id'   => $policy1->id,
        'admission_id'           => $admission1 ? $admission1->id : null,
        'preauth_number'         => 'PA-2026-0003',
        'tpa_preauth_number'     => 'TPA-SUB-8812',
        'preauth_type'           => 'initial',
        'status'                 => 'submitted',
        'primary_diagnosis'      => 'Inguinal hernia, unilateral (ICD-10: K40.9)',
        'proposed_treatment'     => 'Open Inguinal Hernioplasty with Polypropylene Mesh',
        'estimated_amount'       => 42000.00,
        'approved_amount'        => null,
        'estimated_los_days'     => 2,
        'room_rent_per_day'      => 2500.00,
        'submitted_at'           => now()->subHours(2),
        'created_by'             => $userId,
    ],
];

foreach ($sampleData as $item) {
    InsurancePreauth::updateOrCreate(
        ['hospital_id' => $hospitalId, 'preauth_number' => $item['preauth_number']],
        $item
    );
}

echo "Successfully seeded " . count($sampleData) . " sample pre-authorizations for Hospital ID {$hospitalId}!\n";
