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
}
