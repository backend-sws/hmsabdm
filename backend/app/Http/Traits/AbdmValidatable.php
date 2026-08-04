<?php

namespace App\Http\Traits;

trait AbdmValidatable
{
    /**
     * Validate ABHA number format: 14 digits (91-XXXX-XXXX-XXXX)
     */
    protected function isValidAbhaNumber(string $abha): bool
    {
        return (bool) preg_match('/^91-\d{4}-\d{4}-\d{4}$/', $abha);
    }

    /**
     * Validate ABHA address:
     * - 8-18 chars
     * - Alphanumeric + optional 1 dot + 1 underscore (not at start/end)
     */
    protected function isValidAbhaAddress(string $address): bool
    {
        if (strlen($address) < 8 || strlen($address) > 18) return false;
        return (bool) preg_match('/^[a-zA-Z0-9]+([._]?[a-zA-Z0-9]+)*$/', $address);
    }

    /**
     * Mask mobile number: 9876543210 → *******210
     */
    protected function maskMobile(string $mobile): string
    {
        return str_repeat('*', strlen($mobile) - 3) . substr($mobile, -3);
    }
}
