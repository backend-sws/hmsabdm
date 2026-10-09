<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;

use App\Http\Traits\HasApiResponse;
use App\Services\Opd\OpdServiceInterface;
use Illuminate\Http\Request;

use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "6. OPD (Doctor)",
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
        description: "Fetches the list of all patients assigned to a specific doctor for today's date. Supports status filtering and patient search.",
        security: [["bearerAuth" => []]],
        tags: ["6. OPD (Doctor)"]
    )]
    #[OA\Parameter(name: "doctor_id", in: "query", description: "ID of the doctor", required: true, schema: new OA\Schema(type: "integer", example: 1))]
    #[OA\Parameter(name: "status", in: "query", description: "Filter by status: waiting, called, in_consultation, done, cancelled, or all", required: false, schema: new OA\Schema(type: "string", example: "waiting"))]
    #[OA\Parameter(name: "search", in: "query", description: "Search by patient name, mobile, ABHA number, or token", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "all", in: "query", description: "Set to true to fetch full queue without pagination", required: false, schema: new OA\Schema(type: "boolean", example: false))]
    #[OA\Parameter(name: "per_page", in: "query", description: "Number of items per page (default: 15)", required: false, schema: new OA\Schema(type: "integer", example: 15))]
    #[OA\Parameter(name: "page", in: "query", description: "Page number", required: false, schema: new OA\Schema(type: "integer", example: 1))]
    #[OA\Response(response: 200, description: "List of patients in today's queue")]
    public function todayQueue(Request $request)
    {
        $request->validate([
            'doctor_id'     => 'nullable|integer|exists:doctors,id',
            'department_id' => 'nullable|integer|exists:departments,id',
            'status'        => 'nullable|string',
            'search'        => 'nullable|string',
            'date'          => 'nullable|date',
            'start_date'    => 'nullable|date',
            'end_date'      => 'nullable|date',
            'all_dates'     => 'nullable',
        ]);

        $user = $request->user();
        $hospitalId = $this->getHospitalId($request);

        // Check if user is a doctor
        $doctor = $user ? \App\Models\Doctor::where('user_id', $user->id)->first() : null;
        $isDoctor = ($doctor !== null) || ($user && ($user->hasRole('Doctor') || $user->hasRole('DOCTOR')));

        if ($isDoctor && $doctor) {
            // STRICT ISOLATION: A doctor can ONLY see their own patients
            $doctorId = $doctor->id;
        } else {
            // Hospital Admin / Receptionist can view all or filter by doctor
            $doctorId = $request->filled('doctor_id') ? (int) $request->input('doctor_id') : null;
        }

        $queue = $this->opdService->getTodayQueue($hospitalId, $doctorId, $request);
        
        return $this->paginatedOrSuccessResponse($queue, 'Today\'s OPD Queue');
    }

    #[OA\Post(
        path: "/api/v1/opd/visit/{visitId}/call",
        summary: "Call a patient into the doctor's cabin",
        description: "Marks the patient's status as 'Consulting', indicating the doctor has started the checkup.",
        security: [["bearerAuth" => []]],
        tags: ["6. OPD (Doctor)"]
    )]
    #[OA\Parameter(name: "visitId", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: false,
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
            'doctor_id' => 'nullable|integer|exists:doctors,id'
        ]);

        $hospitalId = $this->getHospitalId($request);
        $user = $request->user();
        $doctor = $user ? \App\Models\Doctor::where('user_id', $user->id)->first() : null;

        $doctorId = $request->input('doctor_id') ?? ($doctor ? $doctor->id : null);

        if (!$doctorId) {
            $visit = \App\Models\OpdVisit::where('hospital_id', $hospitalId)->find($visitId);
            $doctorId = $visit ? $visit->doctor_id : null;
        }

        if (!$doctorId) {
            return $this->errorResponse('Doctor identifier could not be determined.', null, 422);
        }
        
        try {
            $visit = $this->opdService->callPatient($hospitalId, (int)$doctorId, (int)$visitId);
            return $this->successResponse($visit, 'Patient called successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/opd/visit/{visitId}/complete",
        summary: "Complete a patient consultation",
        description: "Finishes the OPD visit. The doctor can add diagnosis, clinical notes, and medicines. Status becomes 'Completed'.",
        security: [["bearerAuth" => []]],
        tags: ["6. OPD (Doctor)"]
    )]
    #[OA\Parameter(name: "visitId", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: false,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "doctor_id", type: "integer", example: 1),
                new OA\Property(property: "diagnosis", type: "string", example: "Viral Fever"),
                new OA\Property(property: "notes", type: "string", example: "Advised rest for 3 days and paracetamol 500mg SOS.")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Consultation completed")]
    public function completeConsultation(Request $request, $visitId)
    {
        $request->validate([
            'doctor_id' => 'nullable|integer|exists:doctors,id',
            'diagnosis' => 'nullable|string',
            'notes'     => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $user = $request->user();
        $doctor = $user ? \App\Models\Doctor::where('user_id', $user->id)->first() : null;

        $doctorId = $request->input('doctor_id') ?? ($doctor ? $doctor->id : null);

        if (!$doctorId) {
            $visit = \App\Models\OpdVisit::where('hospital_id', $hospitalId)->find($visitId);
            $doctorId = $visit ? $visit->doctor_id : null;
        }

        if (!$doctorId) {
            return $this->errorResponse('Doctor identifier could not be determined.', null, 422);
        }

        try {
            $visit = $this->opdService->completeConsultation($hospitalId, (int)$doctorId, (int)$visitId, $request->all());
            return $this->successResponse($visit, 'Consultation completed successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }
}
