<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\Billing\OpdBillingServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "12. OPD Quick Billing Counter",
    description: "OPD Token Quick Bill Desk: 1-click fetch of consultation fee and doctor advised lab/radiology tests, payment collection, and instant receipt generation."
)]
class OpdBillingController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected OpdBillingServiceInterface $opdBillingService
    ) {}

    /**
     * Get pending OPD orders for billing counter
     */
    public function getPendingOrders(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $result = $this->opdBillingService->getPendingOrders($hospitalId, $request);

        return $this->successResponse($result, 'OPD pending billing orders retrieved successfully');
    }

    /**
     * Create OPD Tax Invoice & Settle Payment (1-Click OPD Quick Billing)
     */
    public function createOpdBill(Request $request)
    {
        $validated = $request->validate([
            'opd_visit_id'             => 'required|integer|exists:opd_visits,id',
            'patient_id'               => 'required|integer|exists:patients,id',
            'bill_consultation_fee'    => 'nullable|boolean',
            'consultation_fee_amount'  => 'nullable|numeric|min:0',
            'investigations'           => 'nullable|array',
            'investigations.*.id'      => 'nullable|integer',
            'investigations.*.test_name' => 'required|string|max:255',
            'investigations.*.test_code' => 'nullable|string|max:100',
            'investigations.*.category'  => 'nullable|string|max:100',
            'investigations.*.rate'      => 'required|numeric|min:0',
            'custom_items'             => 'nullable|array',
            'custom_items.*.item_name' => 'required|string|max:255',
            'custom_items.*.category'  => 'nullable|string|max:100',
            'custom_items.*.unit_price'=> 'required|numeric|min:0',
            'custom_items.*.quantity'  => 'nullable|numeric|min:1',
            'discount_amount'          => 'nullable|numeric|min:0',
            'discount_reason'          => 'nullable|string|max:255',
            'tax_amount'               => 'nullable|numeric|min:0',
            'payment_method'           => 'required|string|max:50',
            'payment_breakdown'        => 'nullable|array',
            'notes'                    => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id;

        $receipt = $this->opdBillingService->createOpdBill($hospitalId, $userId, $validated);

        return $this->createdResponse($receipt, 'OPD Bill created and payment settled successfully');
    }
}
