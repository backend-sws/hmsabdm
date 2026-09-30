<?php

namespace App\Services\Billing;

interface ChargeServiceInterface
{
    public function getCategories(int $hospitalId);

    public function createCategory(int $hospitalId, array $data);

    public function getCharges(int $hospitalId, $request = null);

    public function createCharge(int $hospitalId, array $data);

    public function updateCharge(int $hospitalId, int $chargeId, array $data);

    public function deleteCharge(int $hospitalId, int $chargeId);

    public function postLedgerCharge(int $hospitalId, int $userId, array $data);

    public function getPatientLedger(int $hospitalId, int $patientId, $request = null);

    public function cancelLedgerItem(int $hospitalId, int $itemId, string $reason);

    public function getBedBillingConfig(int $hospitalId): array;

    public function updateBedBillingConfig(int $hospitalId, array $data): array;
}
