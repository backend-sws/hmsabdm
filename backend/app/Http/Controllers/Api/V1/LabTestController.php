<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lab\StoreLabTemplateRequest;
use App\Http\Requests\Lab\UpdateLabTemplateRequest;
use App\Http\Traits\HasApiResponse;
use App\Services\Lab\LabServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class LabTestController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected LabServiceInterface $labService
    ) {}

    #[OA\Get(
        path: "/api/v1/lab/templates",
        summary: "List / search test templates from Master Catalog (281+ tests)",
        description: "Retrieves pathology test catalog filtered by category, department, or search query with parameters and biological reference intervals.",
        tags: ["16. Lab — Test Catalog Master"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "search", in: "query", description: "Search by test name or test code", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "category", in: "query", description: "Filter by category (Hematology, Biochemistry, etc.)", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "department_id", in: "query", description: "Filter by department ID", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "per_page", in: "query", description: "Items per page (default: 300)", required: false, schema: new OA\Schema(type: "integer", example: 50))]
    #[OA\Response(response: 200, description: "Test templates catalog retrieved successfully")]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $templates = $this->labService->getTemplates($hospitalId, $request);
        return $this->paginatedOrSuccessResponse($templates, 'Test templates catalog retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/lab/templates/{id}",
        summary: "Get single test template details with parameters & reference ranges",
        description: "Retrieves complete test template configuration, specimen requirements, container color, methodology, and parameters.",
        tags: ["16. Lab — Test Catalog Master"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Test Template ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Test template details retrieved")]
    #[OA\Response(response: 404, description: "Test template not found")]
    public function show(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $template = $this->labService->getTemplate($hospitalId, (int) $id);
        return $this->successResponse($template, 'Test template details retrieved');
    }

    #[OA\Post(
        path: "/api/v1/lab/templates",
        summary: "Create new custom test template with parameters & reference ranges",
        description: "Creates a new test template in the hospital master catalog with customizable parameters, formulas, and age/gender reference ranges.",
        tags: ["16. Lab — Test Catalog Master"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["test_name", "test_code"],
            properties: [
                new OA\Property(property: "test_name", type: "string", example: "Cardiac Troponin I (High Sensitive)"),
                new OA\Property(property: "test_code", type: "string", example: "TROP-I"),
                new OA\Property(property: "category", type: "string", example: "Biochemistry & Immunochemistry"),
                new OA\Property(property: "sample_type", type: "string", example: "Serum / Heparinized Plasma"),
                new OA\Property(property: "container_color", type: "string", example: "Yellow / SST Gel Tube"),
                new OA\Property(property: "method", type: "string", example: "CMIA"),
                new OA\Property(property: "standard_price", type: "number", example: 850),
                new OA\Property(property: "tat_hours", type: "integer", example: 2)
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Test template created successfully")]
    public function store(StoreLabTemplateRequest $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $template = $this->labService->createTemplate($hospitalId, $request->validated());
        return $this->createdResponse($template, 'Test template created successfully');
    }

    #[OA\Put(
        path: "/api/v1/lab/templates/{id}",
        summary: "Update existing test template, parameters, or biological reference ranges",
        description: "Updates test template configuration, prices, specimen tubes, methodology, parameters, and age/gender biological reference ranges.",
        tags: ["16. Lab — Test Catalog Master"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Test Template ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Test template updated successfully")]
    public function update(UpdateLabTemplateRequest $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $template = $this->labService->updateTemplate($hospitalId, (int) $id, $request->validated());
        return $this->successResponse($template, 'Test template updated successfully');
    }

    #[OA\Delete(
        path: "/api/v1/lab/templates/{id}",
        summary: "Deactivate / soft-delete test template from catalog",
        description: "Deactivates a test template from hospital active catalog.",
        tags: ["16. Lab — Test Catalog Master"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", description: "Test Template ID", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Test template deactivated successfully")]
    public function destroy(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $this->labService->deleteTemplate($hospitalId, (int) $id);
        return $this->successResponse(null, 'Test template deactivated successfully');
    }
}
