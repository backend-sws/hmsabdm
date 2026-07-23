<?php

namespace App\Services\Patient;

use App\Models\Patient;
use Illuminate\Database\Eloquent\Collection;
use Spatie\QueryBuilder\QueryBuilder;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PatientService implements PatientServiceInterface
{
    /**
     * Get a list of all patients with sorting, filtering, and pagination.
     *
     * @return LengthAwarePaginator|Collection
     */
    public function getAllPatients()
    {
        return QueryBuilder::for(Patient::class)
            ->allowedFilters('name', 'phone', 'abha_number')
            ->allowedSorts('name', 'created_at')
            ->defaultSort('-created_at')
            ->paginate(request()->query('per_page', 15))
            ->appends(request()->query());
    }

    /**
     * Register a new patient.
     *
     * @param array $data
     * @return Patient
     */
    public function registerPatient(array $data): Patient
    {
        return Patient::create($data);
    }

    /**
     * Get patient by ID.
     *
     * @param int $id
     * @return Patient
     */
    public function getPatientById(int $id): Patient
    {
        return Patient::findOrFail($id);
    }
}
