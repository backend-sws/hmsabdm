<?php

namespace App\Services\Abdm;

class MockAbdmService implements AbdmServiceInterface
{
    public function generateOtp(string $mobile): array
    {
        return [
            'success' => true,
            'txnId'   => 'mock-txn-' . uniqid(),
            'message' => 'Mock OTP sent successfully.'
        ];
    }

    public function verifyOtp(string $txnId, string $otp): array
    {
        return [
            'success' => true,
            'token'   => 'mock-token-' . uniqid(),
            'abha'    => '91-1234-5678-9012',
            'message' => 'Mock OTP verified.'
        ];
    }

    public function createAbha(array $data): array
    {
        return [
            'success' => true,
            'abha'    => '91-' . rand(1000, 9999) . '-' . rand(1000, 9999) . '-' . rand(1000, 9999),
            'message' => 'Mock ABHA created successfully.'
        ];
    }

    public function processScanAndShare(array $payload): array
    {
        return [
            'success' => true,
            'token'   => 'TKN-' . rand(100, 999),
            'patient' => [
                'name'   => $payload['name'] ?? 'Mock Patient',
                'gender' => $payload['gender'] ?? 'M',
                'dob'    => $payload['dob'] ?? '1990-01-01',
                'abha'   => $payload['abha'] ?? '91-0000-0000-0000'
            ]
        ];
    }
}
