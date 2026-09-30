<?php

namespace App\Services\Emergency;

interface EmergencyServiceInterface
{
    /**
     * Fast-track 5-second emergency admission and triage desk entry.
     */
    public function admitTriage(int $hospitalId, array $data, int $userId): array;

    /**
     * Post-stabilization patient identity linking (updates temp patient to verified profile or links to target patient).
     */
    public function linkPatient(int $hospitalId, int $triageId, array $data): array;

    /**
     * Generate official Police Intimation Memo (MLC Slip) for Medico-Legal Cases.
     */
    public function getMlcSlip(int $hospitalId, int $triageId): array;

    /**
     * Get list of emergency triages with dashboard priority counters and filters.
     */
    public function getTriagesList(int $hospitalId, $request = null): array;

    /**
     * Update clinical status of an emergency triage (e.g. stabilized, discharged, admitted).
     */
    public function updateTriageStatus(int $hospitalId, int $triageId, string $status, ?string $notes = null): array;
}
