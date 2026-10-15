<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\InsuranceClaim;
use App\Models\InsurancePreauth;
use App\Models\PatientInsuranceDetail;
use App\Models\InsurancePayer;
use App\Models\IpdAdmission;
use App\Models\User;

$user = User::where('email', 'superadmin@hospital.com')->first() ?? User::first();
$hospitalId = $user->hospital_id ?? 26;
$userId = $user->id;

$preauth = InsurancePreauth::where('hospital_id', $hospitalId)->where('status', 'approved')->first();
$policy = PatientInsuranceDetail::where('hospital_id', $hospitalId)->first();
$payer = InsurancePayer::where('hospital_id', $hospitalId)->first();
$admission = IpdAdmission::where('hospital_id', $hospitalId)->first();

if (!$policy || !$payer) {
    echo "No policies or payers found\n";
    exit(1);
}

$sampleClaims = [
    [
        'hospital_id'            => $hospitalId,
        'payer_id'               => $payer->id,
        'patient_insurance_id'   => $policy->id,
        'admission_id'           => $admission ? $admission->id : null,
        'preauth_id'             => $preauth ? $preauth->id : null,
        'claim_number'           => 'CLM-2026-0001',
        'tpa_claim_number'       => 'MED-CLM-77821',
        'claim_type'             => 'cashless',
        'status'                 => 'submitted',
        'total_bill_amount'      => 58000.00,
        'claimed_amount'         => 55000.00,
        'non_payable_amount'     => 3000.00,
        'submission_date'        => now()->subDays(5)->toDateString(),
        'expected_settlement_date' => now()->addDays(25)->toDateString(),
        'created_by'             => $userId,
    ],
    [
        'hospital_id'            => $hospitalId,
        'payer_id'               => $payer->id,
        'patient_insurance_id'   => $policy->id,
        'admission_id'           => $admission ? $admission->id : null,
        'claim_number'           => 'CLM-2026-0002',
        'tpa_claim_number'       => 'STAR-CLM-1192',
        'claim_type'             => 'cashless',
        'status'                 => 'approved',
        'total_bill_amount'      => 68000.00,
        'claimed_amount'         => 65000.00,
        'approved_amount'        => 62000.00,
        'non_payable_amount'     => 3000.00,
        'submission_date'        => now()->subDays(12)->toDateString(),
        'created_by'             => $userId,
    ],
];

foreach ($sampleClaims as $claim) {
    InsuranceClaim::updateOrCreate(
        ['hospital_id' => $hospitalId, 'claim_number' => $claim['claim_number']],
        $claim
    );
}

echo "Successfully seeded " . count($sampleClaims) . " sample claims for Hospital ID {$hospitalId}!\n";
