<?php

namespace App\Services\Reception;

interface ReceptionServiceInterface
{
    /**
     * Get active counter queues waiting for confirmation (Scan & Share)
     */
    public function getWaitingQueues(int $hospitalId, $request = null);

    /**
     * Find a specific queue entry by its link token
     */
    public function getQueueByToken(int $hospitalId, string $token): array;

    /**
     * Get all active departments with their active doctors
     */
    public function getDepartmentsWithDoctors(int $hospitalId, $request = null);

    /**
     * Register a patient manually (without ABHA or if ABHA creation failed)
     */
    public function registerPatient(int $hospitalId, array $data): array;

    /**
     * Confirm a queue token and map it to a doctor/department
     */
    public function confirmQueue(int $hospitalId, int $queueId, int $doctorId, int $departmentId, ?int $appointmentTypeId = null, array $extra = []): array;

    /**
     * Create an OPD visit for a patient
     */
    public function createOpdVisit(int $hospitalId, array $data): array;

    /**
     * Fast-track 1-click Re-visit token generation for existing patients with free follow-up rule check
     */
    public function quickRevisit(?int $hospitalId, array $data): array;

    /**
     * Check if an existing patient is eligible for free follow-up (15-day validity)
     */
    public function checkRevisitEligibility(?int $hospitalId, array $data): array;

    /**
     * Get OPD visits / issued tokens history for the reception desk
     */
    public function getVisits(int $hospitalId, $request = null);

    /**
     * Get summary counts for issued OPD tokens
     */
    public function getVisitStats(int $hospitalId, ?string $date = null): array;
}

