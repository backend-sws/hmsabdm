<?php

namespace App\Http\Controllers;

use App\Http\Traits\HasApiResponse;
use App\Services\Department\DepartmentServiceInterface;
use Illuminate\Http\Request;

use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "7. Departments & Doctors",
    description: "Admin — Department & Doctor Setup"
)]
class DepartmentController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected DepartmentServiceInterface $departmentService
    ) {}

    #[OA\Get(
        path: "/api/v1/departments",
        summary: "List all departments in the hospital",
        security: [["bearerAuth" => []]],
        tags: ["7. Departments & Doctors"]
    )]
    #[OA\Response(response: 200, description: "List of departments")]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $departments = $this->departmentService->getAll($hospitalId);
        return $this->paginatedResponse($departments, 'List of departments');
    }

    #[OA\Post(
        path: "/api/v1/departments",
        summary: "Create a new department",
        security: [["bearerAuth" => []]],
        tags: ["7. Departments & Doctors"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "name", type: "string", example: "Cardiology"),
                new OA\Property(property: "code", type: "string", example: "CARDIO"),
                new OA\Property(property: "description", type: "string"),
                new OA\Property(property: "is_active", type: "boolean", example: true)
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Department created")]
    public function store(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        
        $validated = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                \Illuminate\Validation\Rule::unique('departments')->where(fn ($query) => $query->where('hospital_id', $hospitalId))
            ],
            'code' => [
                'required', 'string', 'max:20',
                \Illuminate\Validation\Rule::unique('departments')->where(fn ($query) => $query->where('hospital_id', $hospitalId))
            ],
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $department = $this->departmentService->create($hospitalId, $validated);
        
        return $this->createdResponse($department, 'Department created successfully');
    }

    #[OA\Put(
        path: "/api/v1/departments/{id}",
        summary: "Update a department",
        security: [["bearerAuth" => []]],
        tags: ["7. Departments & Doctors"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "name", type: "string", example: "Cardiology"),
                new OA\Property(property: "code", type: "string", example: "CARDIO"),
                new OA\Property(property: "is_active", type: "boolean")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Department updated")]
    public function update(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);

        $validated = $request->validate([
            'name' => [
                'sometimes', 'string', 'max:255',
                \Illuminate\Validation\Rule::unique('departments')
                    ->where(fn ($query) => $query->where('hospital_id', $hospitalId))
                    ->ignore($id)
            ],
            'code' => [
                'sometimes', 'string', 'max:20',
                \Illuminate\Validation\Rule::unique('departments')
                    ->where(fn ($query) => $query->where('hospital_id', $hospitalId))
                    ->ignore($id)
            ],
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $department = $this->departmentService->update($hospitalId, $id, $validated);
        
        return $this->successResponse($department, 'Department updated successfully');
    }

    #[OA\Delete(
        path: "/api/v1/departments/{id}",
        summary: "Delete a department",
        security: [["bearerAuth" => []]],
        tags: ["7. Departments & Doctors"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Department deleted")]
    public function destroy(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $this->departmentService->delete($hospitalId, $id);
        
        return $this->successResponse(null, 'Department deleted successfully');
    }
}
