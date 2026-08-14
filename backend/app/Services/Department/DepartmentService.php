<?php

namespace App\Services\Department;

use App\Models\Department;
use App\Http\Traits\CanFilterAndPaginate;

class DepartmentService implements DepartmentServiceInterface
{
    use CanFilterAndPaginate;

    public function getAll(int $hospitalId, $request = null)
    {
        $req = $request ?? request();
        $query = Department::query()->withCount('doctors');

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('code', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        if ($req && $req->has('is_active') && $req->query('is_active') !== null && $req->query('is_active') !== '') {
            $query->where('is_active', filter_var($req->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        return $this->applyPaginationOrAll($query, $req);
    }

    public function create(int $hospitalId, array $data): array
    {
        if (empty($data['hospital_id']) && $hospitalId) {
            $data['hospital_id'] = $hospitalId;
        }
        return Department::create($data)->toArray();
    }

    public function update(int $hospitalId, int $departmentId, array $data): array
    {
        $department = Department::findOrFail($departmentId);
            
        $department->update($data);
        return $department->refresh()->toArray();
    }

    public function delete(int $hospitalId, int $departmentId): void
    {
        $department = Department::findOrFail($departmentId);
            
        $department->delete();
    }
}
