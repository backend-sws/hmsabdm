<?php

namespace App\Services\Bed;

use App\Models\Bed;
use App\Models\Ward;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class BedService implements BedServiceInterface
{
    /**
     * Get beds list filtered by ward, status, or search.
     */
    public function getBeds(int $hospitalId, Request $request)
    {
        $query = Bed::where('hospital_id', $hospitalId)
            ->with(['ward', 'currentAdmission.patient']);

        if ($request->filled('ward_id')) {
            $query->where('ward_id', $request->ward_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where('bed_number', 'ilike', "%{$search}%");
        }

        return $query->orderBy('bed_number')->get();
    }

    /**
     * Add an individual bed to a ward.
     */
    public function createBed(int $hospitalId, array $data): Bed
    {
        $ward = Ward::where('hospital_id', $hospitalId)->findOrFail($data['ward_id']);

        // Check unique bed_number in ward
        $exists = Bed::where('hospital_id', $hospitalId)
            ->where('ward_id', $ward->id)
            ->where('bed_number', $data['bed_number'])
            ->exists();

        if ($exists) {
            throw new HttpException(422, "Bed number '{$data['bed_number']}' already exists in this ward.");
        }

        return Bed::create([
            'hospital_id'  => $hospitalId,
            'ward_id'      => $ward->id,
            'bed_number'   => $data['bed_number'],
            'daily_charge' => isset($data['daily_charge']) && $data['daily_charge'] !== ''
                ? (float)$data['daily_charge']
                : $ward->daily_charge,
            'status'       => $data['status'] ?? 'available',
            'is_active'    => $data['is_active'] ?? true,
        ])->load('ward');
    }

    /**
     * Batch create beds for a ward.
     */
    public function batchCreateBeds(int $hospitalId, array $data): array
    {
        $ward = Ward::where('hospital_id', $hospitalId)->findOrFail($data['ward_id']);
        $prefix = trim($data['prefix'] ?? '');
        $start = (int) $data['start_number'];
        $end = (int) $data['end_number'];
        $rate = isset($data['daily_charge']) && $data['daily_charge'] !== ''
            ? (float)$data['daily_charge']
            : $ward->daily_charge;

        if (($end - $start + 1) > 100) {
            throw new HttpException(422, 'Cannot generate more than 100 beds in a single batch.');
        }

        $created = [];
        DB::transaction(function () use ($hospitalId, $ward, $prefix, $start, $end, $rate, &$created) {
            for ($i = $start; $i <= $end; $i++) {
                $bedNum = $prefix . str_pad((string)$i, 2, '0', STR_PAD_LEFT);
                $already = Bed::where('hospital_id', $hospitalId)
                    ->where('ward_id', $ward->id)
                    ->where('bed_number', $bedNum)
                    ->exists();

                if (!$already) {
                    $created[] = Bed::create([
                        'hospital_id'  => $hospitalId,
                        'ward_id'      => $ward->id,
                        'bed_number'   => $bedNum,
                        'daily_charge' => $rate,
                        'status'       => 'available',
                        'is_active'    => true,
                    ]);
                }
            }
        });

        return $created;
    }

    /**
     * Update an individual bed details/status.
     */
    public function updateBed(int $hospitalId, int $id, array $data): Bed
    {
        $bed = Bed::where('hospital_id', $hospitalId)->findOrFail($id);

        // Guard: cannot change status of occupied bed directly
        if (isset($data['status']) && $data['status'] !== 'occupied' && $bed->status === 'occupied') {
            throw new HttpException(422, 'Cannot change status of currently occupied bed. Discharge or transfer patient first.');
        }

        // Check unique bed number in same ward if changing
        if (!empty($data['bed_number']) && $data['bed_number'] !== $bed->bed_number) {
            $exists = Bed::where('hospital_id', $hospitalId)
                ->where('ward_id', $bed->ward_id)
                ->where('bed_number', $data['bed_number'])
                ->where('id', '!=', $bed->id)
                ->exists();

            if ($exists) {
                throw new HttpException(422, "Bed number '{$data['bed_number']}' already exists in this ward.");
            }
        }

        $bed->update($data);

        return $bed->fresh(['ward']);
    }

    /**
     * Delete a bed if not occupied.
     */
    public function deleteBed(int $hospitalId, int $id): void
    {
        $bed = Bed::where('hospital_id', $hospitalId)->findOrFail($id);

        if ($bed->status === 'occupied') {
            throw new HttpException(422, 'Cannot delete bed with active admitted patient. Discharge or transfer patient first.');
        }

        $bed->delete();
    }
}
