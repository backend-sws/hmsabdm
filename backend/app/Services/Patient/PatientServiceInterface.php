<?php

namespace App\Services\Patient;

use Illuminate\Database\Eloquent\Collection;
use App\Models\Patient;

interface PatientServiceInterface
{
    /**
     * Get a list of all patients.
     *
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator|\Illuminate\Database\Eloquent\Collection
     */
    public function getAllPatients();

    /**
     * Register a new patient.
     *
     * @param array $data
     * @return Patient
     */
    public function registerPatient(array $data): Patient;

    /**
     * Get patient by ID.
     *
     * @param int $id
     * @return Patient
     */
    public function getPatientById(int $id): Patient;
}
