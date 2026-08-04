<?php

namespace App\Services\Reception;

interface ReceptionServiceInterface
{
    /**
     * Get active counter queues waiting for confirmation (Scan & Share)
     */
    public function getWaitingQueues(int $hospitalId);

    /**
     * Find a specific queue entry by its link token
     */
    public function getQueueByToken(int $hospitalId, string $token): array;

    /**
     * Get all active departments with their active doctors
     */
    public function getDepartmentsWithDoctors(int $hospitalId);

    /**
     * Register a patient manually (without ABHA or if ABHA creation failed)
     */
    public function registerPatient(int $hospitalId, array $data): array;

    /**
     * Confirm a queue token and map it to a doctor/department
     */
    public function confirmQueue(int $hospitalId, int $queueId, int $doctorId, int $departmentId, ?int $appointmentTypeId = null): array;

    /**
     * Create an OPD visit for a patient
     */
    public function createOpdVisit(int $hospitalId, array $data): array;
}
