<?php

namespace App\Services\Vital;

use App\Models\Vital;
use App\Models\VitalFieldConfig;
use Illuminate\Support\Collection;

interface VitalServiceInterface
{
    /**
     * Record new vitals for a patient / OPD visit
     */
    public function recordVitals(int $hospitalId, int $userId, array $data): Vital;

    /**
     * Get list of vitals with filtering and pagination
     */
    public function getVitals(int $hospitalId, $request = null);

    /**
     * Get specific vital entry by ID
     */
    public function getVitalById(int $hospitalId, int $id): Vital;

    /**
     * Get full vitals history for a patient
     */
    public function getPatientVitals(int $hospitalId, int $patientId): Collection;

    /**
     * Get vitals recorded for a specific OPD visit
     */
    public function getVisitVitals(int $hospitalId, int $visitId): Collection;

    /**
     * Get all vitals recorded for a specific IPD admission (chronological for clinical chart)
     */
    public function getIpdAdmissionVitals(int $hospitalId, int $ipdAdmissionId): Collection;

    /**
     * Delete a vital entry
     */
    public function deleteVital(int $hospitalId, int $id): bool;

    /**
     * Get custom vital field definitions configured for a hospital
     */
    public function getFieldConfigs(int $hospitalId, bool $activeOnly = true): Collection;

    /**
     * Create a new custom vital field for a hospital
     */
    public function createFieldConfig(int $hospitalId, array $data): VitalFieldConfig;

    /**
     * Update an existing custom vital field configuration
     */
    public function updateFieldConfig(int $hospitalId, int $configId, array $data): VitalFieldConfig;

    /**
     * Delete a custom vital field configuration
     */
    public function deleteFieldConfig(int $hospitalId, int $configId): bool;

    /**
     * Seed standard default vital fields for a hospital if none exist
     */
    public function seedDefaultFieldConfigs(int $hospitalId): void;
}
