<?php

namespace App\Services\HospitalSetting;

interface HospitalSettingServiceInterface
{
    /**
     * Get UHID configuration, format list, reset rules, and live preview for a hospital
     */
    public function getUhidConfig(int $hospitalId): array;

    /**
     * Update UHID configuration format and sequence settings for a hospital
     */
    public function updateUhidConfig(int $hospitalId, array $data): array;

    /**
     * Get OPD Number configuration, format list, reset rules, and live preview
     */
    public function getOpdConfig(int $hospitalId): array;

    /**
     * Update OPD Number configuration format and sequence settings
     */
    public function updateOpdConfig(int $hospitalId, array $data): array;

    /**
     * Get IPD Number configuration, format list, reset rules, and live preview
     */
    public function getIpdConfig(int $hospitalId): array;

    /**
     * Update IPD Number configuration format and sequence settings
     */
    public function updateIpdConfig(int $hospitalId, array $data): array;

    /**
     * Get unified numbering overview (UHID + OPD + IPD)
     */
    public function getNumberingOverview(int $hospitalId): array;

    /**
     * Get settings for a hospital (all groups or filtered by group)
     */
    public function getSettings(int $hospitalId, ?string $group = null): array;

    /**
     * Batch save settings for a hospital under a specific group
     */
    public function saveSettings(int $hospitalId, string $group, array $settings): array;

    /**
     * Get a specific setting value
     */
    public function getSetting(int $hospitalId, string $key, mixed $default = null): mixed;

    /**
     * Set a specific key-value setting
     */
    public function setSetting(int $hospitalId, string $key, mixed $value, string $group = 'general', ?string $type = null): void;
}
