<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\Ward\WardServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class WardController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected WardServiceInterface $wardService
    ) {}

    #[OA\Get(
        path: "/api/v1/wards",
        summary: "Get all wards for the hospital with bed statistics and room pricing",
        description: "Retrieves all hospital wards with bed occupancy counts and daily charges.",
        tags: ["18. Inpatient Department (IPD) & Wards"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "search", in: "query", description: "Search by ward name, code, or floor", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Response(response: 200, description: "Wards retrieved successfully")]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $wards = $this->wardService->getWards($hospitalId, $request);
        return $this->successResponse($wards, 'Wards retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/wards",
        summary: "Create a new Ward with room pricing and optional initial beds",
        description: "Creates a new clinical ward/unit with capacity and pricing configuration.",
        tags: ["18. Inpatient Department (IPD) & Wards"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["name", "code", "daily_charge"],
            properties: [
                new OA\Property(property: "name", type: "string", example: "Intensive Care Unit (ICU)"),
                new OA\Property(property: "code", type: "string", example: "ICU"),
                new OA\Property(property: "floor", type: "string", example: "2nd Floor"),
                new OA\Property(property: "daily_charge", type: "number", example: 2500)
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Ward created successfully")]
    #[OA\Response(response: 422, description: "Validation error")]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:100',
            'code'                => 'nullable|string|max:50',
            'floor'               => 'nullable|string|max:50',
            'gender_type'         => 'nullable|string|in:all,male,female',
            'daily_charge'        => 'required|numeric|min:0',
            'is_active'           => 'nullable|boolean',
            'initial_beds_count'  => 'nullable|integer|min:0|max:100',
            'bed_prefix'          => 'nullable|string|max:20',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $ward = $this->wardService->createWard($hospitalId, $validated);

        return $this->createdResponse($ward, 'Ward created successfully');
    }

    /**
     * Show single ward with its beds and current occupants
     */
    public function show(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $ward = $this->wardService->getWardById($hospitalId, (int)$id);
        return $this->successResponse($ward, 'Ward details retrieved');
    }

    /**
     * Update Ward details, room pricing and optional sync to existing beds
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name'              => 'sometimes|required|string|max:100',
            'code'              => 'nullable|string|max:50',
            'floor'             => 'nullable|string|max:50',
            'gender_type'       => 'nullable|string|in:all,male,female',
            'daily_charge'      => 'sometimes|required|numeric|min:0',
            'is_active'         => 'nullable|boolean',
            'sync_bed_charges'  => 'nullable|boolean',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $ward = $this->wardService->updateWard($hospitalId, (int)$id, $validated);

        return $this->successResponse($ward, 'Ward updated successfully');
    }

    /**
     * Delete Ward if no active occupied beds exist
     */
    public function destroy(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $this->wardService->deleteWard($hospitalId, (int)$id);

        return $this->successResponse(null, 'Ward and all associated beds deleted successfully');
    }
}
