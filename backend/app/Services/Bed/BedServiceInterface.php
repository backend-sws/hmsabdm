<?php

namespace App\Services\Bed;

use App\Models\Bed;
use Illuminate\Http\Request;

interface BedServiceInterface
{
    /**
     * Get beds list filtered by ward, status, or search.
     */
    public function getBeds(int $hospitalId, Request $request);

    /**
     * Add an individual bed to a ward.
     */
    public function createBed(int $hospitalId, array $data): Bed;

    /**
     * Batch create beds for a ward.
     */
    public function batchCreateBeds(int $hospitalId, array $data): array;

    /**
     * Update an individual bed details/status.
     */
    public function updateBed(int $hospitalId, int $id, array $data): Bed;

    /**
     * Delete a bed if not occupied.
     */
    public function deleteBed(int $hospitalId, int $id): void;
}
