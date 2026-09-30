<?php

namespace App\Services\Patient;

use App\Models\Patient;

interface PatientServiceInterface
{
    /**
     * Get a list of all patients with sorting, filtering, and pagination.
     */
    public function getAllPatients($request = null);

    /**
     * Register a new patient.
     */
    public function registerPatient(array $data): Patient;

    /**
     * Get patient by ID.
     */
    public function getPatientById(int $id): Patient;

    /**
     * Update an existing patient's demographic information.
     */
    public function updatePatient(int $id, array $data): Patient;

    /**
     * Delete a patient.
     */
    public function deletePatient(int $id): bool;

    /**
     * Get 360-degree comprehensive medical history and chronological timeline for a patient.
     */
    public function getPatientHistory(int $id, ?int $hospitalId = null): array;
}

