<?php

namespace App\Services\BloodBank;

use App\Models\BloodDonor;
use App\Models\BloodUnit;
use App\Models\BloodTtiTest;
use App\Models\BloodRequisition;
use App\Models\BloodCrossmatch;
use App\Models\BloodTransfusionReaction;
use App\Models\BloodCamp;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface BloodBankServiceInterface
{
    /**
     * Get real-time Blood Bank dashboard metrics, 8-group matrix and alerts.
     */
    public function getDashboardKpis(int $hospitalId): array;

    /**
     * List donors with search, blood group, and type filters.
     */
    public function getDonors(int $hospitalId, array $filters = []): LengthAwarePaginator;

    /**
     * Register a new blood donor.
     */
    public function registerDonor(int $hospitalId, array $data): BloodDonor;

    /**
     * Perform pre-donation medical screening, vitals check, and phlebotomy unit creation.
     */
    public function screenDonor(int $hospitalId, int $donorId, array $data, ?int $userId = null): array;

    /**
     * List blood units in inventory with status and component filters.
     */
    public function getBloodUnits(int $hospitalId, array $filters = []): LengthAwarePaginator;

    /**
     * Record TTI testing results and release unit to available stock or discard.
     */
    public function recordTtiTest(int $hospitalId, int $unitId, array $data, ?int $userId = null): BloodTtiTest;

    /**
     * Separate whole blood unit into therapeutic components (PRBC, FFP, Platelets).
     */
    public function separateComponents(int $hospitalId, int $unitId, array $components, ?int $userId = null): array;

    /**
     * Create inpatient / OT / emergency blood requisition.
     */
    public function createRequisition(int $hospitalId, array $data): BloodRequisition;

    /**
     * List blood requisitions with status and urgency filters.
     */
    public function getRequisitions(int $hospitalId, array $filters = []): LengthAwarePaginator;

    /**
     * Perform major/minor cross-match and reserve unit for patient.
     */
    public function performCrossmatch(int $hospitalId, int $requisitionId, array $data, ?int $userId = null): BloodCrossmatch;

    /**
     * Issue cross-matched blood unit with cold-chain verification and compatibility tag.
     */
    public function issueBlood(int $hospitalId, int $crossmatchId, array $data, ?int $userId = null): array;

    /**
     * Record HvPI Adverse Transfusion Reaction and auto-quarantine companion units.
     */
    public function recordReaction(int $hospitalId, array $data, ?int $userId = null): BloodTransfusionReaction;

    /**
     * List outdoor blood camps.
     */
    public function getCamps(int $hospitalId, array $filters = []): LengthAwarePaginator;

    /**
     * Create outdoor blood donation camp.
     */
    public function createCamp(int $hospitalId, array $data): BloodCamp;

    /**
     * Get customizable donor screening questions and vital thresholds.
     */
    public function getScreeningConfig(int $hospitalId): array;

    /**
     * Update customizable donor screening questions and vital thresholds.
     */
    public function updateScreeningConfig(int $hospitalId, array $config): array;

    /**
     * Reset screening questions and vital thresholds to national standards.
     */
    public function resetScreeningConfig(int $hospitalId): array;
}
