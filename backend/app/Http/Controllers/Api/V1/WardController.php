<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Models\Ward;
use App\Models\Bed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WardController extends Controller
{
    use HasApiResponse;

    /**
     * Get all wards for the hospital with bed statistics and room pricing
     */
    public function index(Request $request)
    {
        $query = Ward::with(['beds' => function ($q) {
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

        $wards = $query->orderBy('name')->get();

        return $this->successResponse($wards, 'Wards retrieved successfully');
    }

    /**
     * Create a new Ward with Room pricing and optional initial beds
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:100',
            'code'                => 'nullable|string|max:50',
            'floor'               => 'nullable|string|max:50',
            'gender_type'         => 'nullable|string|in:all,male,female',
            'daily_charge'        => 'required|numeric|min:0',
            'is_active'           => 'nullable|boolean',
            'initial_beds_count'  => 'nullable|integer|min:0|max:100',
            'bed_prefix'          => 'nullable|string|max:20',
        ]);

        return DB::transaction(function () use ($validated) {
            $ward = Ward::create([
                'name'         => $validated['name'],
                'code'         => $validated['code'] ?? null,
                'floor'        => $validated['floor'] ?? null,
                'gender_type'  => $validated['gender_type'] ?? 'all',
                'daily_charge' => $validated['daily_charge'],
                'is_active'    => $validated['is_active'] ?? true,
            ]);

            // Auto generate initial beds if requested
            $initialCount = (int) ($validated['initial_beds_count'] ?? 0);
            if ($initialCount > 0) {
                $prefix = trim($validated['bed_prefix'] ?? ($ward->code ? $ward->code . '-' : 'Bed-'));
                for ($i = 1; $i <= $initialCount; $i++) {
                    $bedNum = $prefix . str_pad((string)$i, 2, '0', STR_PAD_LEFT);
                    Bed::create([
                        'ward_id'      => $ward->id,
                        'bed_number'   => $bedNum,
                        'status'       => 'available',
                        'daily_charge' => $ward->daily_charge,
                        'is_active'    => true,
                    ]);
                }
            }

            return $this->createdResponse(
                $ward->load('beds')->loadCount([
                    'beds as total_beds',
                    'beds as available_beds',
                    'beds as occupied_beds',
                    'beds as maintenance_beds',
                ]),
                'Ward created successfully'
            );
        });
    }

    /**
     * Show single ward with its beds and current occupants
     */
    public function show($id)
    {
        $ward = Ward::with(['beds' => function ($q) {
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

        return $this->successResponse($ward, 'Ward details retrieved');
    }

    /**
     * Update Ward details, room pricing and optional sync to existing beds
     */
    public function update(Request $request, $id)
    {
        $ward = Ward::findOrFail($id);

        $validated = $request->validate([
            'name'              => 'sometimes|required|string|max:100',
            'code'              => 'nullable|string|max:50',
            'floor'             => 'nullable|string|max:50',
            'gender_type'       => 'nullable|string|in:all,male,female',
            'daily_charge'      => 'sometimes|required|numeric|min:0',
            'is_active'         => 'nullable|boolean',
            'sync_bed_charges'  => 'nullable|boolean',
        ]);

        $oldCharge = $ward->daily_charge;
        $ward->update($validated);

        // If requested to sync bed charges to the new daily charge
        if (!empty($validated['sync_bed_charges']) && isset($validated['daily_charge'])) {
            Bed::where('ward_id', $ward->id)
                ->where(function ($q) use ($oldCharge) {
                    $q->whereNull('daily_charge')
                      ->orWhere('daily_charge', $oldCharge);
                })
                ->update(['daily_charge' => $validated['daily_charge']]);
        }

        return $this->successResponse(
            $ward->fresh(['beds'])->loadCount([
                'beds as total_beds',
                'beds as available_beds',
                'beds as occupied_beds',
                'beds as maintenance_beds',
            ]),
            'Ward updated successfully'
        );
    }

    /**
     * Delete Ward if no active occupied beds exist
     */
    public function destroy($id)
    {
        $ward = Ward::with('beds')->findOrFail($id);

        // Safety: check if any bed is occupied
        $hasOccupied = $ward->beds()->where('status', 'occupied')->exists();
        if ($hasOccupied) {
            return $this->errorResponse('Cannot delete ward: active admitted patients exist in its beds. Discharge or transfer patients first.', null, 422);
        }

        $ward->beds()->delete();
        $ward->delete();

        return $this->successResponse(null, 'Ward and all associated beds deleted successfully');
    }
}
