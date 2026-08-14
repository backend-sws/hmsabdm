<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthService implements AuthServiceInterface
{
    /**
     * Authenticate a user and return the user with their token.
     *
     * @param array $credentials
     * @return array
     * @throws ValidationException
     */
    public function login(array $credentials): array
    {
        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'login_id' => ['Invalid credentials.'],
            ]);
        }

        $user = Auth::user();
        $token = $user->createToken('auth_token')->plainTextToken;
        
        $user->load('roles');

        return [
            'user' => $user,
            'token' => $token
        ];
    }

    /**
     * Logout the given user.
     *
     * @param User $user
     * @return void
     */
    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }

    /**
     * Get the authenticated user details.
     *
     * @param User $user
     * @return User
     */
    public function getProfile(User $user): User
    {
        return $user->load('roles', 'permissions');
    }
}
