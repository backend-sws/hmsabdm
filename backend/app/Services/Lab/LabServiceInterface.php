<?php

namespace App\Services\Lab;

use Illuminate\Http\Request;
use App\Models\LabOrder;
use App\Models\LabTestTemplate;

interface LabServiceInterface
{
    public function getOrders(int $hospitalId, ?Request $request = null);
    public function syncBilledInvestigations(int $hospitalId): int;
    public function getOrder(int $hospitalId, int $orderId): LabOrder;
    public function markSampleCollected(int $hospitalId, int $orderId, int $userId, array $data): LabOrder;
    public function recordResults(int $hospitalId, int $orderId, int $userId, array $data): LabOrder;
    public function authorizeReport(int $hospitalId, int $orderId, ?int $doctorId, array $data): LabOrder;
    public function getDiagnosticReport(int $hospitalId, int $orderId, ?array $itemIds = null): array;

    // Direct Walk-In Booking & Billing
    public function createDirectLabOrder(int $hospitalId, int $userId, array $data): LabOrder;
    public function createIpdLabOrder(int $hospitalId, int $userId, array $data): LabOrder;
    public function updateDirectLabOrder(int $hospitalId, int $orderId, int $userId, array $data): LabOrder;
    public function collectInvoicePayment(int $hospitalId, int $orderId, array $data): LabOrder;
    public function revokeAuthorization(int $hospitalId, int $orderId, int $userId, ?string $reason = null): LabOrder;

    // Per-Test Approval & Audit Trail
    public function approveOrderItems(int $hospitalId, int $orderId, ?int $doctorId, ?int $userId, array $itemIds, ?string $notes = null): LabOrder;
    public function revokeOrderItem(int $hospitalId, int $orderId, int $itemId, int $userId, ?string $reason = null): LabOrder;
    public function getAuditLogs(int $hospitalId, int $orderId);

    // Phlebotomy Token Calling & Live Queue Display
    public function callToken(int $hospitalId, int $orderId, ?string $boothNumber = 'Booth 1'): LabOrder;
    public function getActiveTokensQueue(int $hospitalId): array;

    // Sample Rejection & Recollection
    public function rejectSample(int $hospitalId, int $orderId, int $userId, array $data): LabOrder;
    public function recollectSample(int $hospitalId, int $orderId, int $userId): LabOrder;

    // Delta Check History
    public function getPatientPreviousResults(int $hospitalId, int $patientId): array;

    // Test Catalog
    public function getTemplates(int $hospitalId, ?Request $request = null);
    public function getTemplate(int $hospitalId, int $id): LabTestTemplate;
    public function createTemplate(int $hospitalId, array $data): LabTestTemplate;
    public function updateTemplate(int $hospitalId, int $id, array $data): LabTestTemplate;
    public function deleteTemplate(int $hospitalId, int $id): bool;
}
