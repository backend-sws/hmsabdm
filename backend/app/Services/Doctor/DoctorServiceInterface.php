<?php

namespace App\Services\Doctor;

interface DoctorServiceInterface
{
    public function getAll(int $hospitalId);
    
    public function getAvailableToday(int $hospitalId);

    public function create(int $hospitalId, array $data): array;
    
    public function update(int $hospitalId, int $doctorId, array $data): array;
    
    public function delete(int $hospitalId, int $doctorId): void;
    
    public function updateSchedule(int $hospitalId, int $doctorId, array $schedules): void;
}
