<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lab\ApproveOrderItemsRequest;
use App\Http\Requests\Lab\AuthorizeLabOrderRequest;
use App\Http\Requests\Lab\RecordLabResultsRequest;
use App\Http\Traits\HasApiResponse;
use App\Services\Lab\LabServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class LabResultController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected LabServiceInterface $labService
    ) {}

    #[OA\Post(
        path: "/api/v1/lab/orders/{id}/results",
        summary: "Record laboratory test results with live formula evaluations & flags",
        description: "Saves parameter observed results, computes flags against biological reference intervals, evaluates dynamic formulas, and updates per-test clinical interpretations.",
        tags: ["15. Lab — Results & Pathology"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["results"],
            properties: [
                new OA\Property(
                    property: "results",
                    type: "array",
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: "order_item_id", type: "integer", example: 1),
                            new OA\Property(property: "parameter_id", type: "integer", example: 5),
                            new OA\Property(property: "parameter_name", type: "string", example: "Hemoglobin"),
                            new OA\Property(property: "short_code", type: "string", example: "HB"),
                            new OA\Property(property: "unit", type: "string", example: "g/dL"),
                            new OA\Property(property: "observed_value", type: "string", example: "14.5")
                        ]
                    )
                ),
                new OA\Property(property: "technician_remarks", type: "string", example: "Sample processed on automated hematology analyzer Sysmex XN-550"),
                new OA\Property(property: "clinical_notes", type: "string", example: "Normocytic normochromic blood picture"),
                new OA\Property(property: "action", type: "string", example: "draft")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Test results recorded and verified against reference ranges")]
    public function recordResults(RecordLabResultsRequest $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->recordResults($hospitalId, (int) $id, $userId, $request->validated());
        return $this->successResponse($order, 'Test results recorded and verified against reference ranges');
    }

    #[OA\Get(
        path: "/api/v1/lab/patients/{patientId}/delta-history",
        summary: "Fetch patient previous authorized test results for Delta Check",
        description: "Retrieves past verified readings of matching parameters for the patient to calculate historical percentage change.",
        tags: ["15. Lab — Results & Pathology"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "patientId", in: "path", description: "Patient ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Patient previous lab test results retrieved successfully")]
    public function deltaHistory(Request $request, $patientId)
    {
        $hospitalId = $this->getHospitalId($request);
        $history = $this->labService->getPatientPreviousResults($hospitalId, (int) $patientId);
        return $this->successResponse($history, 'Patient previous lab test results retrieved');
    }

    #[OA\Post(
        path: "/api/v1/lab/orders/{id}/authorize",
        summary: "Pathologist authorization & sign-off release for complete report",
        description: "Official sign-off by pathologist. Seals all verified results and marks order as authorized.",
        tags: ["15. Lab — Results & Pathology"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Diagnostic report successfully authorized and released")]
    public function authorizeOrder(AuthorizeLabOrderRequest $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $doctorId = $request->user()?->doctor?->id;
        $order = $this->labService->authorizeReport($hospitalId, (int) $id, $doctorId, $request->validated());
        return $this->successResponse($order, 'Diagnostic report successfully authorized and released');
    }

    #[OA\Post(
        path: "/api/v1/lab/orders/{id}/approve-items",
        summary: "Independent panel approval for ready test items",
        description: "Allows pathologist to release completed test panels (e.g. CBC) while longer cultures remain in progress.",
        tags: ["15. Lab — Results & Pathology"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Selected test panels approved successfully")]
    public function approveItems(ApproveOrderItemsRequest $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $doctorId = $request->user()?->doctor?->id;
        $userId = $request->user()?->id ?? 1;
        $itemIds = array_map('intval', $request->input('item_ids', []));
        $notes = $request->input('notes');

        $order = $this->labService->approveOrderItems($hospitalId, (int) $id, $doctorId, $userId, $itemIds, $notes);
        return $this->successResponse($order, count($itemIds) . ' test panel(s) approved and signed off successfully');
    }

    #[OA\Post(
        path: "/api/v1/lab/orders/{id}/items/{itemId}/revoke",
        summary: "Revoke approval for a specific test item",
        description: "Re-opens an independently approved test panel back to completed for re-examination.",
        tags: ["15. Lab — Results & Pathology"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "itemId", in: "path", description: "Order Item ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Test panel approval revoked for re-examination")]
    public function revokeItem(Request $request, $id, $itemId)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $reason = $request->input('reason');

        $order = $this->labService->revokeOrderItem($hospitalId, (int) $id, (int) $itemId, $userId, $reason);
        return $this->successResponse($order, 'Test panel approval revoked for re-examination');
    }

    #[OA\Post(
        path: "/api/v1/lab/orders/{id}/revoke-authorization",
        summary: "Revoke full order authorization to allow corrections",
        description: "Re-opens an authorized report to in_progress or partially_authorized with audit trail logging.",
        tags: ["15. Lab — Results & Pathology"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Authorization revoked. Report re-opened for modification.")]
    public function revokeAuthorization(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->revokeAuthorization($hospitalId, (int) $id, $userId, $request->input('reason'));
        return $this->successResponse($order, "Authorization revoked. Report re-opened for modification.");
    }

    #[OA\Get(
        path: "/api/v1/lab/orders/{id}/audit-logs",
        summary: "Get complete audit trail of result entries, edits, and approvals",
        description: "Retrieves complete chronological record of parameter modifications, previous vs new values, user IDs, and timestamps.",
        tags: ["15. Lab — Results & Pathology"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Order audit logs retrieved successfully")]
    public function auditLogs(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $logs = $this->labService->getAuditLogs($hospitalId, (int) $id);
        return $this->successResponse($logs, 'Order audit logs retrieved successfully');
    }
}
