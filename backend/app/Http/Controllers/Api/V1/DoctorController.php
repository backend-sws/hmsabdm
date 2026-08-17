<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;

use App\Http\Traits\HasApiResponse;
use App\Services\Doctor\DoctorServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Models\Doctor;

use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "7. Departments & Doctors",
    description: "Admin — Department & Doctor Setup"
)]
class DoctorController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected DoctorServiceInterface $doctorService
    ) {}

    #[OA\Get(
        path: "/api/v1/doctors",
        summary: "List all doctors in the hospital",
        description: "Retrieves a list of all registered doctors across all departments. Supports search, department filter, active status filter, and ?all=true for dropdowns.",
        security: [["bearerAuth" => []]],
        tags: ["8. Departments & Doctors"]
    )]
    #[OA\Parameter(name: "search", in: "query", description: "Search by doctor name, email, phone, specialization, or username", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "department_id", in: "query", description: "Filter doctors by department ID", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "is_active", in: "query", description: "Filter by active status (true/false)", required: false, schema: new OA\Schema(type: "boolean"))]
    #[OA\Parameter(name: "all", in: "query", description: "Set to true to fetch all doctors without pagination (for form dropdowns)", required: false, schema: new OA\Schema(type: "boolean", example: true))]
    #[OA\Parameter(name: "per_page", in: "query", description: "Number of items per page (default: 15)", required: false, schema: new OA\Schema(type: "integer", example: 15))]
    #[OA\Parameter(name: "page", in: "query", description: "Page number", required: false, schema: new OA\Schema(type: "integer", example: 1))]
    #[OA\Response(response: 200, description: "List of doctors")]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $doctors = $this->doctorService->getAll($hospitalId, $request);
        return $this->paginatedOrSuccessResponse($doctors, 'List of doctors');
    }

    #[OA\Get(
        path: "/api/v1/doctors/available-today",
        summary: "List doctors available today",
        description: "Fetches a list of doctors who have an active schedule for the current day of the week. Supports search and department filtering.",
        security: [["bearerAuth" => []]],
        tags: ["8. Departments & Doctors"]
    )]
    #[OA\Parameter(name: "search", in: "query", description: "Search by doctor name, specialization, or phone", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "department_id", in: "query", description: "Filter doctors by department ID", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "all", in: "query", description: "Set to true to fetch all available doctors without pagination (for dropdowns)", required: false, schema: new OA\Schema(type: "boolean", example: true))]
    #[OA\Parameter(name: "per_page", in: "query", description: "Number of items per page (default: 15)", required: false, schema: new OA\Schema(type: "integer", example: 15))]
    #[OA\Parameter(name: "page", in: "query", description: "Page number", required: false, schema: new OA\Schema(type: "integer", example: 1))]
    #[OA\Response(response: 200, description: "List of doctors available today")]
    public function availableToday(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $doctors = $this->doctorService->getAvailableToday($hospitalId, $request);
        return $this->paginatedOrSuccessResponse($doctors, 'List of doctors available today');
    }

    #[OA\Post(
        path: "/api/v1/doctors",
        summary: "Create a new doctor",
        description: "Registers a new doctor and assigns them to a specific department.",
        security: [["bearerAuth" => []]],
        tags: ["8. Departments & Doctors"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "department_id", type: "integer", example: 1),
                new OA\Property(property: "username", type: "string", example: "DR-SMITH-001"),
                new OA\Property(property: "password", type: "string", format: "password", example: "password123"),
                new OA\Property(property: "name", type: "string", example: "Dr. Smith"),
                new OA\Property(property: "specialization", type: "string", example: "Cardiologist"),
                new OA\Property(property: "qualification", type: "string", example: "MBBS, MD"),
                new OA\Property(property: "phone", type: "string", example: "9876543210"),
                new OA\Property(property: "email", type: "string", format: "email", example: "dr.smith@hospital.com"),
                new OA\Property(property: "hpr_id", type: "string", example: "HPR-1234"),
                new OA\Property(property: "consultation_time", type: "integer", example: 15),
                new OA\Property(property: "is_active", type: "boolean", example: true)
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Doctor created")]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'required|integer|exists:departments,id',
            'username' => 'nullable|string|max:255|unique:users,username',
            'password' => 'required|string|min:6',
            'name' => 'required|string|max:255',
            'specialization' => 'nullable|string|max:255',
            'qualification' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:15',
            'email' => 'nullable|email|max:255|unique:users,email',
            'hpr_id' => 'nullable|string|max:50',
            'consultation_time' => 'integer',
            'is_active' => 'boolean',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $doctor = $this->doctorService->create($hospitalId, $validated);
        
        return $this->createdResponse($doctor, 'Doctor created successfully');
    }

    #[OA\Put(
        path: "/api/v1/doctors/{id}",
        summary: "Update a doctor",
        description: "Updates the basic profile details of an existing doctor.",
        security: [["bearerAuth" => []]],
        tags: ["8. Departments & Doctors"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "department_id", type: "integer", example: 1),
                new OA\Property(property: "username", type: "string", example: "DR-SMITH-001"),
                new OA\Property(property: "password", type: "string", format: "password", example: "password123"),
                new OA\Property(property: "name", type: "string", example: "Dr. Smith"),
                new OA\Property(property: "specialization", type: "string", example: "Cardiologist"),
                new OA\Property(property: "qualification", type: "string", example: "MBBS, MD"),
                new OA\Property(property: "phone", type: "string", example: "9876543210"),
                new OA\Property(property: "email", type: "string", format: "email", example: "dr.smith@hospital.com"),
                new OA\Property(property: "hpr_id", type: "string", example: "HPR-1234"),
                new OA\Property(property: "consultation_time", type: "integer", example: 15),
                new OA\Property(property: "is_active", type: "boolean", example: true)
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Doctor updated")]
    public function update(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $doctor = Doctor::where('hospital_id', $hospitalId)->findOrFail($id);

        $validated = $request->validate([
            'department_id' => 'sometimes|integer|exists:departments,id',
            'username' => ['nullable', 'string', 'max:255', Rule::unique('users', 'username')->ignore($doctor->user_id)],
            'password' => 'nullable|string|min:6',
            'name' => 'sometimes|string|max:255',
            'specialization' => 'nullable|string|max:255',
            'qualification' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:15',
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($doctor->user_id)],
            'hpr_id' => 'nullable|string|max:50',
            'consultation_time' => 'integer',
            'is_active' => 'boolean',
        ]);

        $doctor = $this->doctorService->update($hospitalId, $id, $validated);
        
        return $this->successResponse($doctor, 'Doctor updated successfully');
    }

    #[OA\Put(
        path: "/api/v1/doctors/{id}/schedule",
        summary: "Update doctor schedule",
        description: "Updates the weekly availability of a doctor. Time must be in 24-hour HH:MM format (e.g., '09:00', '17:30'). Day of week: 0=Sun, 1=Mon, ..., 6=Sat.",
        security: [["bearerAuth" => []]],
        tags: ["8. Departments & Doctors"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "schedules", type: "array", items: new OA\Items(
                    properties: [
                        new OA\Property(property: "day_of_week", type: "integer", example: 1),
                        new OA\Property(property: "start_time", type: "string", example: "09:00"),
                        new OA\Property(property: "end_time", type: "string", example: "17:00"),
                        new OA\Property(property: "max_patients", type: "integer", example: 50),
                        new OA\Property(property: "opd_fee", type: "number", format: "float", example: 500.00),
                        new OA\Property(property: "is_active", type: "boolean", example: true)
                    ]
                ))
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Doctor schedule updated")]
    public function updateSchedule(Request $request, $id)
    {
        $validated = $request->validate([
            'schedules' => 'required|array',
            'schedules.*.day_of_week' => 'required|integer|min:0|max:6',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
            'schedules.*.max_patients' => 'nullable|integer',
            'schedules.*.opd_fee' => 'nullable|numeric',
            'schedules.*.is_active' => 'boolean',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $this->doctorService->updateSchedule($hospitalId, $id, $validated['schedules']);
        
        return $this->successResponse(null, 'Doctor schedule updated successfully');
    }

    #[OA\Delete(
        path: "/api/v1/doctors/{id}",
        summary: "Delete a doctor",
        description: "Deactivates or deletes a doctor record from the hospital.",
        security: [["bearerAuth" => []]],
        tags: ["8. Departments & Doctors"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Doctor deleted")]
    public function destroy(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $this->doctorService->delete($hospitalId, $id);
        
        return $this->successResponse(null, 'Doctor deleted successfully');
    }
}
