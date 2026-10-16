<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Models\LabOrder;
use App\Services\Lab\LabServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class LabReportController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected LabServiceInterface $labService
    ) {}

    #[OA\Get(
        path: "/api/v1/lab/orders/{id}/report",
        summary: "Get formatted printable diagnostic report payload",
        description: "Assembles complete clinical report data including hospital header, patient demographics, selective test panels, dilution matrices, CLSI antibiograms, and digital signatures.",
        tags: ["17. Lab — Diagnostic Reports"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "tests", in: "query", description: "Comma-separated list of order item IDs to selectively print (e.g. 1,3)", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Response(response: 200, description: "Diagnostic report payload generated successfully")]
    public function diagnosticReport(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $itemIds = $request->has('tests') && !empty($request->query('tests'))
            ? array_filter(array_map('intval', explode(',', $request->query('tests'))))
            : null;
        $report = $this->labService->getDiagnosticReport($hospitalId, (int) $id, $itemIds);
        return $this->successResponse($report, 'Diagnostic report payload generated successfully');
    }

    #[OA\Get(
        path: "/api/v1/public/lab/report/{id}",
        summary: "Public digital diagnostic report verification (for QR-code scanning)",
        description: "Public unauthenticated endpoint to allow patient and external doctors to scan QR code on print paper and verify genuine lab results online.",
        tags: ["17. Lab — Diagnostic Reports"]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "tests", in: "query", description: "Optional comma-separated list of test item IDs", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Response(response: 200, description: "Public diagnostic report retrieved successfully")]
    #[OA\Response(response: 404, description: "Lab order not found")]
    public function publicDiagnosticReport(Request $request, $id)
    {
        $order = LabOrder::find((int) $id);
        if (!$order) {
            return $this->errorResponse('Diagnostic lab order not found.', 404);
        }

        $hospitalId = $order->hospital_id;
        $itemIds = $request->has('tests') && !empty($request->query('tests'))
            ? array_filter(array_map('intval', explode(',', $request->query('tests'))))
            : null;
        $report = $this->labService->getDiagnosticReport($hospitalId, $order->id, $itemIds);
        return $this->successResponse($report, 'Public diagnostic report retrieved successfully');
    }
}
