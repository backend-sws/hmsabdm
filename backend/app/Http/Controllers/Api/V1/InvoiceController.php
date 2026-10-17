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
            'mark_bed_cleaning'         => 'nullable|boolean',
            'bed_status_after_discharge'=> 'nullable|string|in:cleaning,available',
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

    #[OA\Get(
        path: "/api/v1/invoices",
        summary: "List All Global Invoices with Filters and KPI Totals",
        description: "Returns paginated list of hospital invoices with revenue aggregates and filter support.",
        security: [["bearerAuth" => []]],
        tags: ["12. Billing & Invoices"]
    )]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only([
            'search',
            'payment_status',
            'encounter_type',
            'date_from',
            'date_to',
            'page',
            'per_page',
        ]);

        try {
            $result = $this->dischargeBillingService->getInvoices($hospitalId, $filters);
            return $this->successResponse($result, 'Invoices retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/billing/day-end-summary",
        summary: "Cashier Day-End Closing & Shift Handover Summary",
        description: "Reconciles gross billing, discounts, payment mode breakdown (Cash, UPI, Card, Insurance), deposits, and staff collections.",
        security: [["bearerAuth" => []]],
        tags: ["12. Billing & Invoices"]
    )]
    public function dayEndSummary(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $date = $request->query('date', now()->toDateString());
        $userId = $request->query('user_id') ? (int) $request->query('user_id') : null;

        try {
            $summary = $this->dischargeBillingService->getDayEndSummary($hospitalId, $date, $userId);
            return $this->successResponse($summary, 'Day-end closing summary retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/billing/deposits",
        summary: "Collect Advance Deposit & Generate Printable Voucher",
        description: "Posts advance payment credit to patient running ledger, updates admission advance balance, and outputs formal voucher.",
        security: [["bearerAuth" => []]],
        tags: ["12. Billing & Invoices"]
    )]
    public function collectDeposit(Request $request)
    {
        $validated = $request->validate([
            'patient_id'            => 'required|integer',
            'amount'                => 'required|numeric|min:1',
            'encounter_type'        => 'nullable|string|in:ipd,emergency,opd',
            'encounter_id'          => 'nullable|integer',
            'payment_method'        => 'required|string|in:cash,upi,card,cheque,bank_transfer',
            'transaction_reference' => 'nullable|string|max:100',
            'notes'                 => 'nullable|string|max:500',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $receipt = $this->dischargeBillingService->collectAdvanceDeposit($hospitalId, $validated, $userId);
            return $this->successResponse($receipt, 'Advance deposit collected and voucher generated successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/billing/pending-discharges",
        summary: "Get Inpatient Pending Discharge Settlement Queue",
        description: "Returns admitted patients ready for cashier discharge clearance with unbilled estimates.",
        security: [["bearerAuth" => []]],
        tags: ["12. Billing & Invoices"]
    )]
    public function pendingDischarges(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only(['search', 'ward_id']);

        try {
            $queue = $this->dischargeBillingService->getPendingDischargeAdmissions($hospitalId, $filters);
            return $this->successResponse($queue, 'Pending discharge settlement queue retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/billing/refunds",
        summary: "Issue Patient Refund / Credit Note",
        description: "Generates official Credit Note voucher for excess advance deposit return or bill cancellation.",
        security: [["bearerAuth" => []]],
        tags: ["12. Billing & Invoices"]
    )]
    public function issueRefund(Request $request)
    {
        $validated = $request->validate([
            'patient_id'            => 'required|integer',
            'amount'                => 'required|numeric|min:1',
            'reason'                => 'nullable|string|max:255',
            'refund_method'         => 'required|string|in:cash,upi,bank_transfer',
            'transaction_reference' => 'nullable|string|max:100',
            'encounter_type'        => 'nullable|string|in:ipd,opd,emergency',
            'encounter_id'          => 'nullable|integer',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $voucher = $this->dischargeBillingService->issueRefund($hospitalId, $validated, $userId);
            return $this->successResponse($voucher, 'Patient refund voucher generated successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }
}

