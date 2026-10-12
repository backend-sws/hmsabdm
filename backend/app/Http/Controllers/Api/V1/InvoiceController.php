<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Billing\DischargeBillingServiceInterface;
use App\Http\Traits\HasApiResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class InvoiceController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected DischargeBillingServiceInterface $dischargeBillingService
    ) {}

    #[OA\Get(
        path: "/api/v1/ipd/admissions/{id}/discharge-estimate",
        summary: "Pre-Discharge Billing Estimate Preview",
        description: "Returns unbilled ledger charges, advance deposits paid, and estimated net balance due before discharge.",
        security: [["bearerAuth" => []]],
        tags: ["12. Billing & Invoices"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Pre-discharge estimate calculated")]
    public function getEstimate(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);

        try {
            $estimate = $this->dischargeBillingService->getPreDischargeEstimate($hospitalId, (int) $id);
            return $this->successResponse($estimate, 'Pre-discharge billing estimate retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/ipd/admissions/{id}/settle-discharge",
        summary: "Final Settlement, Tax Invoice Generation & Patient Discharge",
        description: "1-Click final discharge: settles running ledger, factors in advance deposit, hospital discount, and insurance cashless claim, generates final Tax Invoice (INV-YYYY-XXXXX), frees the bed, and issues official Security Gate Pass (GP-YYYY-XXXXX).",
        security: [["bearerAuth" => []]],
        tags: ["12. Billing & Invoices"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Bill settled, patient discharged, bed freed, gate pass issued")]
    public function settleAndDischarge(Request $request, $id)
    {
        $validated = $request->validate([
            'discharge_type'            => 'nullable|string|in:normal,lama,transfer,referred,absconded,death',
            'discharge_summary'         => 'nullable|string',
            'discharge_advice'          => 'nullable|string',
            'final_diagnosis'           => 'nullable|string',
            'discount_amount'           => 'nullable|numeric|min:0',
            'discount_reason'           => 'nullable|string|max:255',
            'insurance_approved_amount' => 'nullable|numeric|min:0',
            'tpa_claim_number'          => 'nullable|string|max:100',
            'insurance_company_name'    => 'nullable|string|max:150',
            'amount_paid'               => 'nullable|numeric|min:0',
            'payment_method'            => 'nullable|string|max:50',
            'payment_breakdown'         => 'nullable|array',
            'discharge_date'            => 'nullable|date',
            'notes'                     => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $result = $this->dischargeBillingService->settleAndDischarge($hospitalId, (int) $id, $validated, $userId);
            return $this->successResponse($result, 'Bill settled, patient discharged, and Security Gate Pass generated successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/invoices/{id}",
        summary: "Get Formatted Itemized Tax Invoice",
        description: "Retrieves complete invoice data ready for printing / PDF export.",
        security: [["bearerAuth" => []]],
        tags: ["12. Billing & Invoices"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Tax invoice data retrieved")]
    public function show(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);

        try {
            $invoice = $this->dischargeBillingService->getInvoice($hospitalId, (int) $id);
            return $this->successResponse($invoice, 'Invoice retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFoundResponse($e->getMessage());
        }
    }

    #[OA\Get(
        path: "/api/v1/ipd/admissions/{id}/gate-pass",
        summary: "Get Printable Hospital Security Gate Pass",
        description: "Returns official security clearance gate pass with patient, ward, bed, and financial clearance stamp.",
        security: [["bearerAuth" => []]],
        tags: ["12. Billing & Invoices"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Security Gate Pass slip data")]
    public function gatePass(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);

        try {
            $gatePass = $this->dischargeBillingService->getGatePass($hospitalId, (int) $id);
            return $this->successResponse($gatePass, 'Security Gate Pass slip retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/invoices/patient/{patientId}",
        summary: "Get Invoices for Patient",
        security: [["bearerAuth" => []]],
        tags: ["12. Billing & Invoices"]
    )]
    #[OA\Parameter(name: "patientId", in: "path", description: "Patient ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Patient Invoices")]
    public function patientInvoices(Request $request, $patientId)
    {
        $hospitalId = $this->getHospitalId($request);
        $invoices = $this->dischargeBillingService->getPatientInvoices($hospitalId, (int) $patientId);
        return $this->successResponse($invoices, 'Patient invoices retrieved successfully');
    }
}
