<?php

namespace App\Services\Patient;

use App\Models\Patient;
use App\Http\Traits\CanFilterAndPaginate;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;

class PatientService implements PatientServiceInterface
{
    use CanFilterAndPaginate;

    /**
     * Get a list of all patients with sorting, filtering, and pagination.
     */
    public function getAllPatients($request = null)
    {
        $req = $request ?? request();

        $hospitalId = $req->user()?->hospital_id ?? $req->query('hospital_id');
        $patientQuery = Patient::query();
        if ($hospitalId) {
            $patientQuery->where('hospital_id', $hospitalId);
        }

        $query = QueryBuilder::for($patientQuery)
            ->allowedFilters(
                'uhid', 'name', 'mobile', 'email', 'abha_number', 'abha_address', 'gender',
                AllowedFilter::partial('search', 'name')
            )
            ->allowedSorts('name', 'created_at', 'dob')
            ->defaultSort('-created_at');

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('uhid', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('mobile', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('abha_number', 'like', "%{$search}%")
                  ->orWhere('abha_address', 'like', "%{$search}%");
            });
        }

        return $this->applyPaginationOrAll($query, $req);
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

    public function updatePatient(int $id, array $data): Patient
    {
        $patient = Patient::findOrFail($id);
        $patient->update($data);
        return $patient->fresh();
    }

    public function deletePatient(int $id): bool
    {
        $patient = Patient::findOrFail($id);
        return (bool) $patient->delete();
    }
}
