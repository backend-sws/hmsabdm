<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\Bed\BedServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class BedController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected BedServiceInterface $bedService
    ) {}

    #[OA\Get(
        path: "/api/v1/beds",
        summary: "List hospital beds with optional ward and status filter",
        description: "Retrieves hospital beds filtered by ward ID, occupancy status, or bed number.",
        tags: ["18. Inpatient Department (IPD) & Wards"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "ward_id", in: "query", description: "Filter by ward ID", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "status", in: "query", description: "Filter by status (available, occupied, maintenance)", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "search", in: "query", description: "Search by bed number", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Response(response: 200, description: "Beds retrieved successfully")]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $beds = $this->bedService->getBeds($hospitalId, $request);
        return $this->successResponse($beds, 'Beds retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/beds",
        summary: "Add a single bed to a ward with pricing",
        description: "Creates an individual bed within a designated ward with custom or inherited daily rate.",
        tags: ["18. Inpatient Department (IPD) & Wards"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["ward_id", "bed_number"],
            properties: [
                new OA\Property(property: "ward_id", type: "integer", example: 1),
                new OA\Property(property: "bed_number", type: "string", example: "ICU-01"),
                new OA\Property(property: "daily_charge", type: "number", example: 2500)
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Bed added successfully")]
    #[OA\Response(response: 422, description: "Validation error")]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'ward_id'      => 'required|integer|exists:wards,id',
            'bed_number'   => 'required|string|max:50',
            'daily_charge' => 'nullable|numeric|min:0',
            'status'       => 'nullable|string|in:available,maintenance',
            'is_active'    => 'nullable|boolean',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $bed = $this->bedService->createBed($hospitalId, $validated);

        return $this->createdResponse($bed, 'Bed added successfully');
    }

    /**
     * Batch create beds for a ward (e.g. ICU-01 to ICU-10)
     */
    public function batchStore(Request $request)
    {
        $validated = $request->validate([
            'ward_id'      => 'required|integer|exists:wards,id',
            'prefix'       => 'nullable|string|max:20',
            'start_number' => 'required|integer|min:1',
            'end_number'   => 'required|integer|min:1|gte:start_number',
            'daily_charge' => 'nullable|numeric|min:0',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $created = $this->bedService->batchCreateBeds($hospitalId, $validated);

        return $this->createdResponse($created, count($created) . ' beds generated successfully');
    }

    /**
     * Update bed number, pricing override, status, or active flag
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'bed_number'   => 'sometimes|required|string|max:50',
            'daily_charge' => 'nullable|numeric|min:0',
            'status'       => 'nullable|string|in:available,occupied,maintenance',
            'is_active'    => 'nullable|boolean',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $bed = $this->bedService->updateBed($hospitalId, (int)$id, $validated);

        return $this->successResponse($bed, 'Bed updated successfully');
    }

    /**
     * Delete bed if not occupied
     */
    public function destroy(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $this->bedService->deleteBed($hospitalId, (int)$id);

        return $this->successResponse(null, 'Bed deleted successfully');
    }
}
