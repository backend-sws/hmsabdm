<?php

namespace App\Http\Controllers;

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
        security: [["bearerAuth" => []]],
        tags: ["6. Hospitals & Admin"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "name", type: "string", example: "City Care Hospital"),
                new OA\Property(property: "address", type: "string", example: "123 Main St"),
                new OA\Property(property: "abdm_hip_id", type: "string", example: "HIP-9999")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Hospital created successfully")]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'abdm_hip_id' => 'nullable|string|unique:hospitals,abdm_hip_id',
        ]);

        $hospital = Hospital::create($validated);

        return $this->successResponse($hospital, 'Hospital registered successfully', 201);
    }

    #[OA\Get(
        path: "/api/v1/hospitals",
        summary: "List all registered Hospitals",
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
