<?php

namespace App\Services\Ot;

interface OtServiceInterface
{
    public function getTheatres(int $hospitalId): array;

    public function getSchedules(int $hospitalId, array $filters = []): array;

    public function getSchedule(int $hospitalId, int $scheduleId): array;

    public function createSchedule(int $hospitalId, array $data, ?int $userId = null): array;

    public function updateSchedule(int $hospitalId, int $scheduleId, array $data): array;

    public function getChecklist(int $hospitalId, int $scheduleId): array;

    public function saveChecklist(int $hospitalId, int $scheduleId, array $data): array;

    public function getPrintData(int $hospitalId, int $scheduleId): array;
}
