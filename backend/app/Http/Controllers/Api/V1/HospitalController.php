<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\Hospital\HospitalServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "8. Super Admin (Platform)",
    description: "Super Admin Platform Management — Hospital Onboarding, Activation & Global Controls"
)]
class HospitalController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected HospitalServiceInterface $hospitalService
    ) {}

    #[OA\Post(
        path: "/api/v1/hospitals",
        summary: "Register a new Hospital & create default Admin",
        description: "Super Admin API to onboard a new hospital into the system and set up its initial Admin account.",
        security: [["bearerAuth" => []]],
        tags: ["8. Super Admin (Platform)"]
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
                new OA\Property(property: "abdm_hip_id", type: "string", example: "HIP-9999"),
                new OA\Property(property: "admin_name", type: "string", example: "Dr. Admin"),
                new OA\Property(property: "admin_email", type: "string", format: "email", example: "admin@citycare.com"),
                new OA\Property(property: "admin_password", type: "string", format: "password", example: "AdminPass123!")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Hospital registered and Admin account created successfully")]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'code'           => 'nullable|string|max:50',
            'email'          => 'nullable|email|max:255',
            'phone'          => 'nullable|string|max:20',
            'address'        => 'nullable|string',
            'city'           => 'nullable|string|max:100',
            'state'          => 'nullable|string|max:100',
            'pincode'        => 'nullable|string|max:20',
            'abdm_hip_id'    => 'nullable|string|unique:hospitals,abdm_hip_id',
            'admin_name'     => 'nullable|string|max:255',
            'admin_email'    => 'nullable|email|max:255|unique:users,email',
            'admin_password' => 'nullable|string|min:6',
        ]);

        $responseData = $this->hospitalService->registerHospital($validated);

        return $this->createdResponse($responseData, 'Hospital registered and Admin account created successfully');
    }

    #[OA\Get(
        path: "/api/v1/hospitals",
        summary: "List all registered Hospitals",
        description: "Super Admin API to retrieve a paginated list of all hospitals currently onboarded to the system.",
        security: [["bearerAuth" => []]],
        tags: ["8. Super Admin (Platform)"]
    )]
    #[OA\Response(response: 200, description: "List of Hospitals")]
    public function index(Request $request)
    {
        $hospitals = $this->hospitalService->getHospitals($request);
        return $this->paginatedResponse($hospitals, 'Hospitals retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/hospitals/{id}",
        summary: "Get single Hospital details",
        security: [["bearerAuth" => []]],
        tags: ["8. Super Admin (Platform)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Hospital details")]
    public function show($id)
    {
        $hospital = $this->hospitalService->getHospitalById((int)$id);
        return $this->successResponse($hospital, 'Hospital details retrieved successfully');
    }

    #[OA\Put(
        path: "/api/v1/hospitals/{id}",
        summary: "Update Hospital details",
        security: [["bearerAuth" => []]],
        tags: ["8. Super Admin (Platform)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Hospital updated successfully")]
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'code'        => 'nullable|string|max:50',
            'email'       => 'nullable|email|max:255',
            'phone'       => 'nullable|string|max:20',
            'address'     => 'nullable|string',
            'city'        => 'nullable|string|max:100',
            'state'       => 'nullable|string|max:100',
            'pincode'     => 'nullable|string|max:20',
            'abdm_hip_id' => 'nullable|string|unique:hospitals,abdm_hip_id,' . $id,
            'is_active'   => 'nullable|boolean',
        ]);

        $hospital = $this->hospitalService->updateHospital((int)$id, $validated);

        return $this->successResponse($hospital, 'Hospital updated successfully');
    }

    #[OA\Delete(
        path: "/api/v1/hospitals/{id}",
        summary: "Delete / Deactivate Hospital",
        security: [["bearerAuth" => []]],
        tags: ["8. Super Admin (Platform)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Hospital deleted successfully")]
    public function destroy($id)
    {
        $this->hospitalService->deleteHospital((int)$id);
        return $this->successResponse(null, 'Hospital deleted successfully');
    }
}
