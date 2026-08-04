<?php

namespace App\Services\Department;

interface DepartmentServiceInterface
{
    public function getAll(int $hospitalId);
    
    public function create(int $hospitalId, array $data): array;
    
    public function update(int $hospitalId, int $departmentId, array $data): array;
    
    public function delete(int $hospitalId, int $departmentId): void;
}
