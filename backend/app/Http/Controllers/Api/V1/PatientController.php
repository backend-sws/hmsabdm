<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;

use Illuminate\Http\Request;
use App\Services\Patient\PatientServiceInterface;
use App\Http\Traits\HasApiResponse;
use App\Http\Resources\PatientResource;
use OpenApi\Attributes as OA;

class PatientController extends Controller
{
    use HasApiResponse;

    protected PatientServiceInterface $patientService;

    public function __construct(PatientServiceInterface $patientService)
    {
        $this->patientService = $patientService;
    }

    #[OA\Get(
        path: "/api/v1/patients",
        summary: "Get all patients",
        tags: ["8. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "List of patients retrieved successfully")]
    public function index()
    {
        $patients = $this->patientService->getAllPatients();
        $resource = PatientResource::collection($patients)->response()->getData(true);
        return $this->successResponse($resource, 'Patients retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/patients",
        summary: "Register a new patient",
        tags: ["8. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["name", "phone", "abha_number"],
            properties: [
                new OA\Property(property: "name", type: "string", example: "John Doe"),
                new OA\Property(property: "phone", type: "string", example: "9876543210"),
                new OA\Property(property: "abha_number", type: "string", example: "12-3456-7890-1234"),
                new OA\Property(property: "email", type: "string", format: "email", example: "john@example.com")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Patient registered successfully")]
    #[OA\Response(response: 422, description: "Validation Error")]
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:15|unique:patients,phone',
            'abha_number' => 'required|string|unique:patients,abha_number',
            'email' => 'nullable|email|unique:patients,email'
        ]);

        $patient = $this->patientService->registerPatient($data);

        return $this->createdResponse(new PatientResource($patient), 'Patient registered successfully');
    }
}
