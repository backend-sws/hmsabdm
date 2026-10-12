<?php

namespace App\Services\Ward;

use App\Models\Ward;
use Illuminate\Http\Request;

interface WardServiceInterface
{
    /**
     * Get wards list with bed statistics and filters.
     */
    public function getWards(int $hospitalId, Request $request);

    /**
     * Get single ward with beds and current occupants.
     */
    public function getWardById(int $hospitalId, int $id): Ward;

    /**
     * Create a new clinical ward with optional initial bed generation.
     */
    public function createWard(int $hospitalId, array $data): Ward;

    /**
     * Update an existing ward and optionally sync daily charges to beds.
     */
    public function updateWard(int $hospitalId, int $id, array $data): Ward;

    /**
     * Delete a ward if no active occupied beds exist.
     */
    public function deleteWard(int $hospitalId, int $id): void;
}
