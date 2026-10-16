<?php

namespace App\Services\Abdm;

use Illuminate\Support\Str;

class MockAbdmService implements AbdmServiceInterface
{
    public function getGatewayToken(): string
    {
        return 'mock-gateway-token-' . time();
    }

    public function getPublicKey(): string
    {
        return 'mock-public-key-' . time();
    }

    public function encryptData(string $data): string
    {
        return 'encrypted-' . base64_encode($data);
    }

    public function generateOtp(string $loginId, string $loginHint, array $scopes, string $otpSystem): array
    {
        return [
            'txnId' => (string) Str::uuid(),
            'message' => 'OTP sent successfully (Mock)',
        ];
    }

    public function verifyOtp(string $txnId, string $otpValue, array $scopes): array
    {
        // Mock verification - any OTP containing '123' (even encrypted) works
        if (str_contains($otpValue, '123')) {
            return [
                'token' => 'mock-auth-token-' . Str::random(10),
                'isNew' => false, // false if existing ABHA, true if creating
            ];
        }

        throw new \App\Exceptions\AbdmApiException('Invalid OTP', 'AUTH_401', [], 401);
    }

    public function generateAadhaarOtp(string $aadhaar, array $scopes = ['abha-enrol']): array
    {
        return [
            'txnId' => (string) Str::uuid(),
            'message' => 'Aadhaar OTP sent successfully (Mock)',
        ];
    }

    public function verifyAadhaarOtp(string $txnId, string $otpValue, string $mobile, array $scopes = ['abha-enrol']): array
    {
        if (str_contains($otpValue, '123')) {
            return [
                'token' => 'mock-abha-token-' . Str::random(10),
                'abhaAddress' => 'user.mock@abdm',
                'abhaNumber' => '91-1234-5678-9012',
            ];
        }
        throw new \App\Exceptions\AbdmApiException('Invalid Aadhaar OTP', 'AUTH_401', [], 401);
    }

    public function getProfile(string $token): array
    {
        return [
            'abhaNumber' => '91-9999-8888-7777',
            'abhaAddress' => 'mockuser@abdm',
            'name' => 'Mock User',
            'gender' => 'M',
            'yearOfBirth' => '1990',
            'mobile' => '9876543210'
        ];
    }

    public function decryptScanAndSharePayload(string $encryptedPayload): array
    {
        return ['mock' => 'data'];
    }

    public function generateMobileOtpForLinking(string $mobile, string $txnId, array $scopes = ['abha-enrol', 'mobile-verify']): array
    {
        return [
            'txnId' => (string) Str::uuid(),
            'message' => 'Mobile OTP for linking sent successfully (Mock)'
        ];
    }

    public function verifyMobileOtpForLinking(string $txnId, string $otpValue, array $scopes = ['abha-enrol', 'mobile-verify']): array
    {
        if (str_contains($otpValue, '123')) {
            return [
                'authCode' => 'mock-auth-code',
                'message' => 'Mobile linked successfully (Mock)'
            ];
        }
        throw new \App\Exceptions\AbdmApiException('Invalid OTP', 'AUTH_401', [], 401);
    }

    public function suggestAbhaAddress(string $txnId, string $token): array
    {
        return [
            'abhaAddresses' => [
                'user.123@abdm',
                'user.abc@abdm'
            ]
        ];
    }

    public function createAbhaAddress(string $txnId, string $abhaAddress, string $token): array
    {
        return [
            'message' => 'ABHA address linked successfully (Mock)',
            'abhaAddress' => $abhaAddress
        ];
    }

    public function searchAbha(string $mobile): array
    {
        return [
            'accounts' => [
                [
                    'abhaNumber' => '91-1234-5678-9012',
                    'name' => 'Mock User',
                    'status' => 'ACTIVE'
                ]
            ]
        ];
    }

    public function downloadAbhaCard(string $token): array
    {
        return ['data' => base64_encode('Mock PDF Data')];
    }

    public function downloadQrCode(string $token): array
    {
        return ['data' => base64_encode('Mock PNG Data')];
    }

    public function verifyUser(string $transferToken, string $txnId, string $abhaNumber): array
    {
        return [
            'token' => 'mock_account_token_' . md5($abhaNumber),
            'expiresIn' => 1800,
        ];
    }
}
