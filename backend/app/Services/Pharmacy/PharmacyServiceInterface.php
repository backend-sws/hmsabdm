<?php

namespace App\Services\Pharmacy;

use App\Models\HospitalMedicine;
use App\Models\PharmacySupplier;
use App\Models\PharmacyPurchase;
use App\Models\PharmacyBatch;
use App\Models\PharmacySale;
use App\Models\PharmacyReturn;
use App\Models\PharmacySupplierPayment;
use App\Models\PharmacySupplierReturn;

interface PharmacyServiceInterface
{
    /**
     * Formulary & Medicine Catalog
     */
    public function getFormulary(int $hospitalId, array $filters = []): mixed;
    public function searchMasterMedicines(string $query, int $limit = 30): mixed;
    public function importFromMaster(int $hospitalId, int $masterMedicineId, array $overrides = []): HospitalMedicine;
    public function createCustomMedicine(int $hospitalId, array $data): HospitalMedicine;
    public function updateMedicine(int $hospitalId, int $medicineId, array $data): HospitalMedicine;
    public function getMedicine(int $hospitalId, int $medicineId): HospitalMedicine;

    /**
     * Suppliers / Vendor Master & Credit Ledger
     */
    public function getSuppliers(int $hospitalId, array $filters = []): mixed;
    public function createSupplier(int $hospitalId, array $data): PharmacySupplier;
    public function updateSupplier(int $hospitalId, int $supplierId, array $data): PharmacySupplier;
    public function getSupplierLedger(int $hospitalId, int $supplierId): array;
    public function recordSupplierPayment(int $hospitalId, int $supplierId, array $data, int $userId): PharmacySupplierPayment;
    public function getSupplierPayments(int $hospitalId, array $filters = []): mixed;

    /**
     * Purchases & Inward GRN
     */
    public function createPurchaseGrn(int $hospitalId, array $data, int $userId): PharmacyPurchase;
    public function getPurchases(int $hospitalId, array $filters = []): mixed;
    public function getPurchaseDetails(int $hospitalId, int $purchaseId): PharmacyPurchase;

    /**
     * Batch Inventory & FEFO Queries
     */
    public function getBatchStock(int $hospitalId, array $filters = []): mixed;
    public function getNearExpiryBatches(int $hospitalId, int $days = 90): mixed;
    public function getAvailableBatchesForMedicine(int $hospitalId, int $medicineId): mixed;
    public function adjustBatchStock(int $hospitalId, int $batchId, int $adjustmentQty, string $reason, int $userId): PharmacyBatch;

    /**
     * Omni-Channel Sales / POS Dispense
     */
    public function getPendingPrescriptions(int $hospitalId, array $filters = []): mixed;
    public function getPrescriptionDetailsForDispense(int $hospitalId, int $prescriptionId): mixed;
    public function processSale(int $hospitalId, array $data, int $userId): PharmacySale;
    public function getSales(int $hospitalId, array $filters = []): mixed;
    public function getSaleDetails(int $hospitalId, int $saleId): PharmacySale;

    /**
     * Customer Returns & Credit Notes
     */
    public function processReturn(int $hospitalId, array $data, int $userId): PharmacyReturn;
    public function getReturns(int $hospitalId, array $filters = []): mixed;
    public function getReturnDetails(int $hospitalId, int $returnId): PharmacyReturn;

    /**
     * Supplier Return to Vendor (RTV)
     */
    public function getSupplierReturns(int $hospitalId, array $filters = []): mixed;
    public function createSupplierReturn(int $hospitalId, array $data, int $userId): PharmacySupplierReturn;
    public function getSupplierReturnDetails(int $hospitalId, int $returnId): PharmacySupplierReturn;
    public function updateSupplierReturnStatus(int $hospitalId, int $returnId, string $status, array $extra, int $userId): PharmacySupplierReturn;

    /**
     * Expiry Intelligence Dashboard
     */
    public function getExpiryDashboard(int $hospitalId): array;
    public function quarantineBatch(int $hospitalId, int $batchId, int $userId): PharmacyBatch;

    /**
     * Audit & Dashboard Analytics
     */
    public function getStockTransactions(int $hospitalId, array $filters = []): mixed;
    public function getPharmacyDashboardStats(int $hospitalId): array;
}
