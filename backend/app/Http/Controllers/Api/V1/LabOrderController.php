<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lab\CollectLabPaymentRequest;
use App\Http\Requests\Lab\DirectLabBookingRequest;
use App\Http\Requests\Lab\UpdateDirectLabBookingRequest;
use App\Http\Traits\HasApiResponse;
use App\Services\Lab\LabServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class LabOrderController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected LabServiceInterface $labService
    ) {}

    #[OA\Get(
        path: "/api/v1/lab/orders",
        summary: "Get live list of laboratory worklist orders",
        description: "Retrieves laboratory orders filtered by status, urgency, date, or search term.",
        tags: ["13. Lab — Orders & Billing"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "status", in: "query", description: "Filter by order status (pending_sample, sample_collected, in_progress, completed, authorized)", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "urgency", in: "query", description: "Filter by priority (Routine, Urgent, STAT)", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "date", in: "query", description: "Filter by order date (YYYY-MM-DD)", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "search", in: "query", description: "Search by patient name, UHID, order number or accession number", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Response(response: 200, description: "Laboratory orders retrieved successfully")]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $orders = $this->labService->getOrders($hospitalId, $request);
        return $this->paginatedOrSuccessResponse($orders, 'Laboratory orders retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/lab/orders/{id}",
        summary: "Get single lab order with complete test items and parameters",
        description: "Retrieves complete order details including patient demographics, doctor, test panels, parameters, reference ranges, and results.",
        tags: ["13. Lab — Orders & Billing"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Laboratory order details retrieved successfully")]
    #[OA\Response(response: 404, description: "Order not found")]
    public function show(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $order = $this->labService->getOrder($hospitalId, (int) $id);
        return $this->successResponse($order, 'Laboratory order details retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/lab/orders/direct-booking",
        summary: "Direct walk-in lab booking with instant billing",
        description: "Books a walk-in laboratory test order, registers walk-in patient if new, generates invoice and phlebotomy token.",
        tags: ["13. Lab — Orders & Billing"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["tests"],
            properties: [
                new OA\Property(property: "patient_id", type: "integer", example: 10),
                new OA\Property(property: "patient_name", type: "string", example: "Rahul Sharma"),
                new OA\Property(property: "patient_gender", type: "string", example: "Male"),
                new OA\Property(property: "patient_age", type: "number", example: 32),
                new OA\Property(property: "patient_phone", type: "string", example: "9876543210"),
                new OA\Property(property: "doctor_id", type: "integer", example: 2),
                new OA\Property(property: "referral_doctor", type: "string", example: "Dr. A. Verma"),
                new OA\Property(property: "urgency", type: "string", example: "Routine"),
                new OA\Property(property: "paid_amount", type: "number", example: 500),
                new OA\Property(property: "payment_method", type: "string", example: "cash"),
                new OA\Property(
                    property: "tests",
                    type: "array",
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: "test_template_id", type: "integer", example: 1),
                            new OA\Property(property: "test_name", type: "string", example: "Complete Blood Count (CBC)"),
                            new OA\Property(property: "rate", type: "number", example: 350)
                        ]
                    )
                )
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Walk-in lab order booked successfully")]
    #[OA\Response(response: 422, description: "Validation error")]
    public function directBooking(DirectLabBookingRequest $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->createDirectLabOrder($hospitalId, $userId, $request->validated());
        return $this->createdResponse($order, "Walk-in lab order booked successfully. Phlebotomy Token: {$order->token_number}");
    }

    #[OA\Put(
        path: "/api/v1/lab/orders/{id}/direct-booking",
        summary: "Update existing direct lab booking & invoice",
        description: "Updates patient, tests, discount, or payment details of an existing walk-in lab booking.",
        tags: ["13. Lab — Orders & Billing"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Lab booking & invoice updated successfully")]
    public function updateDirectBooking(UpdateDirectLabBookingRequest $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->updateDirectLabOrder($hospitalId, (int) $id, $userId, $request->validated());
        return $this->successResponse($order, "Lab booking & invoice updated successfully.");
    }

    #[OA\Post(
        path: "/api/v1/lab/orders/{id}/collect-payment",
        summary: "Collect payment / settle balance on lab invoice",
        description: "Records payment against due balance on a lab order invoice.",
        tags: ["13. Lab — Orders & Billing"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["amount", "payment_method"],
            properties: [
                new OA\Property(property: "amount", type: "number", example: 250),
                new OA\Property(property: "payment_method", type: "string", example: "upi"),
                new OA\Property(property: "transaction_ref", type: "string", example: "UPI/20261012/1234")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Payment collected and receipt updated successfully")]
    public function collectPayment(CollectLabPaymentRequest $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $order = $this->labService->collectInvoicePayment($hospitalId, (int) $id, $request->validated());
        return $this->successResponse($order, "Payment collected and receipt updated successfully.");
    }

    #[OA\Post(
        path: "/api/v1/lab/orders/sync-billed",
        summary: "Auto-sync billed prescription investigations into lab worklist",
        description: "Scans paid investigations from OPD/Billing and automatically creates lab worklist orders.",
        tags: ["13. Lab — Orders & Billing"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Synced billed lab orders successfully")]
    public function syncBilled(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $count = $this->labService->syncBilledInvestigations($hospitalId);
        return $this->successResponse(['synced_count' => $count], "Successfully synced {$count} billed lab orders");
    }

    #[OA\Get(
        path: "/api/v1/lab/invoices",
        summary: "List lab invoices & billing history",
        description: "Retrieves list of all invoices generated from laboratory orders.",
        tags: ["13. Lab — Orders & Billing"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Lab billing & invoices history retrieved successfully")]
    public function invoices(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $invoices = $this->labService->getLabInvoices($hospitalId, $request);
        return $this->successResponse($invoices, "Lab billing & invoices history retrieved successfully");
    }
}
