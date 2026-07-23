<?php

namespace App\Services\Abdm;

interface AbdmServiceInterface
{
    /**
     * Generate an OTP for ABHA creation/login via mobile.
     */
    public function generateOtp(string $mobile): array;

    /**
     * Verify the OTP to get auth token or ABHA details.
     */
    public function verifyOtp(string $txnId, string $otp): array;

    /**
     * Create ABHA address / profile.
     */
    public function createAbha(array $data): array;
    
    /**
     * Process Scan & Share data from webhook.
     */
    public function processScanAndShare(array $payload): array;
}
