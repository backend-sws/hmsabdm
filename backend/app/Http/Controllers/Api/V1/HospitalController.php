<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Models\Hospital;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "8. Super Admin (Platform)",
    description: "Super Admin Platform Management — Hospital Onboarding, Activation & Global Controls"
)]
class HospitalController extends Controller
{
    use HasApiResponse;

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
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'abdm_hip_id' => 'nullable|string|unique:hospitals,abdm_hip_id',
            'admin_name' => 'nullable|string|max:255',
            'admin_email' => 'nullable|email|max:255|unique:users,email',
            'admin_password' => 'nullable|string|min:6',
        ]);

        $hospital = DB::transaction(function () use ($request, $validated) {
            $hospitalData = [
                'name' => $validated['name'],
                'code' => $validated['code'] ?? Str::upper(Str::slug($validated['name'])),
                'address' => $validated['address'] ?? null,
                'city' => $validated['city'] ?? null,
                'state' => $validated['state'] ?? null,
                'pincode' => $validated['pincode'] ?? null,
                'abdm_hip_id' => $validated['abdm_hip_id'] ?? null,
            ];

            $hospital = Hospital::create($hospitalData);

            if (!empty($validated['admin_email'])) {
                $username = strtolower(explode('@', $validated['admin_email'])[0]);
                if (User::where('username', $username)->exists()) {
                    $username .= '_' . Str::lower(Str::random(4));
                }

                $adminUser = User::create([
                    'hospital_id' => $hospital->id,
                    'name' => $validated['admin_name'] ?? ($hospital->name . ' Admin'),
                    'username' => $username,
                    'email' => $validated['admin_email'],
                    'password' => Hash::make($validated['admin_password'] ?? 'Admin@1234'),
                ]);

                // Create Hospital Admin Role for this specific hospital team
                setPermissionsTeamId($hospital->id);
                $adminRole = Role::firstOrCreate([
                    'name' => 'Hospital Admin',
                    'guard_name' => 'sanctum',
                    'hospital_id' => $hospital->id
                ]);

                $adminUser->assignRole($adminRole);
            }

            return $hospital;
        });

        $responseData = $hospital->toArray();
        if (!empty($validated['admin_email'])) {
            $responseData['admin_credentials'] = [
                'name'     => $validated['admin_name'] ?? ($hospital->name . ' Admin'),
                'email'    => $validated['admin_email'],
                'password' => $validated['admin_password'] ?? 'Admin@1234',
            ];
        }

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
        $perPage = $request->input('per_page', 15);
        $search = $request->input('search');

        $query = Hospital::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('abdm_hip_id', 'like', "%{$search}%");
            });
        }

        $hospitals = $query->paginate($perPage);

        return $this->paginatedResponse($hospitals, 'Hospitals retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/hospitals/{id}",
        summary: "Get specific Hospital details",
        security: [["bearerAuth" => []]],
        tags: ["8. Super Admin (Platform)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Hospital details")]
    public function show($id)
    {
        $hospital = Hospital::find($id);
        if (!$hospital) {
            return $this->notFoundResponse('Hospital not found');
        }

        return $this->successResponse($hospital, 'Hospital retrieved successfully');
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
        $hospital = Hospital::find($id);
        if (!$hospital) {
            return $this->notFoundResponse('Hospital not found');
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|nullable|string|max:50',
            'address' => 'sometimes|nullable|string',
            'city' => 'sometimes|nullable|string|max:100',
            'state' => 'sometimes|nullable|string|max:100',
            'pincode' => 'sometimes|nullable|string|max:20',
            'abdm_hip_id' => 'sometimes|nullable|string|unique:hospitals,abdm_hip_id,' . $id,
        ]);

        $hospital->update($validated);

        return $this->successResponse($hospital, 'Hospital updated successfully');
    }

    #[OA\Delete(
        path: "/api/v1/hospitals/{id}",
        summary: "Delete a Hospital",
        security: [["bearerAuth" => []]],
        tags: ["8. Super Admin (Platform)"]
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
