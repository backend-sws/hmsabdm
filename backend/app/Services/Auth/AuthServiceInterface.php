<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Validation\ValidationException;

interface AuthServiceInterface
{
    /**
     * Authenticate a user and return the user with their token.
     *
     * @param array $credentials
     * @return array
     * @throws ValidationException
     */
    public function login(array $credentials): array;

    /**
     * Logout the given user.
     *
     * @param User $user
     * @return void
     */
    public function logout(User $user): void;

    /**
     * Get the authenticated user details.
     *
     * @param User $user
     * @return User
     */
    public function getProfile(User $user): User;
}
