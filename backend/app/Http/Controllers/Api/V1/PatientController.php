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
        description: "Retrieves a list of all patients registered in the hospital. Supports search by name, mobile, ABHA number/address, and pagination.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "search", in: "query", description: "Search by patient name, mobile, email, ABHA number, or ABHA address", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "per_page", in: "query", description: "Number of items per page (default: 15)", required: false, schema: new OA\Schema(type: "integer", example: 15))]
    #[OA\Parameter(name: "page", in: "query", description: "Page number", required: false, schema: new OA\Schema(type: "integer", example: 1))]
    #[OA\Parameter(name: "sort", in: "query", description: "Sort by field (e.g., name, created_at, -created_at)", required: false, schema: new OA\Schema(type: "string", example: "-created_at"))]
    #[OA\Response(response: 200, description: "List of patients retrieved successfully")]
    public function index(Request $request)
    {
        $patients = $this->patientService->getAllPatients($request);
        $resource = PatientResource::collection($patients)->response()->getData(true);
        return $this->successResponse($resource, 'Patients retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/patients",
        summary: "Register a new patient",
        description: "Manually registers a new patient with their ABHA number. Useful for manual data entry.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["name"],
            properties: [
                new OA\Property(property: "name", type: "string", example: "John Doe"),
                new OA\Property(property: "guardian_name", type: "string", example: "Robert Doe", description: "Father / Mother / Spouse / Guardian Name"),
                new OA\Property(property: "guardian_relation", type: "string", example: "Father", description: "Relation (Father, Mother, Spouse, etc.)"),
                new OA\Property(property: "guardian_phone", type: "string", example: "9876500000"),
                new OA\Property(property: "id_proof_type", type: "string", enum: ["aadhaar", "pan", "voter_id", "driving_license", "passport", "ration_card", "other"], example: "pan", description: "Identity Proof Type"),
                new OA\Property(property: "id_proof_number", type: "string", example: "ABCDE1234F", description: "Identity Card / Proof Number"),
                new OA\Property(property: "mobile", type: "string", example: "9876543210"),
                new OA\Property(property: "abha_number", type: "string", example: "12-3456-7890-1234"),
                new OA\Property(property: "email", type: "string", format: "email", example: "john@example.com"),
                new OA\Property(property: "abha_address", type: "string", example: "johndoe@abdm"),
                new OA\Property(property: "dob", type: "string", format: "date", example: "1990-05-25"),
                new OA\Property(property: "gender", type: "string", example: "M"),
                new OA\Property(property: "blood_group", type: "string", example: "O+"),
                new OA\Property(property: "address", type: "string", example: "123 Main St, Appt 4B"),
                new OA\Property(property: "city", type: "string", example: "New Delhi"),
                new OA\Property(property: "district", type: "string", example: "Central Delhi"),
                new OA\Property(property: "state", type: "string", example: "Delhi"),
                new OA\Property(property: "pincode", type: "string", example: "110001"),
                new OA\Property(property: "photo", type: "string", example: "data:image/jpeg;base64,..."),
                new OA\Property(
                    property: "custom_fields",
                    type: "object",
                    description: "Dynamic custom fields configured by the hospital",
                    example: ["marital_status" => "Married", "occupation" => "Engineer", "emergency_contact_name" => "Jane Doe"]
                )
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Patient registered successfully")]
    #[OA\Response(response: 422, description: "Validation Error")]
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'              => 'required|string|max:255',
            'guardian_name'     => 'nullable|string|max:255',
            'guardian_relation' => 'nullable|string|max:50',
            'guardian_phone'    => 'nullable|string|max:20',
            'id_proof_type'     => 'nullable|string|in:aadhaar,pan,voter_id,driving_license,passport,ration_card,other',
            'id_proof_number'   => 'nullable|string|max:100',
            'mobile'            => 'nullable|string|max:15',
            'abha_number'       => 'nullable|string|unique:patients,abha_number',
            'email'             => 'nullable|email|unique:patients,email',
            'abha_address'      => 'nullable|string|max:255',
            'dob'               => 'nullable|date',
            'gender'            => 'nullable|string|in:M,F,O',
            'blood_group'       => 'nullable|string|max:5',
            'address'           => 'nullable|string',
            'city'              => 'nullable|string|max:100',
            'district'          => 'nullable|string|max:100',
            'state'             => 'nullable|string|max:100',
            'pincode'           => 'nullable|string|max:20',
            'photo'             => 'nullable|string',
            'kyc_verified'      => 'nullable|boolean',
            'custom_fields'     => 'nullable|array',
        ]);

        $data['hospital_id'] = $this->getHospitalId($request);

        $patient = $this->patientService->registerPatient($data);

        return $this->createdResponse(new PatientResource($patient), 'Patient registered successfully');
    }

    #[OA\Get(
        path: "/api/v1/patients/{id}",
        summary: "Get specific Patient details by ID",
        description: "Retrieves complete demographic and latest vitals details of a patient.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Patient details retrieved successfully")]
    #[OA\Response(response: 404, description: "Patient not found")]
    public function show($id)
    {
        $patient = $this->patientService->getPatientById($id);
        return $this->successResponse(new PatientResource($patient->load('latestVital')), 'Patient details retrieved successfully');
    }

    #[OA\Put(
        path: "/api/v1/patients/{id}",
        summary: "Update patient demographic information",
        description: "Updates an existing patient's details such as name, guardian, ID proof, contact, address, DOB, gender, blood group, ABHA, or custom fields.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "name", type: "string", example: "John Doe Updated"),
                new OA\Property(property: "guardian_name", type: "string", example: "Robert Doe"),
                new OA\Property(property: "guardian_relation", type: "string", example: "Father"),
                new OA\Property(property: "guardian_phone", type: "string", example: "9876500000"),
                new OA\Property(property: "id_proof_type", type: "string", enum: ["aadhaar", "pan", "voter_id", "driving_license", "passport", "ration_card", "other"], example: "pan"),
                new OA\Property(property: "id_proof_number", type: "string", example: "ABCDE1234F"),
                new OA\Property(property: "mobile", type: "string", example: "9876543210"),
                new OA\Property(property: "abha_number", type: "string", example: "12-3456-7890-1234"),
                new OA\Property(property: "email", type: "string", format: "email", example: "john@example.com"),
                new OA\Property(property: "abha_address", type: "string", example: "johndoe@abdm"),
                new OA\Property(property: "dob", type: "string", format: "date", example: "1990-05-25"),
                new OA\Property(property: "gender", type: "string", example: "M"),
                new OA\Property(property: "blood_group", type: "string", example: "O+"),
                new OA\Property(property: "address", type: "string", example: "123 Main St, Appt 4B"),
                new OA\Property(property: "city", type: "string", example: "New Delhi"),
                new OA\Property(property: "district", type: "string", example: "Central Delhi"),
                new OA\Property(property: "state", type: "string", example: "Delhi"),
                new OA\Property(property: "pincode", type: "string", example: "110001"),
                new OA\Property(property: "photo", type: "string", example: "data:image/jpeg;base64,..."),
                new OA\Property(
                    property: "custom_fields",
                    type: "object",
                    description: "Dynamic custom fields configured by the hospital",
                    example: ["marital_status" => "Married", "occupation" => "Engineer"]
                )
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Patient updated successfully")]
    #[OA\Response(response: 422, description: "Validation Error")]
    #[OA\Response(response: 404, description: "Patient not found")]
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name'              => 'sometimes|required|string|max:255',
            'guardian_name'     => 'nullable|string|max:255',
            'guardian_relation' => 'nullable|string|max:50',
            'guardian_phone'    => 'nullable|string|max:20',
            'id_proof_type'     => 'nullable|string|in:aadhaar,pan,voter_id,driving_license,passport,ration_card,other',
            'id_proof_number'   => 'nullable|string|max:100',
            'mobile'            => 'nullable|string|max:15',
            'abha_number'       => 'nullable|string|unique:patients,abha_number,' . $id,
            'email'             => 'nullable|email|unique:patients,email,' . $id,
            'abha_address'      => 'nullable|string|max:255',
            'dob'               => 'nullable|date',
            'gender'            => 'nullable|string|in:M,F,O',
            'blood_group'       => 'nullable|string|max:5',
            'address'           => 'nullable|string',
            'city'              => 'nullable|string|max:100',
            'district'          => 'nullable|string|max:100',
            'state'             => 'nullable|string|max:100',
            'pincode'           => 'nullable|string|max:20',
            'photo'             => 'nullable|string',
            'kyc_verified'      => 'nullable|boolean',
            'custom_fields'     => 'nullable|array',
        ]);

        $patient = $this->patientService->updatePatient((int) $id, $validated);

        return $this->successResponse(new PatientResource($patient), 'Patient updated successfully');
    }

    #[OA\Delete(
        path: "/api/v1/patients/{id}",
        summary: "Delete a Patient record",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Patient deleted successfully")]
    #[OA\Response(response: 404, description: "Patient not found")]
    public function destroy($id)
    {
        $this->patientService->deletePatient((int) $id);
        return $this->successResponse(null, 'Patient deleted successfully');
    }

    #[OA\Get(
        path: "/api/v1/patients/{id}/history",
        summary: "Get 360-degree patient medical history and chronological timeline",
        description: "Fetches unified chronological timeline across OPD visits, IPD admissions, e-prescriptions, vitals recordings, and billing summary.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Patient 360 history retrieved successfully")]
    #[OA\Response(response: 404, description: "Patient not found")]
    public function history(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $history = $this->patientService->getPatientHistory((int) $id, $hospitalId);
        return $this->successResponse($history, 'Patient 360 history retrieved successfully');
    }
}

