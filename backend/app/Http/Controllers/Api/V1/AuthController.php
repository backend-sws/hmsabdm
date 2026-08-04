<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;

use Illuminate\Http\Request;
use App\Services\Auth\AuthServiceInterface;
use App\Http\Traits\HasApiResponse;
use App\Http\Resources\UserResource;
use OpenApi\Attributes as OA;

class AuthController extends Controller
{
    use HasApiResponse;

    protected AuthServiceInterface $authService;

    public function __construct(AuthServiceInterface $authService)
    {
        $this->authService = $authService;
    }

    #[OA\Post(
        path: "/api/v1/login",
        summary: "Authenticate user and return token",
        tags: ["Authentication"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["email", "password"],
            properties: [
                new OA\Property(property: "email", type: "string", format: "email", example: "superadmin@hms.com"),
                new OA\Property(property: "password", type: "string", format: "password", example: "password")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Successful login")]
    #[OA\Response(response: 422, description: "Validation Error")]
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        $data = $this->authService->login($credentials);
        
        if (isset($data['user']->hospital_id)) {
            setPermissionsTeamId($data['user']->hospital_id);
            $data['user']->unsetRelation('roles');
        }

        $data['user'] = new UserResource($data['user']);

        return $this->successResponse($data, 'Login successful');
    }

    #[OA\Post(
        path: "/api/v1/logout",
        summary: "Logout the authenticated user",
        tags: ["Authentication"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Successful logout")]
    public function logout(Request $request)
    {
        $this->authService->logout($request->user());
        return $this->successResponse(null, 'Logged out successfully');
    }

    #[OA\Get(
        path: "/api/v1/user",
        summary: "Get the authenticated user's profile",
        tags: ["Authentication"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "User profile retrieved successfully")]
    public function me(Request $request)
    {
        $user = $this->authService->getProfile($request->user());
        
        if (isset($user->hospital_id)) {
            setPermissionsTeamId($user->hospital_id);
            $user->unsetRelation('roles');
        }

        return $this->successResponse(new UserResource($user), 'User details fetched successfully');
    }
}
