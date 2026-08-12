<?php

namespace App\Services\Abdm;

interface AbdmServiceInterface
{
    /**
     * Get a valid access token (Gateway token)
     * Handles fetching and caching for the Sandbox Gateway API.
     */
    public function getGatewayToken(): string;

    /**
     * Get the ABDM Public Certificate for RSA Encryption
     * GET /v3/profile/public/certificate
     */
    public function getPublicKey(): string;

    /**
     * Encrypt sensitive data using the ABDM Public Key (RSA/ECB/PKCS1Padding)
     */
    public function encryptData(string $data): string;

    /**
     * Generate OTP for Mobile (Aadhaar authentication/linking)
     * POST /v3/profile/login/request/otp (or equivalent M1 flow)
     */
    public function generateOtp(string $loginId, string $loginHint, array $scopes, string $otpSystem): array;

    /**
     * Verify the OTP
     * POST /v3/profile/login/verify (or equivalent M1 flow)
     */
    public function verifyOtp(string $txnId, string $otpValue, array $scopes): array;

    /**
     * Generate Aadhaar OTP for ABHA creation
     * POST /v3/enrollment/request/otp
     */
    public function generateAadhaarOtp(string $aadhaar, array $scopes = ['abha-enrol']): array;

    /**
     * Verify Aadhaar OTP
     * POST /v3/enrollment/enrol/byAadhaar
     */
    public function verifyAadhaarOtp(string $txnId, string $otpValue, string $mobile, array $scopes = ['abha-enrol']): array;

    /**
     * Generate Mobile OTP for Aadhaar linking (post Aadhaar OTP verification)
     * POST /v3/enrollment/request/otp
     */
    public function generateMobileOtpForLinking(string $mobile, string $txnId, array $scopes = ['abha-enrol', 'mobile-verify']): array;

    /**
     * Verify Mobile OTP for linking
     * POST /v3/enrollment/enrol/auth/byAbdm
     */
    public function verifyMobileOtpForLinking(string $txnId, string $otpValue, array $scopes = ['abha-enrol', 'mobile-verify']): array;

    /**
     * Get ABHA Address Suggestions
     * GET /v3/enrollment/enrol/suggestion
     */
    public function suggestAbhaAddress(string $txnId, string $token): array;

    /**
     * Create ABHA Address
     * POST /v3/enrollment/enrol/abha-address
     */
    public function createAbhaAddress(string $txnId, string $abhaAddress, string $token): array;

    /**
     * Check if a patient's ABHA number exists or retrieve profile
     * GET /v3/profile/account
     */
    public function getProfile(string $token): array;

    /**
     * Search ABHA using Mobile
     * POST /v3/profile/account/abha/search
     */
    public function searchAbha(string $mobile): array;

    /**
     * Download ABHA Card (PDF)
     * GET /v3/profile/account/abha-card
     */
    public function downloadAbhaCard(string $token): array;

    /**
     * Download ABHA QR Code (PNG)
     * GET /v3/profile/account/qr-code
     */
    public function downloadQrCode(string $token): array;

    /**
     * Decrypt the Demographic data from Scan and Share Webhook
     */
    public function decryptScanAndSharePayload(string $encryptedPayload): array;
}
