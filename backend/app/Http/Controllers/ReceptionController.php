<?php

namespace App\Http\Controllers;

use App\Http\Traits\HasApiResponse;
use App\Http\Traits\AbdmValidatable;
use App\Models\Patient;
use App\Services\Abdm\AbdmServiceInterface;
use App\Services\Reception\ReceptionServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "4. Reception",
    description: "Flow C & D — Walk-in Registration, Departments, OPD Visit, Scan & Share Queue"
)]
class ReceptionController extends Controller
{
    use HasApiResponse, AbdmValidatable;

    public function __construct(
        protected AbdmServiceInterface $abdmService,
        protected ReceptionServiceInterface $receptionService
    ) {}


    #[OA\Get(
        path: "/api/v1/reception/scan-and-share/queues",
        summary: "List all patients waiting in queue from Scan & Share",
        security: [["bearerAuth" => []]],
        tags: ["4. Reception"]
    )]
    #[OA\Response(response: 200, description: "List of waiting queues")]
    public function getWaitingQueues(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $queues = $this->receptionService->getWaitingQueues($hospitalId);
        return $this->paginatedResponse($queues, 'List of waiting queues');
    }

    #[OA\Post(
        path: "/api/v1/reception/scan-and-share/token",
        summary: "Find patient in queue by token",
        security: [["bearerAuth" => []]],
        tags: ["4. Reception"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "token", type: "string", example: "482")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Patient details")]
    public function getByToken(Request $request)
    {
        $request->validate(['token' => 'required|string']);
        $hospitalId = $this->getHospitalId($request);

        try {
            $queue = $this->receptionService->getQueueByToken($hospitalId, $request->token);
            return $this->successResponse($queue);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 404);
        }
    }

    #[OA\Get(
        path: "/api/v1/reception/departments",
        summary: "Get all departments with active doctors",
        security: [["bearerAuth" => []]],
        tags: ["4. Reception"]
    )]
    #[OA\Response(response: 200, description: "Departments and doctors list")]
    public function getDepartments(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $departments = $this->receptionService->getDepartmentsWithDoctors($hospitalId);
        return $this->paginatedResponse($departments, 'Departments and doctors list');
    }

    #[OA\Post(
        path: "/api/v1/reception/register",
        summary: "Register a patient without ABHA",
        security: [["bearerAuth" => []]],
        tags: ["4. Reception"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "name", type: "string"),
                new OA\Property(property: "mobile", type: "string"),
                new OA\Property(property: "gender", type: "string", example: "M"),
                new OA\Property(property: "dob", type: "string", format: "date")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Patient Registered")]
    public function registerWithoutAbha(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'mobile' => 'nullable|string|max:15',
            'gender' => 'nullable|string|size:1',
            'dob' => 'nullable|date',
            'blood_group' => 'nullable|string',
            'address' => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $patient = $this->receptionService->registerPatient($hospitalId, $validated);
        
        return $this->createdResponse($patient, 'Patient registered successfully');
    }

    #[OA\Post(
        path: "/api/v1/reception/scan-and-share/confirm",
        summary: "Confirm a Scan & Share queue and generate OPD Visit",
        security: [["bearerAuth" => []]],
        tags: ["4. Reception"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "queue_id", type: "integer"),
                new OA\Property(property: "doctor_id", type: "integer"),
                new OA\Property(property: "department_id", type: "integer"),
                new OA\Property(property: "appointment_type_id", type: "integer", nullable: true)
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Queue Confirmed & OPD Visit Created")]
    public function confirmQueue(Request $request)
    {
        $request->validate([
            'queue_id' => 'required|integer|exists:counter_queues,id',
            'doctor_id' => 'required|integer|exists:doctors,id',
            'department_id' => 'required|integer|exists:departments,id',
            'appointment_type_id' => 'nullable|integer|exists:appointment_types,id',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $visit = $this->receptionService->confirmQueue(
                $hospitalId,
                $request->queue_id,
                $request->doctor_id,
                $request->department_id,
                $request->appointment_type_id
            );

            return $this->successResponse($visit, 'Queue Confirmed and OPD Visit Created');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/reception/visit",
        summary: "Create direct OPD visit for registered patient",
        security: [["bearerAuth" => []]],
        tags: ["4. Reception"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "patient_id", type: "integer"),
                new OA\Property(property: "doctor_id", type: "integer"),
                new OA\Property(property: "department_id", type: "integer")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "OPD Visit Created")]
    public function createVisit(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|integer|exists:patients,id',
            'doctor_id' => 'required|integer|exists:doctors,id',
            'department_id' => 'required|integer|exists:departments,id',
            'appointment_type_id' => 'nullable|integer|exists:appointment_types,id',
            'chief_complaint' => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $visit = $this->receptionService->createOpdVisit($hospitalId, $validated);
            return $this->successResponse($visit, 'OPD Visit Created Successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }
}
