<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Models\LabExternalVendor;
use App\Models\LabOutsourceManifest;
use App\Models\LabOrderItem;
use App\Models\LabOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class LabOutsourceController extends Controller
{
    use HasApiResponse;

    #[OA\Get(
        path: "/api/v1/lab/outsource/vendors",
        summary: "List all partner reference labs",
        description: "Retrieves all external reference laboratories with sample counts",
        tags: ["16. Lab — Outsource Management"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Vendors retrieved successfully")]
    public function vendors(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        $vendors = LabExternalVendor::where(function ($q) use ($hospitalId) {
            $q->whereNull('hospital_id')->orWhere('hospital_id', $hospitalId);
        })
        ->withCount([
            'orderItems as total_samples_sent',
            'orderItems as pending_results' => function ($q) {
                $q->where('outsource_status', 'dispatched');
            },
        ])
        ->orderBy('name')
        ->get();

        return $this->successResponse($vendors, 'Vendors retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/lab/outsource/vendors",
        summary: "Create or update reference lab partner",
        description: "Registers a partner diagnostic lab (e.g. Dr Lal PathLabs, Thyrocare)",
        tags: ["16. Lab — Outsource Management"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Vendor saved successfully")]
    public function storeVendor(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        $validated = $request->validate([
            'id'              => 'nullable|integer',
            'vendor_code'     => 'required|string|max:50',
            'name'            => 'required|string|max:255',
            'contact_person'  => 'nullable|string|max:150',
            'phone'           => 'nullable|string|max:50',
            'email'           => 'nullable|email|max:150',
            'address'         => 'nullable|string',
            'pickup_schedule' => 'nullable|string|max:255',
            'default_courier' => 'nullable|string|max:150',
            'account_number'  => 'nullable|string|max:100',
            'is_active'       => 'nullable|boolean',
        ]);

        $vendor = LabExternalVendor::updateOrCreate(
            ['id' => $validated['id'] ?? null],
            array_merge($validated, ['hospital_id' => $hospitalId])
        );

        return $this->successResponse($vendor, 'Vendor saved successfully');
    }

    #[OA\Get(
        path: "/api/v1/lab/outsource/pending-dispatch",
        summary: "List collected samples awaiting outsource dispatch",
        description: "Returns samples from collected orders marked for outsource fulfillment awaiting batch dispatch",
        tags: ["16. Lab — Outsource Management"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Pending dispatch samples retrieved")]
    public function pendingDispatch(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        $query = LabOrderItem::with([
            'order:id,order_number,sample_accession_number,patient_id,urgency,sample_collected_at,created_at',
            'order.patient:id,uhid,first_name,last_name,gender,dob,phone',
            'testTemplate:id,test_code,test_name,category,sample_type,container_color,tat_hours,b2b_cost,standard_price,default_vendor_id',
            'testTemplate.defaultVendor:id,vendor_code,name',
        ])
        ->whereHas('order', function ($q) use ($hospitalId) {
            $q->where('hospital_id', $hospitalId)
              ->whereNotIn('status', ['pending_sample', 'cancelled']);
        })
        ->where(function ($q) {
            $q->where('fulfillment_type', 'outsourced')
              ->orWhereHas('testTemplate', function ($t) {
                  $t->where('fulfillment_type', 'outsourced');
              });
        })
        ->where(function ($q) {
            $q->whereNull('outsource_status')
              ->orWhere('outsource_status', 'pending_dispatch');
        });

        $items = $query->orderBy('created_at', 'desc')->get();

        return $this->successResponse($items, 'Pending dispatch samples retrieved');
    }

    #[OA\Post(
        path: "/api/v1/lab/outsource/manifests",
        summary: "Create sample dispatch manifest (Sent to Lab)",
        description: "Batches selected collected samples, assigns manifest number, records courier & temperature, marks samples dispatched",
        tags: ["16. Lab — Outsource Management"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Manifest created successfully")]
    public function createManifest(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        $validated = $request->validate([
            'vendor_id'             => 'required|exists:lab_external_vendors,id',
            'item_ids'              => 'required|array|min:1',
            'item_ids.*'            => 'integer|exists:lab_order_items,id',
            'temperature_condition' => 'nullable|string|in:ambient,cold_chain,frozen,formalin',
            'courier_name'          => 'nullable|string|max:150',
            'courier_phone'         => 'nullable|string|max:50',
            'courier_tracking_no'   => 'nullable|string|max:100',
            'notes'                 => 'nullable|string',
        ]);

        $manifest = DB::transaction(function () use ($hospitalId, $validated, $request) {
            $vendor = LabExternalVendor::findOrFail($validated['vendor_id']);
            $count = LabOutsourceManifest::where('hospital_id', $hospitalId)->count() + 1;
            $manifestNumber = 'MAN-' . date('Ymd') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

            $manifest = LabOutsourceManifest::create([
                'hospital_id'           => $hospitalId,
                'vendor_id'             => $validated['vendor_id'],
                'manifest_number'       => $manifestNumber,
                'status'                => 'dispatched',
                'temperature_condition' => $validated['temperature_condition'] ?? 'cold_chain',
                'courier_name'          => $validated['courier_name'] ?? $vendor->default_courier,
                'courier_phone'         => $validated['courier_phone'] ?? $vendor->phone,
                'courier_tracking_no'   => $validated['courier_tracking_no'] ?? null,
                'total_samples'         => count($validated['item_ids']),
                'dispatched_at'         => now(),
                'dispatched_by_user_id' => $request->user()?->id,
                'notes'                 => $validated['notes'] ?? null,
            ]);

            LabOrderItem::whereIn('id', $validated['item_ids'])->update([
                'fulfillment_type'       => 'outsourced',
                'outsource_status'       => 'dispatched',
                'external_vendor_id'     => $validated['vendor_id'],
                'outsource_manifest_id'  => $manifest->id,
                'outsourced_at'          => now(),
            ]);

            return $manifest;
        });

        $manifest->load(['vendor', 'orderItems.order.patient', 'orderItems.testTemplate']);

        return $this->successResponse($manifest, 'Dispatch manifest created successfully');
    }

    #[OA\Get(
        path: "/api/v1/lab/outsource/manifests",
        summary: "List all outsource manifests",
        description: "Retrieves all dispatch manifests with vendor, sample count, and status",
        tags: ["16. Lab — Outsource Management"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Manifests retrieved")]
    public function manifests(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        $manifests = LabOutsourceManifest::where('hospital_id', $hospitalId)
            ->with([
                'vendor:id,vendor_code,name,phone',
                'dispatchedBy:id,name',
            ])
            ->withCount([
                'orderItems as received_count' => function ($q) {
                    $q->where('outsource_status', 'received');
                },
            ])
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 25));

        return $this->paginatedOrSuccessResponse($manifests, 'Manifests retrieved');
    }

    #[OA\Get(
        path: "/api/v1/lab/outsource/manifests/{id}",
        summary: "Get single manifest details with all samples",
        description: "Retrieves dispatch manifest details, patient UHIDs, test names, and barcodes for TRF challan print",
        tags: ["16. Lab — Outsource Management"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Manifest details retrieved")]
    public function showManifest(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);

        $manifest = LabOutsourceManifest::where('hospital_id', $hospitalId)
            ->where('id', $id)
            ->with([
                'vendor',
                'dispatchedBy:id,name',
                'orderItems.order.patient',
                'orderItems.testTemplate',
            ])
            ->firstOrFail();

        return $this->successResponse($manifest, 'Manifest details retrieved');
    }

    #[OA\Post(
        path: "/api/v1/lab/outsource/receive-sample",
        summary: "Record sample receipt / report from external lab (Received)",
        description: "Marks outsourced sample report received from reference lab, records external accession ID, and attaches external PDF report",
        tags: ["16. Lab — Outsource Management"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Sample report received recorded successfully")]
    public function receiveSample(Request $request)
    {
        $validated = $request->validate([
            'order_item_id'         => 'required|exists:lab_order_items,id',
            'external_accession_no' => 'nullable|string|max:100',
            'external_report_file'  => 'nullable|string|max:255',
            'technician_remarks'    => 'nullable|string',
            'status'                => 'nullable|string|in:completed,authorized',
        ]);

        $item = LabOrderItem::with('order')->findOrFail($validated['order_item_id']);

        $item->update([
            'outsource_status'      => 'received',
            'outsource_received_at' => now(),
            'external_accession_no' => $validated['external_accession_no'] ?? $item->external_accession_no,
            'external_report_file'  => $validated['external_report_file'] ?? $item->external_report_file,
            'technician_remarks'    => $validated['technician_remarks'] ?? $item->technician_remarks,
            'status'                => $validated['status'] ?? 'completed',
        ]);

        // Check if all items in the order are now completed/authorized
        $order = $item->order;
        $remainingPending = LabOrderItem::where('order_id', $order->id)
            ->whereNotIn('status', ['completed', 'authorized', 'cancelled'])
            ->count();

        if ($remainingPending === 0 && !in_array($order->status, ['completed', 'authorized'])) {
            $order->update([
                'status' => 'completed',
                'result_entered_at' => now(),
            ]);
        }

        return $this->successResponse($item, 'Sample report marked as received from reference lab');
    }

    #[OA\Get(
        path: "/api/v1/lab/outsource/reconciliation",
        summary: "Monthly vendor billing reconciliation report",
        description: "Reconciles dispatched samples against expected B2B payouts per reference lab partner",
        tags: ["16. Lab — Outsource Management"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Reconciliation report retrieved")]
    public function reconciliation(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $month = $request->input('month', date('Y-m'));

        $vendors = LabExternalVendor::where(function ($q) use ($hospitalId) {
            $q->whereNull('hospital_id')->orWhere('hospital_id', $hospitalId);
        })
        ->with(['orderItems' => function ($q) use ($month) {
            $q->where('outsource_status', '!=', null)
              ->whereRaw("TO_CHAR(created_at, 'YYYY-MM') = ?", [$month]);
        }])
        ->get()
        ->map(function ($v) {
            $items = $v->orderItems;
            $totalDispatched = $items->count();
            $receivedCount = $items->where('outsource_status', 'received')->count();
            $pendingCount = $items->where('outsource_status', 'dispatched')->count();
            $cancelledCount = $items->where('status', 'cancelled')->count();
            $totalB2BPayable = $items->where('status', '!=', 'cancelled')->sum('b2b_cost');
            $patientRevenue = $items->sum('rate');
            $grossProfit = $patientRevenue - $totalB2BPayable;
            $marginPercent = $patientRevenue > 0 ? round(($grossProfit / $patientRevenue) * 100, 1) : 0;

            return [
                'vendor_id'         => $v->id,
                'vendor_code'       => $v->vendor_code,
                'vendor_name'       => $v->name,
                'account_number'    => $v->account_number,
                'phone'             => $v->phone,
                'total_dispatched'  => $totalDispatched,
                'received_count'    => $receivedCount,
                'pending_count'     => $pendingCount,
                'cancelled_count'   => $cancelledCount,
                'total_b2b_payable' => round($totalB2BPayable, 2),
                'patient_revenue'   => round($patientRevenue, 2),
                'gross_profit'      => round($grossProfit, 2),
                'margin_percent'    => $marginPercent,
            ];
        });

        return $this->successResponse([
            'month'   => $month,
            'vendors' => $vendors,
        ], 'Reconciliation report retrieved successfully');
    }
}
