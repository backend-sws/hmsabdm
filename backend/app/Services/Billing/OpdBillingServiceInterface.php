<?php

namespace App\Services\Billing;

use Illuminate\Http\Request;

interface OpdBillingServiceInterface
{
    /**
     * Get pending OPD orders, unbilled investigations, and consultation fees for the billing counter.
     */
    public function getPendingOrders(int $hospitalId, Request $request): array;

    /**
     * Create OPD Tax Invoice, post ledger items, update prescription investigations, and settle payment.
     */
    public function createOpdBill(int $hospitalId, ?int $userId, array $data): array;
}
