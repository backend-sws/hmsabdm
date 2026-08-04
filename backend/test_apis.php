<?php
require_once '/var/www/vendor/autoload.php';
$app = require_once '/var/www/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Http;

$baseUrl = 'http://hms_nginx/api/v1';

echo "==========================================\n";
echo "   🚀 ABDM API INTEGRATION TESTER\n";
echo "==========================================\n\n";

// 1. Login to get token
echo "[1] Testing Authentication (/login)...\n";
$loginRes = Http::post("$baseUrl/login", [
    'email' => 'reception@demo.com',
    'password' => 'password'
]);

if ($loginRes->failed()) {
    echo "❌ Login Failed: " . $loginRes->body() . "\n";
    exit(1);
}
$token = $loginRes->json('data.token');
echo "✅ Login Successful. Token acquired.\n\n";

$headers = [
    'Authorization' => "Bearer $token",
    'Accept' => 'application/json'
];

// 2. Test Mobile OTP (ABHA Login Flow)
echo "[2] Testing ABHA Login Flow - Mobile OTP (/abha/generate-otp)...\n";
$mobileOtpRes = Http::withHeaders($headers)->post("$baseUrl/abha/generate-otp", [
    'mobile' => '9876543210' // Dummy number for sandbox
]);

if ($mobileOtpRes->successful()) {
    echo "✅ Success! Response:\n";
    echo json_encode($mobileOtpRes->json(), JSON_PRETTY_PRINT) . "\n\n";
} else {
    echo "❌ Failed! Status: " . $mobileOtpRes->status() . "\n";
    echo $mobileOtpRes->body() . "\n\n";
}

// 3. Test Aadhaar OTP (ABHA Enrolment Flow)
echo "[3] Testing ABHA Enrolment Flow - Aadhaar OTP (/abha/enrol/aadhaar-otp)...\n";
$aadhaarOtpRes = Http::withHeaders($headers)->post("$baseUrl/abha/enrol/aadhaar-otp", [
    'aadhaar' => '123456789012' // Dummy Aadhaar for sandbox
]);

if ($aadhaarOtpRes->successful()) {
    echo "✅ Success! Response:\n";
    echo json_encode($aadhaarOtpRes->json(), JSON_PRETTY_PRINT) . "\n\n";
} else {
    echo "❌ Failed! Status: " . $aadhaarOtpRes->status() . "\n";
    echo $aadhaarOtpRes->body() . "\n\n";
}

echo "==========================================\n";
echo "  🏁 INITIAL FLOWS TESTING COMPLETED\n";
echo "==========================================\n";
