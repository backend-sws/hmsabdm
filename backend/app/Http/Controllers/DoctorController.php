<?php

namespace App\Http\Controllers;

use App\Http\Traits\HasApiResponse;
use App\Services\Doctor\DoctorServiceInterface;
use Illuminate\Http\Request;

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
        security: [["bearerAuth" => []]],
        tags: ["7. Departments & Doctors"]
    )]
    #[OA\Response(response: 200, description: "List of doctors")]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $doctors = $this->doctorService->getAll($hospitalId);
        return $this->paginatedResponse($doctors, 'List of doctors');
    }

    #[OA\Get(
        path: "/api/v1/doctors/available-today",
        summary: "List doctors available today",
        security: [["bearerAuth" => []]],
        tags: ["7. Departments & Doctors"]
    )]
    #[OA\Response(response: 200, description: "List of doctors available today")]
    public function availableToday(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $doctors = $this->doctorService->getAvailableToday($hospitalId);
        return $this->paginatedResponse($doctors, 'List of doctors available today');
    }

    #[OA\Post(
        path: "/api/v1/doctors",
        summary: "Create a new doctor",
        security: [["bearerAuth" => []]],
        tags: ["7. Departments & Doctors"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "department_id", type: "integer", example: 1),
                new OA\Property(property: "name", type: "string", example: "Dr. Smith"),
                new OA\Property(property: "specialization", type: "string"),
                new OA\Property(property: "phone", type: "string"),
                new OA\Property(property: "is_active", type: "boolean", example: true)
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Doctor created")]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'required|integer|exists:departments,id',
            'user_id' => 'nullable|integer|exists:users,id',
            'name' => 'required|string|max:255',
            'specialization' => 'nullable|string|max:255',
            'qualification' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:15',
            'email' => 'nullable|email|max:255',
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
        security: [["bearerAuth" => []]],
        tags: ["7. Departments & Doctors"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "department_id", type: "integer", example: 1),
                new OA\Property(property: "name", type: "string", example: "Dr. Smith"),
                new OA\Property(property: "is_active", type: "boolean", example: true)
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Doctor updated")]
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'department_id' => 'sometimes|integer|exists:departments,id',
            'user_id' => 'nullable|integer|exists:users,id',
            'name' => 'sometimes|string|max:255',
            'specialization' => 'nullable|string|max:255',
            'qualification' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:15',
            'email' => 'nullable|email|max:255',
            'hpr_id' => 'nullable|string|max:50',
            'consultation_time' => 'integer',
            'is_active' => 'boolean',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $doctor = $this->doctorService->update($hospitalId, $id, $validated);
        
        return $this->successResponse($doctor, 'Doctor updated successfully');
    }

    #[OA\Put(
        path: "/api/v1/doctors/{id}/schedule",
        summary: "Update doctor schedule",
        security: [["bearerAuth" => []]],
        tags: ["7. Departments & Doctors"]
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
                        new OA\Property(property: "max_patients", type: "integer", example: 50)
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
        security: [["bearerAuth" => []]],
        tags: ["7. Departments & Doctors"]
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
