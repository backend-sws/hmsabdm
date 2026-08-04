<?php

namespace App\Services\Department;

use App\Models\Department;

class DepartmentService implements DepartmentServiceInterface
{
    public function getAll(int $hospitalId)
    {
        return Department::where('hospital_id', $hospitalId)
            ->withCount('doctors')
            ->paginate(15);
    }

    public function create(int $hospitalId, array $data): array
    {
        $data['hospital_id'] = $hospitalId;
        return Department::create($data)->toArray();
    }

    public function update(int $hospitalId, int $departmentId, array $data): array
    {
        $department = Department::where('hospital_id', $hospitalId)
            ->findOrFail($departmentId);
            
        $department->update($data);
        return $department->refresh()->toArray();
    }

    public function delete(int $hospitalId, int $departmentId): void
    {
        $department = Department::where('hospital_id', $hospitalId)
            ->findOrFail($departmentId);
            
        $department->delete();
    }
}
