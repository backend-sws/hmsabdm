<?php

namespace App\Services\Insurance;

interface InsuranceServiceInterface
{
    // ─── Dashboard ────────────────────────────────────────────────────────
    public function getDashboardStats(int $hospitalId): array;

    // ─── Payers Master ───────────────────────────────────────────────────
    public function getPayers(int $hospitalId, array $filters = []): array;
    public function createPayer(int $hospitalId, array $data, int $userId): array;
    public function updatePayer(int $hospitalId, int $payerId, array $data): array;
    public function deletePayer(int $hospitalId, int $payerId): array;
    public function getPayerTariffs(int $hospitalId, int $payerId): array;
    public function saveTariffPackage(int $hospitalId, int $payerId, array $data): array;
    public function deleteTariffPackage(int $hospitalId, int $payerId, int $tariffId): array;

    // ─── Patient Insurance ────────────────────────────────────────────────
    public function getPatientInsurances(int $hospitalId, int $patientId): array;
    public function addPatientInsurance(int $hospitalId, int $patientId, array $data, int $userId): array;
    public function updatePatientInsurance(int $hospitalId, int $insuranceId, array $data): array;
    public function verifyEligibility(int $hospitalId, int $insuranceId, array $data = []): array;
    public function deactivatePatientInsurance(int $hospitalId, int $insuranceId): array;

    // ─── Pre-Authorization ────────────────────────────────────────────────
    public function getPreauths(int $hospitalId, array $filters = []): array;
    public function getPreauth(int $hospitalId, int $preauthId): array;
    public function createPreauth(int $hospitalId, array $data, int $userId): array;
    public function updatePreauthStatus(int $hospitalId, int $preauthId, string $status, array $data = []): array;
    public function respondToQuery(int $hospitalId, int $preauthId, array $data): array;
    public function createEnhancement(int $hospitalId, int $parentPreauthId, array $data, int $userId): array;
    public function getActivePreauth(int $hospitalId, int $admissionId): ?array;
    public function addPreauthFollowup(int $hospitalId, int $preauthId, array $data, string $userName): array;

    // ─── Claims ───────────────────────────────────────────────────────────
    public function getClaims(int $hospitalId, array $filters = []): array;
    public function getClaim(int $hospitalId, int $claimId): array;
    public function createClaim(int $hospitalId, array $data, int $userId): array;
    public function updateClaimStatus(int $hospitalId, int $claimId, string $status, array $data = []): array;
    public function settleClaim(int $hospitalId, int $claimId, array $data, int $userId): array;
    public function resubmitClaim(int $hospitalId, int $claimId, array $data, int $userId): array;
    public function raiseGrievance(int $hospitalId, int $claimId, array $data, int $userId): array;
    public function getClaimDossier(int $hospitalId, int $claimId): array;
    public function addClaimFollowup(int $hospitalId, int $claimId, array $data, string $userName): array;

    // ─── Non-Payable Items ────────────────────────────────────────────────
    public function getNonPayableItems(int $hospitalId, ?int $payerId = null): array;
    public function saveNonPayableItem(int $hospitalId, array $data): array;
    public function deleteNonPayableItem(int $hospitalId, int $itemId): array;
    public function detectNonPayables(int $hospitalId, int $admissionId, ?int $payerId = null): array;

    // ─── AR Aging Ledger ──────────────────────────────────────────────────
    public function getArLedger(int $hospitalId, array $filters = []): array;
    public function getArAgingSummary(int $hospitalId): array;
    public function addArEvent(int $hospitalId, int $claimId, array $data, int $userId): array;

    // ─── Implant Approvals ────────────────────────────────────────────────
    public function getImplantApprovals(int $hospitalId, array $filters = []): array;
    public function createImplantApproval(int $hospitalId, array $data, int $userId): array;
    public function updateImplantApproval(int $hospitalId, int $approvalId, array $data): array;

    // ─── Preauth Expiry Alerts ────────────────────────────────────────────
    public function getExpiringPreauths(int $hospitalId, int $withinDays = 2): array;
}
