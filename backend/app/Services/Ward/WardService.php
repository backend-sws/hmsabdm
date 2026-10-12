<?php

namespace App\Services\Ward;

use App\Models\Ward;
use App\Models\Bed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class WardService implements WardServiceInterface
{
    /**
     * Get wards list with bed statistics and filters.
     */
    public function getWards(int $hospitalId, Request $request)
    {
        $query = Ward::where('hospital_id', $hospitalId)
            ->with(['beds' => function ($q) {
                $q->orderBy('bed_number');
            }])
            ->withCount([
                'beds as total_beds',
                'beds as available_beds' => function ($q) {
                    $q->where('status', 'available')->where('is_active', true);
                },
                'beds as occupied_beds' => function ($q) {
                    $q->where('status', 'occupied');
                },
                'beds as maintenance_beds' => function ($q) {
                    $q->where('status', 'maintenance');
                },
            ]);

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('code', 'ilike', "%{$search}%")
                  ->orWhere('floor', 'ilike', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        return $query->orderBy('name')->get();
    }

    /**
     * Get single ward with beds and current occupants.
     */
    public function getWardById(int $hospitalId, int $id): Ward
    {
        return Ward::where('hospital_id', $hospitalId)
            ->with(['beds' => function ($q) {
                $q->with('currentAdmission.patient');
            }])
            ->withCount([
                'beds as total_beds',
                'beds as available_beds' => function ($q) {
                    $q->where('status', 'available')->where('is_active', true);
                },
                'beds as occupied_beds' => function ($q) {
                    $q->where('status', 'occupied');
                },
                'beds as maintenance_beds' => function ($q) {
                    $q->where('status', 'maintenance');
                },
            ])
            ->findOrFail($id);
    }

    /**
     * Create a new clinical ward with optional initial bed generation.
     */
    public function createWard(int $hospitalId, array $data): Ward
    {
        return DB::transaction(function () use ($hospitalId, $data) {
            $ward = Ward::create([
                'hospital_id'  => $hospitalId,
                'name'         => $data['name'],
                'code'         => $data['code'] ?? null,
                'floor'        => $data['floor'] ?? null,
                'gender_type'  => $data['gender_type'] ?? 'all',
                'daily_charge' => $data['daily_charge'],
                'is_active'    => $data['is_active'] ?? true,
            ]);

            // Auto generate initial beds if requested
            $initialCount = (int) ($data['initial_beds_count'] ?? 0);
            if ($initialCount > 0) {
                $prefix = trim($data['bed_prefix'] ?? ($ward->code ? $ward->code . '-' : 'Bed-'));
                for ($i = 1; $i <= $initialCount; $i++) {
                    $bedNum = $prefix . str_pad((string)$i, 2, '0', STR_PAD_LEFT);
                    Bed::create([
                        'hospital_id'  => $hospitalId,
                        'ward_id'      => $ward->id,
                        'bed_number'   => $bedNum,
                        'status'       => 'available',
                        'daily_charge' => $ward->daily_charge,
                        'is_active'    => true,
                    ]);
                }
            }

            return $ward->load('beds')->loadCount([
                'beds as total_beds',
                'beds as available_beds',
                'beds as occupied_beds',
                'beds as maintenance_beds',
            ]);
        });
    }

    /**
     * Update an existing ward and optionally sync daily charges to beds.
     */
    public function updateWard(int $hospitalId, int $id, array $data): Ward
    {
        $ward = Ward::where('hospital_id', $hospitalId)->findOrFail($id);

        $oldCharge = $ward->daily_charge;
        $ward->update($data);

        // If requested to sync bed charges to the new daily charge
        if (!empty($data['sync_bed_charges']) && isset($data['daily_charge'])) {
            Bed::where('ward_id', $ward->id)
                ->where(function ($q) use ($oldCharge) {
                    $q->whereNull('daily_charge')
                      ->orWhere('daily_charge', $oldCharge);
                })
                ->update(['daily_charge' => $data['daily_charge']]);
        }

        return $ward->fresh(['beds'])->loadCount([
            'beds as total_beds',
            'beds as available_beds',
            'beds as occupied_beds',
            'beds as maintenance_beds',
        ]);
    }

    /**
     * Delete a ward if no active occupied beds exist.
     */
    public function deleteWard(int $hospitalId, int $id): void
    {
        $ward = Ward::where('hospital_id', $hospitalId)->with('beds')->findOrFail($id);

        $hasOccupied = $ward->beds()->where('status', 'occupied')->exists();
        if ($hasOccupied) {
            throw new HttpException(
                422,
                'Cannot delete ward: active admitted patients exist in its beds. Discharge or transfer patients first.'
            );
        }

        DB::transaction(function () use ($ward) {
            $ward->beds()->delete();
            $ward->delete();
        });
    }
}
