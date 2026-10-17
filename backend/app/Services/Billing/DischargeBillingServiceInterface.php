<?php

namespace App\Services\Billing;

interface DischargeBillingServiceInterface
{
    /**
     * Get pre-discharge billing estimate (all unbilled items, advance deposit, gross, net payable).
     */
    public function getPreDischargeEstimate(int $hospitalId, int $admissionId): array;

    /**
     * Settle bill, finalize tax invoice, discharge patient, free bed, and issue security gate pass.
     */
    public function settleAndDischarge(int $hospitalId, int $admissionId, array $data, int $userId): array;

    /**
     * Get formatted itemized tax invoice data.
     */
    public function getInvoice(int $hospitalId, int $invoiceId): array;

    /**
     * Get printable hospital security gate pass slip.
     */
    public function getGatePass(int $hospitalId, int $admissionId): array;

    /**
     * Get invoices for a patient.
     */
    public function getPatientInvoices(int $hospitalId, int $patientId): array;

    /**
     * Get paginated global invoices list with filters, search, and revenue KPI totals.
     */
    public function getInvoices(int $hospitalId, array $filters): array;

    /**
     * Get Cashier Day-End closing reconciliation summary with mode-wise, department-wise, and user-wise collections.
     */
    public function getDayEndSummary(int $hospitalId, string $date, ?int $userId): array;

    /**
     * Collect advance deposit for IPD/OPD/Emergency encounter and generate printable deposit voucher.
     */
    public function collectAdvanceDeposit(int $hospitalId, array $data, int $userId): array;

    /**
     * Get queue of admitted IPD patients awaiting final discharge settlement.
     */
    public function getPendingDischargeAdmissions(int $hospitalId, array $filters): array;

    /**
     * Issue refund / credit note voucher for patient overpayment or cancellation.
     */
    public function issueRefund(int $hospitalId, array $data, int $userId): array;
}

