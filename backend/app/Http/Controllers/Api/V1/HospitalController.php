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
    public function index()
    {
        $hospitals = Hospital::paginate(15);
        return $this->paginatedResponse($hospitals, 'List of Hospitals');
    }
}
