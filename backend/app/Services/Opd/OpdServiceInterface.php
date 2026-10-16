<?php

namespace App\Services\Opd;

interface OpdServiceInterface
{
    /**
     * Get today's queue for a specific doctor
     */
    public function getTodayQueue(int $hospitalId, ?int $doctorId = null, $request = null);

    /**
     * Call the next patient (or a specific patient)
     */
    public function callPatient(int $hospitalId, int $doctorId, int $visitId): array;

    /**
     * Complete the consultation
     */
    public function completeConsultation(int $hospitalId, int $doctorId, int $visitId, array $data): array;
}
