<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lab\CollectSampleRequest;
use App\Http\Requests\Lab\RejectSampleRequest;
use App\Http\Traits\HasApiResponse;
use App\Services\Lab\LabServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class LabPhlebotomyController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected LabServiceInterface $labService
    ) {}

    #[OA\Post(
        path: "/api/v1/lab/orders/{id}/collect-sample",
        summary: "Phlebotomy: Mark sample collected & generate barcode accession number",
        description: "Updates order status to sample_collected, assigns unique date-prefixed accession barcode number.",
        tags: ["14. Lab — Phlebotomy & Queue"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: false,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "sample_type", type: "string", example: "Blood / Serum"),
                new OA\Property(property: "container_color", type: "string", example: "Lavender / EDTA Tube"),
                new OA\Property(property: "notes", type: "string", example: "Fasting blood sample collected from left arm")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Sample collected successfully. Accession number generated.")]
    public function collectSample(CollectSampleRequest $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->markSampleCollected($hospitalId, (int) $id, $userId, $request->validated());
        return $this->successResponse($order, 'Sample collected successfully. Accession number generated.');
    }

    #[OA\Post(
        path: "/api/v1/lab/orders/{id}/call-token",
        summary: "Call next phlebotomy token for sample collection booth",
        description: "Updates token state to 'calling' for announcement on waiting room TV screens.",
        tags: ["14. Lab — Phlebotomy & Queue"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: false,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "booth_number", type: "string", example: "Booth 1")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Token called successfully for booth")]
    public function callToken(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $booth = $request->input('booth_number', 'Booth 1');
        $order = $this->labService->callToken($hospitalId, (int) $id, $booth);
        return $this->successResponse($order, "Token {$order->token_number} called for {$booth}");
    }

    #[OA\Get(
        path: "/api/v1/lab/queue/display",
        summary: "Live token queue for waiting room TV kiosk display",
        description: "Returns currently called tokens, serving booths, and waiting queue counts.",
        tags: ["14. Lab — Phlebotomy & Queue"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Phlebotomy active queue retrieved successfully")]
    public function queueDisplay(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $queue = $this->labService->getActiveTokensQueue($hospitalId);
        return $this->successResponse($queue, 'Phlebotomy active queue retrieved');
    }

    #[OA\Post(
        path: "/api/v1/lab/orders/{id}/reject-sample",
        summary: "Reject collected specimen due to pre-analytical error",
        description: "Rejects specimen with clinical rationale (e.g., Hemolyzed, Clotted, QNS, Wrong Tube) and logs to audit trail.",
        tags: ["14. Lab — Phlebotomy & Queue"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["reason"],
            properties: [
                new OA\Property(property: "reason", type: "string", example: "Sample severely hemolyzed during transit.")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Sample marked as rejected")]
    public function rejectSample(RejectSampleRequest $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->rejectSample($hospitalId, (int) $id, $userId, $request->validated());
        return $this->successResponse($order, 'Sample marked as rejected');
    }

    #[OA\Post(
        path: "/api/v1/lab/orders/{id}/recollect-sample",
        summary: "Request urgent STAT recollection for rejected sample",
        description: "Generates a STAT priority recollection token for phlebotomist.",
        tags: ["14. Lab — Phlebotomy & Queue"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Lab Order ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Recollection token raised with STAT priority")]
    public function recollectSample(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->recollectSample($hospitalId, (int) $id, $userId);
        return $this->successResponse($order, "Recollection token {$order->token_number} raised with STAT priority");
    }
}
