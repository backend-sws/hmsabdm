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

        $query = QueryBuilder::for(Patient::class)
            ->allowedFilters([
                'name', 'mobile', 'email', 'abha_number', 'abha_address', 'gender',
                AllowedFilter::partial('search', 'name') // fallback
            ])
            ->allowedSorts('name', 'created_at', 'dob')
            ->defaultSort('-created_at');

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('mobile', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('abha_number', 'ilike', "%{$search}%")
                  ->orWhere('abha_address', 'ilike', "%{$search}%");
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
}
