<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\Billing\ChargeServiceInterface;
use App\Services\Billing\BedBillingEngine;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "12. Hospital Charges & Billing Ledger",
    description: "Tariff Master Catalog, Real-Time Inpatient Running Ledger, and Customizable Bed Billing Rules"
)]
class ChargeController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected ChargeServiceInterface $chargeService
    ) {}

    // ====================================================
    // 📂 1. CHARGE CATEGORIES
    // ====================================================

    #[OA\Get(
        path: "/api/v1/billing/charges/categories",
        summary: "Get list of hospital charge categories",
        description: "Returns all charge categories (Bed, Doctor Fees, Nursing, Equipment, Procedures, Labs, Admin) with item counts.",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\Response(response: 200, description: "Charge categories list")]
    public function getCategories(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $categories = $this->chargeService->getCategories($hospitalId);

        return $this->successResponse($categories, 'Charge categories retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/billing/charges/categories",
        summary: "Create a custom hospital charge category",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["name", "display_name"],
            properties: [
                new OA\Property(property: "name", type: "string", example: "physiotherapy_charges"),
                new OA\Property(property: "display_name", type: "string", example: "Physiotherapy & Rehab"),
                new OA\Property(property: "description", type: "string", example: "Rehabilitation and physical therapy charges")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Category created")]
    public function createCategory(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:100',
            'display_name' => 'required|string|max:150',
            'description'  => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $category = $this->chargeService->createCategory($hospitalId, $validated);

        return $this->createdResponse($category, 'Charge category created successfully');
    }

    // ====================================================
    // 🏷️ 2. CHARGES MASTER / TARIFF CATALOG
    // ====================================================

    #[OA\Get(
        path: "/api/v1/billing/charges",
        summary: "Get hospital services charges catalog",
        description: "Returns all service tariffs with filtering by category, billing type, ward, or text search.",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\Parameter(name: "category", in: "query", description: "Filter by category name e.g. bed_charges, nursing_charges", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "category_id", in: "query", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "billing_type", in: "query", description: "fixed, per_day, per_hour, per_unit", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "ward_id", in: "query", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "search", in: "query", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "all", in: "query", required: false, schema: new OA\Schema(type: "boolean", example: true))]
    #[OA\Response(response: 200, description: "List of service tariffs")]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $charges = $this->chargeService->getCharges($hospitalId, $request);

        return $this->paginatedOrSuccessResponse($charges, 'Charges catalog retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/billing/charges",
        summary: "Create a new service charge / tariff item",
        description: "Creates a new billable service tariff (e.g., specific bed rate, doctor fee, nursing procedure, equipment hourly rate).",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["category_id", "code", "name", "standard_rate"],
            properties: [
                new OA\Property(property: "category_id", type: "integer", example: 1),
                new OA\Property(property: "code", type: "string", example: "NURS-INJ"),
                new OA\Property(property: "name", type: "string", example: "IV Injection Administration"),
                new OA\Property(property: "billing_type", type: "string", enum: ["fixed", "per_day", "per_hour", "per_unit"], example: "fixed"),
                new OA\Property(property: "standard_rate", type: "number", format: "float", example: 150.00),
                new OA\Property(property: "tax_percentage", type: "number", format: "float", example: 0.00),
                new OA\Property(property: "ward_id", type: "integer", nullable: true, example: null),
                new OA\Property(property: "doctor_id", type: "integer", nullable: true, example: null),
                new OA\Property(property: "department_id", type: "integer", nullable: true, example: null),
                new OA\Property(property: "description", type: "string", example: "Intravenous cannula medication push fee")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Charge created successfully")]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id'    => 'required|integer|exists:charge_categories,id',
            'code'           => 'required|string|max:50',
            'name'           => 'required|string|max:255',
            'description'    => 'nullable|string',
            'billing_type'   => 'nullable|string|in:fixed,per_day,per_hour,per_unit',
            'standard_rate'  => 'required|numeric|min:0',
            'tax_percentage' => 'nullable|numeric|min:0|max:100',
            'department_id'  => 'nullable|integer|exists:departments,id',
            'doctor_id'      => 'nullable|integer|exists:doctors,id',
            'ward_id'        => 'nullable|integer|exists:wards,id',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $charge = $this->chargeService->createCharge($hospitalId, $validated);

        return $this->createdResponse($charge, 'Charge tariff created successfully');
    }

    #[OA\Put(
        path: "/api/v1/billing/charges/{id}",
        summary: "Update an existing service charge / tariff item",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "name", type: "string", example: "Updated Charge Name"),
                new OA\Property(property: "standard_rate", type: "number", format: "float", example: 1200.00),
                new OA\Property(property: "tax_percentage", type: "number", format: "float", example: 5.00),
                new OA\Property(property: "billing_type", type: "string", enum: ["fixed", "per_day", "per_hour", "per_unit"], example: "per_day"),
                new OA\Property(property: "is_active", type: "boolean", example: true),
                new OA\Property(property: "description", type: "string")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Charge updated successfully")]
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name'           => 'nullable|string|max:255',
            'description'    => 'nullable|string',
            'billing_type'   => 'nullable|string|in:fixed,per_day,per_hour,per_unit',
            'standard_rate'  => 'nullable|numeric|min:0',
            'tax_percentage' => 'nullable|numeric|min:0|max:100',
            'department_id'  => 'nullable|integer|exists:departments,id',
            'doctor_id'      => 'nullable|integer|exists:doctors,id',
            'ward_id'        => 'nullable|integer|exists:wards,id',
            'is_active'      => 'nullable|boolean',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $charge = $this->chargeService->updateCharge($hospitalId, (int) $id, $validated);

        return $this->successResponse($charge, 'Charge tariff updated successfully');
    }

    #[OA\Delete(
        path: "/api/v1/billing/charges/{id}",
        summary: "Delete or deactivate a service charge tariff",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Charge deleted")]
    public function destroy(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $this->chargeService->deleteCharge($hospitalId, (int) $id);

        return $this->successResponse(null, 'Charge deleted/deactivated successfully');
    }

    // ====================================================
    // 💳 3. PATIENT RUNNING BILLING LEDGER
    // ====================================================

    #[OA\Post(
        path: "/api/v1/billing/ledger/charge",
        summary: "Post a charge item to Patient's Running Ledger",
        description: "Nurse, Doctor, or Cashier posts a billable service charge (e.g. bedside dressing, nebulization, specialist round, injection) to an admitted patient or OPD encounter.",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["patient_id", "encounter_type", "encounter_id", "item_name", "unit_price"],
            properties: [
                new OA\Property(property: "patient_id", type: "integer", example: 1),
                new OA\Property(property: "encounter_type", type: "string", enum: ["ipd", "opd", "emergency"], example: "ipd"),
                new OA\Property(property: "encounter_id", type: "integer", example: 5, description: "ipd_admission_id or opd_visit_id"),
                new OA\Property(property: "charge_id", type: "integer", nullable: true, example: 9, description: "Optional Charge Master ID"),
                new OA\Property(property: "category", type: "string", example: "nursing_charges"),
                new OA\Property(property: "item_name", type: "string", example: "Bedside Wound Dressing (Minor)"),
                new OA\Property(property: "unit_price", type: "number", format: "float", example: 200.00),
                new OA\Property(property: "quantity", type: "number", format: "float", example: 1.0),
                new OA\Property(property: "tax_amount", type: "number", format: "float", example: 0.00),
                new OA\Property(property: "discount_amount", type: "number", format: "float", example: 0.00),
                new OA\Property(property: "notes", type: "string", example: "Post-op abdominal surgical dressing changed at 11:30 AM")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Charge posted to ledger")]
    public function postLedger(Request $request)
    {
        $validated = $request->validate([
            'patient_id'      => 'required|integer|exists:patients,id',
            'encounter_type'  => 'required|string|in:ipd,opd,emergency',
            'encounter_id'    => 'required|integer',
            'charge_id'       => 'nullable|integer|exists:charges_master,id',
            'category'        => 'nullable|string|max:50',
            'item_name'       => 'required|string|max:255',
            'unit_price'      => 'required|numeric|min:0',
            'quantity'        => 'nullable|numeric|min:0.01',
            'tax_amount'      => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string|max:255',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        $item = $this->chargeService->postLedgerCharge($hospitalId, $userId, $validated);

        return $this->createdResponse($item, 'Charge successfully posted to patient ledger');
    }

    #[OA\Get(
        path: "/api/v1/billing/ledger/patient/{patientId}",
        summary: "Get Patient's live running billing ledger",
        description: "Returns the complete itemized running ledger, gross total, tax, discount, net amount, and category-wise breakdown.",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\Parameter(name: "patientId", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "encounter_type", in: "query", required: false, schema: new OA\Schema(type: "string", enum: ["ipd", "opd", "emergency"]))]
    #[OA\Parameter(name: "encounter_id", in: "query", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "status", in: "query", required: false, schema: new OA\Schema(type: "string", enum: ["unbilled", "billed", "cancelled"]))]
    #[OA\Response(response: 200, description: "Patient running bill summary and items")]
    public function getPatientLedger(Request $request, $patientId)
    {
        $hospitalId = $this->getHospitalId($request);
        $ledger = $this->chargeService->getPatientLedger($hospitalId, (int) $patientId, $request);

        return $this->successResponse($ledger, 'Patient running ledger retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/billing/ledger/{id}/cancel",
        summary: "Cancel a ledger charge item",
        description: "Cancels an unbilled charge item (e.g. accidental double entry by nurse or doctor).",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["reason"],
            properties: [
                new OA\Property(property: "reason", type: "string", example: "Entry made by mistake on wrong patient")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Ledger item cancelled")]
    public function cancelLedgerItem(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:255']);
        $hospitalId = $this->getHospitalId($request);

        try {
            $item = $this->chargeService->cancelLedgerItem($hospitalId, (int) $id, $request->reason);
            return $this->successResponse($item, 'Ledger item cancelled successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    // ====================================================
    // ⚙️ 4. BED BILLING CONFIGURABLE SETTINGS
    // ====================================================

    #[OA\Get(
        path: "/api/v1/hospital/settings/bed-billing",
        summary: "Get hospital customizable Bed Billing calculation rules",
        description: "Hospital Admin API: Returns bed calculation policy (24h from allotment vs Midnight vs Cutoff), grace period, and same day rules.",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\Response(response: 200, description: "Bed billing rules")]
    public function getBedBillingConfig(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $config = $this->chargeService->getBedBillingConfig($hospitalId);

        return $this->successResponse($config, 'Bed billing settings retrieved successfully');
    }

    #[OA\Put(
        path: "/api/v1/hospital/settings/bed-billing",
        summary: "Update hospital customizable Bed Billing calculation rules",
        description: "Customize whether bed is charged every 24 hours from allotment time (admission_24h), fixed midnight (midnight), or custom cutoff time (custom_cutoff).",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(
                    property: "bed_billing_cycle",
                    type: "string",
                    enum: ["admission_24h", "midnight", "custom_cutoff", "hourly"],
                    example: "admission_24h",
                    description: "admission_24h: 24h cycle from exact allotment timestamp | midnight: 00:00 AM calendar day | custom_cutoff: specific hour | hourly: actual hours"
                ),
                new OA\Property(property: "bed_cutoff_time", type: "string", example: "12:00", description: "Cutoff time for custom_cutoff cycle (HH:MM)"),
                new OA\Property(property: "bed_grace_period_minutes", type: "integer", example: 120, description: "Grace period in minutes upon admission/discharge"),
                new OA\Property(property: "same_day_discharge_rule", type: "string", enum: ["full_day", "half_day", "hourly", "free_if_under_grace"], example: "half_day"),
                new OA\Property(property: "auto_apply_nursing_with_bed", type: "boolean", example: true, description: "Whether daily ward nursing fee is auto-posted with bed rent")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Bed billing settings updated")]
    public function updateBedBillingConfig(Request $request)
    {
        $validated = $request->validate([
            'bed_billing_cycle'           => 'nullable|string|in:admission_24h,midnight,custom_cutoff,hourly',
            'bed_cutoff_time'             => 'nullable|string|max:10',
            'bed_grace_period_minutes'    => 'nullable|integer|min:0|max:1440',
            'same_day_discharge_rule'     => 'nullable|string|in:full_day,half_day,hourly,free_if_under_grace',
            'auto_apply_nursing_with_bed' => 'nullable|boolean',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $config = $this->chargeService->updateBedBillingConfig($hospitalId, $validated);

        return $this->successResponse($config, 'Bed billing settings updated successfully');
    }

    // ====================================================
    // ⚡ 5. MANUAL TRIGGER FOR BED BILLING ENGINE
    // ====================================================

    #[OA\Post(
        path: "/api/v1/billing/charges/apply-bed-charges",
        summary: "Manually trigger automated Bed & Nursing charge engine",
        description: "Admin action to instantly run the bed charge calculation engine and apply pending cycles to all admitted patients.",
        security: [["bearerAuth" => []]],
        tags: ["12. Hospital Charges & Billing Ledger"]
    )]
    #[OA\Response(response: 200, description: "Bed charges processed")]
    public function triggerBedCharges(Request $request, BedBillingEngine $engine)
    {
        $hospitalId = $this->getHospitalId($request);
        $summary = $engine->processHospitalBedCharges($hospitalId, now());

        return $this->successResponse($summary, 'Bed and nursing charges processed successfully');
    }
}
