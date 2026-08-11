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
        description: "Retrieves a list of all patients registered in the hospital.",
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
        description: "Manually registers a new patient with their ABHA number. Useful for manual data entry.",
        tags: ["8. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["name"],
            properties: [
                new OA\Property(property: "name", type: "string", example: "John Doe"),
                new OA\Property(property: "mobile", type: "string", example: "9876543210"),
                new OA\Property(property: "abha_number", type: "string", example: "12-3456-7890-1234"),
                new OA\Property(property: "email", type: "string", format: "email", example: "john@example.com"),
                new OA\Property(property: "abha_address", type: "string", example: "johndoe@abdm"),
                new OA\Property(property: "dob", type: "string", format: "date", example: "1990-05-25"),
                new OA\Property(property: "gender", type: "string", example: "M"),
                new OA\Property(property: "blood_group", type: "string", example: "O+"),
                new OA\Property(property: "address", type: "string", example: "123 Main St, Appt 4B"),
                new OA\Property(property: "city", type: "string", example: "New Delhi"),
                new OA\Property(property: "pincode", type: "string", example: "110001")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Patient registered successfully")]
    #[OA\Response(response: 422, description: "Validation Error")]
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'mobile' => 'nullable|string|max:15',
            'abha_number' => 'nullable|string|unique:patients,abha_number',
            'email' => 'nullable|email|unique:patients,email',
            'abha_address' => 'nullable|string|max:255',
            'dob' => 'nullable|date',
            'gender' => 'nullable|string|in:M,F,O',
            'blood_group' => 'nullable|string|max:5',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
        ]);

        $patient = $this->patientService->registerPatient($data);

        return $this->createdResponse(new PatientResource($patient), 'Patient registered successfully');
    }
}
