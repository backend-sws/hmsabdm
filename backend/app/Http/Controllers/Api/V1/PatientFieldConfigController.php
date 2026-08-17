<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\PatientField\PatientFieldConfigServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class PatientFieldConfigController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected PatientFieldConfigServiceInterface $fieldService
    ) {}

    #[OA\Get(
        path: "/api/v1/patient-fields/configs",
        summary: "Get list of dynamic custom patient fields",
        description: "Hospital Admin API: Retrieves the list of custom demographic/registration fields configured for the hospital (e.g. Marital Status, Occupation, Emergency Contact).",
        security: [["bearerAuth" => []]],
        tags: ["7. Hospital Settings (Hospital Admin)"]
    )]
    #[OA\Parameter(name: "active_only", in: "query", description: "Fetch only active fields (default: true)", required: false, schema: new OA\Schema(type: "boolean", example: true))]
    #[OA\Response(response: 200, description: "List of configured patient fields")]
    public function getConfigs(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $activeOnly = $request->has('active_only') ? filter_var($request->query('active_only'), FILTER_VALIDATE_BOOLEAN) : true;

        $configs = $this->fieldService->getFieldConfigs($hospitalId, $activeOnly);

        return $this->successResponse($configs, 'Patient custom field configs retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/patient-fields/configs",
        summary: "Create a new custom patient field",
        description: "Hospital Admin API: Defines a new custom registration field for the hospital.",
        security: [["bearerAuth" => []]],
        tags: ["7. Hospital Settings (Hospital Admin)"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["label"],
            properties: [
                new OA\Property(property: "label", type: "string", example: "Marital Status", description: "Human readable label"),
                new OA\Property(property: "field_key", type: "string", example: "marital_status", description: "Identifier key (snake_case)"),
                new OA\Property(property: "category", type: "string", example: "demographic", description: "Category (general, demographic, emergency, insurance)"),
                new OA\Property(property: "input_type", type: "string", enum: ["text", "number", "select", "date", "boolean", "textarea"], example: "select"),
                new OA\Property(property: "options", type: "array", items: new OA\Items(type: "string"), example: ["Single", "Married", "Divorced", "Widowed"]),
                new OA\Property(property: "placeholder", type: "string", example: "Select status"),
                new OA\Property(property: "is_required", type: "boolean", example: false),
                new OA\Property(property: "is_active", type: "boolean", example: true),
                new OA\Property(property: "sort_order", type: "integer", example: 10)
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Custom patient field created successfully")]
    public function createConfig(Request $request)
    {
        $validated = $request->validate([
            'label'        => 'required|string|max:255',
            'field_key'    => 'nullable|string|max:100',
            'category'     => 'nullable|string|max:50',
            'input_type'   => 'nullable|string|in:text,number,select,date,boolean,textarea',
            'options'      => 'nullable|array',
            'placeholder'  => 'nullable|string|max:255',
            'is_required'  => 'nullable|boolean',
            'is_active'    => 'nullable|boolean',
            'sort_order'   => 'nullable|integer',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $config = $this->fieldService->createFieldConfig($hospitalId, $validated);

        return $this->createdResponse($config, 'Custom patient field created successfully');
    }

    #[OA\Put(
        path: "/api/v1/patient-fields/configs/{id}",
        summary: "Update an existing custom patient field",
        security: [["bearerAuth" => []]],
        tags: ["7. Hospital Settings (Hospital Admin)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "label", type: "string", example: "Marital Status"),
                new OA\Property(property: "category", type: "string", example: "demographic"),
                new OA\Property(property: "input_type", type: "string", example: "select"),
                new OA\Property(property: "options", type: "array", items: new OA\Items(type: "string"), example: ["Single", "Married"]),
                new OA\Property(property: "placeholder", type: "string", example: "Select"),
                new OA\Property(property: "is_required", type: "boolean", example: false),
                new OA\Property(property: "is_active", type: "boolean", example: true),
                new OA\Property(property: "sort_order", type: "integer", example: 1)
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Custom patient field updated successfully")]
    public function updateConfig(Request $request, $id)
    {
        $validated = $request->validate([
            'label'        => 'sometimes|required|string|max:255',
            'field_key'    => 'nullable|string|max:100',
            'category'     => 'nullable|string|max:50',
            'input_type'   => 'nullable|string|in:text,number,select,date,boolean,textarea',
            'options'      => 'nullable|array',
            'placeholder'  => 'nullable|string|max:255',
            'is_required'  => 'nullable|boolean',
            'is_active'    => 'nullable|boolean',
            'sort_order'   => 'nullable|integer',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $config = $this->fieldService->updateFieldConfig($hospitalId, (int) $id, $validated);

        return $this->successResponse($config, 'Custom patient field updated successfully');
    }

    #[OA\Delete(
        path: "/api/v1/patient-fields/configs/{id}",
        summary: "Delete custom patient field configuration",
        security: [["bearerAuth" => []]],
        tags: ["7. Hospital Settings (Hospital Admin)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Field configuration deleted successfully")]
    public function deleteConfig(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $this->fieldService->deleteFieldConfig($hospitalId, (int) $id);

        return $this->successResponse(null, 'Custom patient field deleted successfully');
    }
}
