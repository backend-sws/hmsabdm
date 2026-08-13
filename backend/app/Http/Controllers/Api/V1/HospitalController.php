<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;

use App\Http\Traits\HasApiResponse;
use App\Models\Hospital;
use Illuminate\Http\Request;

use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "6. Hospitals & Admin",
    description: "Super Admin — Hospital Management"
)]
class HospitalController extends Controller
{
    use HasApiResponse;

    #[OA\Post(
        path: "/api/v1/hospitals",
        summary: "Register a new Hospital",
        description: "Super Admin API to onboard a new hospital into the system. ABDM HIP ID is optional but recommended.",
        security: [["bearerAuth" => []]],
        tags: ["6. Hospitals & Admin"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "name", type: "string", example: "City Care Hospital"),
                new OA\Property(property: "code", type: "string", example: "CCH-01"),
                new OA\Property(property: "email", type: "string", format: "email", example: "contact@citycare.com"),
                new OA\Property(property: "phone", type: "string", example: "011-23456789"),
                new OA\Property(property: "address", type: "string", example: "123 Main St, Sector 4"),
                new OA\Property(property: "city", type: "string", example: "New Delhi"),
                new OA\Property(property: "state", type: "string", example: "Delhi"),
                new OA\Property(property: "pincode", type: "string", example: "110001"),
                new OA\Property(property: "abdm_hip_id", type: "string", example: "HIP-9999")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Hospital created successfully")]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'abdm_hip_id' => 'nullable|string|unique:hospitals,abdm_hip_id',
        ]);

        $hospital = Hospital::create($validated);

        return $this->successResponse($hospital, 'Hospital registered successfully', 201);
    }

    #[OA\Get(
        path: "/api/v1/hospitals",
        summary: "List all registered Hospitals",
        description: "Super Admin API to retrieve a paginated list of all hospitals currently onboarded to the system.",
        security: [["bearerAuth" => []]],
        tags: ["6. Hospitals & Admin"]
    )]
    #[OA\Response(response: 200, description: "List of Hospitals")]
    public function index(Request $request)
    {
        $query = Hospital::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhere('state', 'like', "%{$search}%")
                  ->orWhere('abdm_hip_id', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('limit', $request->input('per_page', 15));
        $hospitals = $query->latest()->paginate($perPage);

        return $this->paginatedResponse($hospitals, 'List of Hospitals');
    }

    #[OA\Get(
        path: "/api/v1/hospitals/{id}",
        summary: "Get specific Hospital details",
        security: [["bearerAuth" => []]],
        tags: ["6. Hospitals & Admin"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Hospital details")]
    public function show($id)
    {
        $hospital = Hospital::find($id);
        if (!$hospital) {
            return $this->notFoundResponse('Hospital not found');
        }
        return $this->successResponse($hospital, 'Hospital details');
    }

    #[OA\Put(
        path: "/api/v1/hospitals/{id}",
        summary: "Update Hospital details",
        security: [["bearerAuth" => []]],
        tags: ["6. Hospitals & Admin"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Hospital updated successfully")]
    public function update(Request $request, $id)
    {
        $hospital = Hospital::find($id);
        if (!$hospital) {
            return $this->notFoundResponse('Hospital not found');
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'abdm_hip_id' => 'nullable|string|unique:hospitals,abdm_hip_id,' . $id,
        ]);

        $hospital->update($validated);

        return $this->successResponse($hospital, 'Hospital updated successfully');
    }

    #[OA\Delete(
        path: "/api/v1/hospitals/{id}",
        summary: "Delete a Hospital",
        security: [["bearerAuth" => []]],
        tags: ["6. Hospitals & Admin"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Hospital deleted successfully")]
    public function destroy($id)
    {
        $hospital = Hospital::find($id);
        if (!$hospital) {
            return $this->notFoundResponse('Hospital not found');
        }

        $hospital->delete();

        return $this->successResponse(null, 'Hospital deleted successfully');
    }
}
