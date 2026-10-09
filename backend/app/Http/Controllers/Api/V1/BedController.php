<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Models\Bed;
use App\Models\Ward;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BedController extends Controller
{
    use HasApiResponse;

    /**
     * List hospital beds with optional ward and status filter
     */
    public function index(Request $request)
    {
        $query = Bed::with(['ward', 'currentAdmission.patient']);

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

        $beds = $query->orderBy('bed_number')->get();

        return $this->successResponse($beds, 'Beds retrieved successfully');
    }

    /**
     * Add a single bed to a ward with pricing
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'ward_id'      => 'required|integer|exists:wards,id',
            'bed_number'   => 'required|string|max:50',
            'daily_charge' => 'nullable|numeric|min:0',
            'status'       => 'nullable|string|in:available,maintenance',
            'is_active'    => 'nullable|boolean',
        ]);

        $ward = Ward::findOrFail($validated['ward_id']);

        // Check unique bed_number in ward
        $exists = Bed::where('ward_id', $ward->id)
            ->where('bed_number', $validated['bed_number'])
            ->exists();
        if ($exists) {
            return $this->errorResponse("Bed number '{$validated['bed_number']}' already exists in this ward.", null, 422);
        }

        $bed = Bed::create([
            'ward_id'      => $ward->id,
            'bed_number'   => $validated['bed_number'],
            'daily_charge' => isset($validated['daily_charge']) && $validated['daily_charge'] !== ''
                ? (float)$validated['daily_charge']
                : $ward->daily_charge,
            'status'       => $validated['status'] ?? 'available',
            'is_active'    => $validated['is_active'] ?? true,
        ]);

        return $this->createdResponse($bed->load('ward'), 'Bed added successfully');
    }

    /**
     * Batch create beds for a ward (e.g. ICU-01 to ICU-10)
     */
    public function batchStore(Request $request)
    {
        $validated = $request->validate([
            'ward_id'      => 'required|integer|exists:wards,id',
            'prefix'       => 'nullable|string|max:20',
            'start_number' => 'required|integer|min:1',
            'end_number'   => 'required|integer|min:1|gte:start_number',
            'daily_charge' => 'nullable|numeric|min:0',
        ]);

        $ward = Ward::findOrFail($validated['ward_id']);
        $prefix = trim($validated['prefix'] ?? '');
        $start = (int) $validated['start_number'];
        $end = (int) $validated['end_number'];
        $rate = isset($validated['daily_charge']) && $validated['daily_charge'] !== ''
            ? (float)$validated['daily_charge']
            : $ward->daily_charge;

        if (($end - $start + 1) > 100) {
            return $this->errorResponse('Cannot generate more than 100 beds in a single batch.', null, 422);
        }

        $created = [];
        DB::transaction(function () use ($ward, $prefix, $start, $end, $rate, &$created) {
            for ($i = $start; $i <= $end; $i++) {
                $bedNum = $prefix . str_pad((string)$i, 2, '0', STR_PAD_LEFT);
                $already = Bed::where('ward_id', $ward->id)->where('bed_number', $bedNum)->exists();
                if (!$already) {
                    $created[] = Bed::create([
                        'ward_id'      => $ward->id,
                        'bed_number'   => $bedNum,
                        'daily_charge' => $rate,
                        'status'       => 'available',
                        'is_active'    => true,
                    ]);
                }
            }
        });

        return $this->createdResponse($created, count($created) . ' beds generated successfully in ' . $ward->name);
    }

    /**
     * Update bed number, pricing override, status, or active flag
     */
    public function update(Request $request, $id)
    {
        $bed = Bed::findOrFail($id);

        $validated = $request->validate([
            'bed_number'   => 'sometimes|required|string|max:50',
            'daily_charge' => 'nullable|numeric|min:0',
            'status'       => 'nullable|string|in:available,occupied,maintenance',
            'is_active'    => 'nullable|boolean',
        ]);

        // Guard: cannot change status of occupied bed directly
        if (isset($validated['status']) && $validated['status'] !== 'occupied' && $bed->status === 'occupied') {
            return $this->errorResponse('Cannot change status of currently occupied bed. Discharge or transfer patient first.', null, 422);
        }

        // Check unique bed number in same ward if changing
        if (!empty($validated['bed_number']) && $validated['bed_number'] !== $bed->bed_number) {
            $exists = Bed::where('ward_id', $bed->ward_id)
                ->where('bed_number', $validated['bed_number'])
                ->where('id', '!=', $bed->id)
                ->exists();
            if ($exists) {
                return $this->errorResponse("Bed number '{$validated['bed_number']}' already exists in this ward.", null, 422);
            }
        }

        $bed->update($validated);

        return $this->successResponse($bed->fresh(['ward']), 'Bed updated successfully');
    }

    /**
     * Delete bed if not occupied
     */
    public function destroy($id)
    {
        $bed = Bed::findOrFail($id);

        if ($bed->status === 'occupied') {
            return $this->errorResponse('Cannot delete bed with active admitted patient. Discharge or transfer patient first.', null, 422);
        }

        $bed->delete();

        return $this->successResponse(null, 'Bed deleted successfully');
    }
}
