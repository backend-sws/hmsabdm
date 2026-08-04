<?php

namespace App\Http\Controllers;

use App\Http\Traits\HasApiResponse;
use App\Services\Opd\OpdServiceInterface;
use Illuminate\Http\Request;

use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "5. OPD (Doctor)",
    description: "Doctor Panel — Today's OPD Queue Management"
)]
class OpdController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected OpdServiceInterface $opdService
    ) {}

    #[OA\Get(
        path: "/api/v1/opd/queue",
        summary: "Get today's OPD queue for a doctor",
        security: [["bearerAuth" => []]],
        tags: ["5. OPD (Doctor)"]
    )]
    #[OA\Parameter(name: "doctor_id", in: "query", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "List of patients in today's queue")]
    public function todayQueue(Request $request)
    {
        $request->validate([
            'doctor_id' => 'required|integer|exists:doctors,id',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $queue = $this->opdService->getTodayQueue($hospitalId, $request->doctor_id);
        
        return $this->paginatedResponse($queue, 'Today\'s OPD Queue');
    }

    #[OA\Post(
        path: "/api/v1/opd/visit/{visitId}/call",
        summary: "Call a patient into the doctor's cabin",
        security: [["bearerAuth" => []]],
        tags: ["5. OPD (Doctor)"]
    )]
    #[OA\Parameter(name: "visitId", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "doctor_id", type: "integer", example: 1)
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Patient called")]
    public function callPatient(Request $request, $visitId)
    {
        $request->validate([
            'doctor_id' => 'required|integer|exists:doctors,id'
        ]);

        $hospitalId = $this->getHospitalId($request);
        
        try {
            $visit = $this->opdService->callPatient($hospitalId, $request->doctor_id, $visitId);
            return $this->successResponse($visit, 'Patient called successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/opd/visit/{visitId}/complete",
        summary: "Complete a patient consultation",
        security: [["bearerAuth" => []]],
        tags: ["5. OPD (Doctor)"]
    )]
    #[OA\Parameter(name: "visitId", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "doctor_id", type: "integer", example: 1),
                new OA\Property(property: "diagnosis", type: "string"),
                new OA\Property(property: "notes", type: "string")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Consultation completed")]
    public function completeConsultation(Request $request, $visitId)
    {
        $validated = $request->validate([
            'doctor_id' => 'required|integer|exists:doctors,id',
            'diagnosis' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $hospitalId = $request->user()->hospital_id;

        try {
            $visit = $this->opdService->completeConsultation($hospitalId, $request->doctor_id, $visitId, $validated);
            return $this->successResponse($visit, 'Consultation completed successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }
}
