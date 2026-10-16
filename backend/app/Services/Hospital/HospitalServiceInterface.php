<?php

namespace App\Services\Hospital;

use App\Models\Hospital;
use Illuminate\Http\Request;

interface HospitalServiceInterface
{
    /**
     * Get paginated list of hospitals.
     */
    public function getHospitals(Request $request);

    /**
     * Get hospital by ID.
     */
    public function getHospitalById(int $id): Hospital;

    /**
     * Register a new hospital and set up initial Admin user with roles.
     */
    public function registerHospital(array $data): array;

    /**
     * Update hospital details.
     */
    public function updateHospital(int $id, array $data): Hospital;

    /**
     * Delete/deactivate a hospital.
     */
    public function deleteHospital(int $id): void;
}
