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
     * Find existing patient by ABHA, ID proof, or Mobile + Name within the hospital.
     */
    public function findExistingPatient(int $hospitalId, array $data): ?Patient
    {
        $query = Patient::where('hospital_id', $hospitalId);

        // 1. Match by ABHA Number
        if (!empty($data['abha_number'])) {
            $patient = (clone $query)->where('abha_number', $data['abha_number'])->first();
            if ($patient) return $patient;
        }

        // 2. Match by ABHA Address
        if (!empty($data['abha_address'])) {
            $patient = (clone $query)->where('abha_address', $data['abha_address'])->first();
            if ($patient) return $patient;
        }

        // 3. Match by ID Proof (e.g. PAN, Driving License, Voter ID)
        if (!empty($data['id_proof_number']) && !empty($data['id_proof_type'])) {
            $patient = (clone $query)
                ->where('id_proof_type', $data['id_proof_type'])
                ->where('id_proof_number', $data['id_proof_number'])
                ->first();
            if ($patient) return $patient;
        }

        // 4. Match by Mobile Number + Name (Case-insensitive trimmed)
        if (!empty($data['mobile']) && !empty($data['name'])) {
            $patient = (clone $query)
                ->where('mobile', $data['mobile'])
                ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($data['name']))])
                ->first();
            if ($patient) return $patient;
        }

        return null;
    }

    /**
     * Register a new patient or gracefully reuse/update an existing patient profile.
     *
     * @param array $data
     * @return Patient
     */
    public function registerPatient(array $data): Patient
    {
        $hospitalId = $data['hospital_id'] ?? request()->user()?->hospital_id ?? 1;
        $existing = $this->findExistingPatient($hospitalId, $data);

        if ($existing) {
            // Update non-empty incoming fields without overwriting with null
            $updateData = array_filter($data, fn($v) => !is_null($v) && $v !== '');
            unset($updateData['id'], $updateData['uhid'], $updateData['hospital_id']);
            if (!empty($updateData)) {
                $existing->update($updateData);
            }
            return $existing->fresh();
        }

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
