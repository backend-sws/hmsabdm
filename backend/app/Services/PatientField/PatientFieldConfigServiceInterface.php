<?php

namespace App\Services\PatientField;

use App\Models\PatientFieldConfig;
use Illuminate\Support\Collection;

interface PatientFieldConfigServiceInterface
{
    /**
     * Get all custom patient field configurations for a hospital
     */
    public function getFieldConfigs(int $hospitalId, bool $activeOnly = true): Collection;

    /**
     * Create a new custom patient field definition
     */
    public function createFieldConfig(int $hospitalId, array $data): PatientFieldConfig;

    /**
     * Update an existing custom patient field definition
     */
    public function updateFieldConfig(int $hospitalId, int $configId, array $data): PatientFieldConfig;

    /**
     * Delete a custom patient field definition
     */
    public function deleteFieldConfig(int $hospitalId, int $configId): bool;

    /**
     * Seed default standard patient fields for a hospital if none exist
     */
    public function seedDefaultFieldConfigs(int $hospitalId): void;
}
