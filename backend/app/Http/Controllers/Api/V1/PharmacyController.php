<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Pharmacy\PharmacyServiceInterface;
use App\Http\Traits\HasApiResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "13. Pharmacy & Inventory", description: "Enterprise Hospital Pharmacy, Active Formulary, Suppliers, Purchases GRN, FEFO Stock, POS Dispensing & Sales Returns")]
class PharmacyController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected PharmacyServiceInterface $pharmacyService
    ) {}

    /**
     * Dashboard Statistics
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/dashboard-stats",
        summary: "Get Pharmacy KPI & Dashboard Overview",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function dashboardStats(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $stats = $this->pharmacyService->getPharmacyDashboardStats($hospitalId);
        return $this->successResponse($stats, 'Pharmacy dashboard stats retrieved successfully');
    }

    /**
     * Search 200,000+ National Medicine Master
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/formulary/search-master",
        summary: "Search 200k+ National Master Drugs",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function searchMaster(Request $request)
    {
        $query = $request->input('q', '');
        $limit = (int) $request->input('limit', 30);
        $results = $this->pharmacyService->searchMasterMedicines($query, $limit);
        return $this->successResponse($results, 'Master medicines retrieved successfully');
    }

    /**
     * Hospital Active Formulary List
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/formulary",
        summary: "Get Hospital Active Medicine Formulary Catalog",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function formulary(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only([
            'search',
            'dosage_form',
            'prescription_type',
            'is_active',
            'sort_by',
            'sort_dir',
            'per_page',
        ]);
        $paginated = $this->pharmacyService->getFormulary($hospitalId, $filters);
        return $this->successResponse($paginated, 'Hospital formulary retrieved successfully');
    }

    /**
     * Import Medicine from National Master into Hospital Catalog
     */
    #[OA\Post(
        path: "/api/v1/pharmacy/formulary/import",
        summary: "1-Click Import Drug from National Master",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function importFromMaster(Request $request)
    {
        $validated = $request->validate([
            'master_medicine_id'     => 'required|integer|exists:medicines_master,id',
            'item_code'              => 'nullable|string|max:50',
            'dosage_form'            => 'nullable|string|max:50',
            'strength'               => 'nullable|string|max:100',
            'default_purchase_price' => 'nullable|numeric|min:0',
            'default_selling_price'  => 'nullable|numeric|min:0',
            'mrp'                    => 'nullable|numeric|min:0',
            'hsn_code'               => 'nullable|string|max:20',
            'gst_rate'               => 'nullable|numeric|in:0,5,12,18,28',
            'rack_location'          => 'nullable|string|max:100',
            'min_reorder_level'      => 'nullable|integer|min:0',
            'max_stock_level'        => 'nullable|integer|min:0',
            'prescription_type'      => 'nullable|string|in:OTC,SCHEDULE_H,SCHEDULE_H1,NARCOTIC',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $medicine = $this->pharmacyService->importFromMaster(
                $hospitalId,
                $validated['master_medicine_id'],
                $validated
            );
            return $this->successResponse($medicine, 'Medicine imported into hospital catalog successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Create 100% Custom Hospital Medicine
     */
    #[OA\Post(
        path: "/api/v1/pharmacy/formulary/custom",
        summary: "Create Custom Hospital Formulation or Consumable",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function createCustom(Request $request)
    {
        $validated = $request->validate([
            'brand_name'             => 'required|string|max:255',
            'generic_name'           => 'nullable|string|max:255',
            'dosage_form'            => 'required|string|max:50',
            'strength'               => 'nullable|string|max:100',
            'manufacturer'           => 'nullable|string|max:255',
            'default_purchase_price' => 'nullable|numeric|min:0',
            'default_selling_price'  => 'nullable|numeric|min:0',
            'mrp'                    => 'nullable|numeric|min:0',
            'hsn_code'               => 'nullable|string|max:20',
            'gst_rate'               => 'nullable|numeric|in:0,5,12,18,28',
            'rack_location'          => 'nullable|string|max:100',
            'min_reorder_level'      => 'nullable|integer|min:0',
            'max_stock_level'        => 'nullable|integer|min:0',
            'prescription_type'      => 'nullable|string|in:OTC,SCHEDULE_H,SCHEDULE_H1,NARCOTIC',
            'item_code'              => 'nullable|string|max:50',
            'is_active'              => 'nullable|boolean',
            'strip_size'             => 'nullable|integer|min:1',
            'box_size'               => 'nullable|integer|min:1',
            'base_unit'              => 'nullable|string|max:50',
            'reorder_unit'           => 'nullable|string|max:50',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $medicine = $this->pharmacyService->createCustomMedicine($hospitalId, $validated);
            return $this->successResponse($medicine, 'Custom medicine created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Update Hospital Medicine
     */
    #[OA\Put(
        path: "/api/v1/pharmacy/formulary/{id}",
        summary: "Update Hospital Medicine Catalog Details",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function updateMedicine(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $validated = $request->validate([
            'brand_name'             => 'sometimes|string|max:255',
            'generic_name'           => 'nullable|string|max:255',
            'dosage_form'            => 'sometimes|string|max:50',
            'strength'               => 'nullable|string|max:100',
            'manufacturer'           => 'nullable|string|max:255',
            'default_purchase_price' => 'nullable|numeric|min:0',
            'default_selling_price'  => 'nullable|numeric|min:0',
            'mrp'                    => 'nullable|numeric|min:0',
            'hsn_code'               => 'nullable|string|max:20',
            'gst_rate'               => 'nullable|numeric|in:0,5,12,18,28',
            'rack_location'          => 'nullable|string|max:100',
            'min_reorder_level'      => 'nullable|integer|min:0',
            'max_stock_level'        => 'nullable|integer|min:0',
            'prescription_type'      => 'nullable|string|in:OTC,SCHEDULE_H,SCHEDULE_H1,NARCOTIC',
            'is_active'              => 'nullable|boolean',
            'strip_size'             => 'nullable|integer|min:1',
            'box_size'               => 'nullable|integer|min:1',
            'base_unit'              => 'nullable|string|max:50',
            'reorder_unit'           => 'nullable|string|max:50',
            'update_active_batches'  => 'nullable|boolean',
        ]);

        try {
            $updated = $this->pharmacyService->updateMedicine($hospitalId, (int) $id, $validated);
            return $this->successResponse($updated, 'Medicine updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get Single Hospital Medicine Details
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/formulary/{id}",
        summary: "Get Hospital Medicine by ID with Stock & Batches",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function showMedicine(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $med = $this->pharmacyService->getMedicine($hospitalId, (int) $id);
            return $this->successResponse($med, 'Medicine retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFoundResponse($e->getMessage());
        }
    }

    /**
     * Suppliers / Vendor Master List
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/suppliers",
        summary: "List Pharmacy Suppliers & Distributors",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function suppliers(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only(['search', 'is_active']);
        $suppliers = $this->pharmacyService->getSuppliers($hospitalId, $filters);
        return $this->successResponse($suppliers, 'Suppliers retrieved successfully');
    }

    /**
     * Create Supplier
     */
    #[OA\Post(
        path: "/api/v1/pharmacy/suppliers",
        summary: "Create New Medicine Supplier / Vendor",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function createSupplier(Request $request)
    {
        $validated = $request->validate([
            'supplier_name'   => 'required|string|max:255',
            'contact_person'  => 'nullable|string|max:150',
            'phone'           => 'nullable|string|max:50',
            'email'           => 'nullable|email|max:150',
            'gstin'           => 'nullable|string|max:20',
            'drug_license_no' => 'nullable|string|max:100',
            'pan_no'          => 'nullable|string|max:20',
            'address'         => 'nullable|string',
            'credit_days'     => 'nullable|integer|min:0',
            'credit_limit'    => 'nullable|numeric|min:0',
            'opening_balance' => 'nullable|numeric|min:0',
            'bank_name'       => 'nullable|string|max:150',
            'bank_account_no' => 'nullable|string|max:50',
            'bank_ifsc'       => 'nullable|string|max:20',
            'is_active'       => 'nullable|boolean',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $supplier = $this->pharmacyService->createSupplier($hospitalId, $validated);
            return $this->successResponse($supplier, 'Supplier created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Update Supplier
     */
    #[OA\Put(
        path: "/api/v1/pharmacy/suppliers/{id}",
        summary: "Update Medicine Supplier Details",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function updateSupplier(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $validated = $request->validate([
            'supplier_name'   => 'sometimes|string|max:255',
            'contact_person'  => 'nullable|string|max:150',
            'phone'           => 'nullable|string|max:50',
            'email'           => 'nullable|email|max:150',
            'gstin'           => 'nullable|string|max:20',
            'drug_license_no' => 'nullable|string|max:100',
            'pan_no'          => 'nullable|string|max:20',
            'address'         => 'nullable|string',
            'credit_days'     => 'nullable|integer|min:0',
            'credit_limit'    => 'nullable|numeric|min:0',
            'opening_balance' => 'nullable|numeric|min:0',
            'bank_name'       => 'nullable|string|max:150',
            'bank_account_no' => 'nullable|string|max:50',
            'bank_ifsc'       => 'nullable|string|max:20',
            'is_active'       => 'nullable|boolean',
        ]);

        try {
            $updated = $this->pharmacyService->updateSupplier($hospitalId, (int) $id, $validated);
            return $this->successResponse($updated, 'Supplier updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get Complete Supplier Ledger (Purchases/Orders history + Payment Vouchers)
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/suppliers/{id}/ledger",
        summary: "Get Complete Supplier Ledger: Orders History & Payment Vouchers",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function supplierLedger(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $ledger = $this->pharmacyService->getSupplierLedger($hospitalId, (int) $id);
            return $this->successResponse($ledger, 'Supplier ledger retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFoundResponse($e->getMessage());
        }
    }

    /**
     * Record Supplier Payment Voucher
     */
    #[OA\Post(
        path: "/api/v1/pharmacy/suppliers/{id}/payments",
        summary: "Record Payment Voucher to Supplier & Settle Invoices",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function recordSupplierPayment(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $validated = $request->validate([
            'amount'           => 'required|numeric|min:0.01',
            'payment_date'     => 'nullable|date',
            'payment_mode'     => 'required|string|in:NEFT_RTGS,CHEQUE,UPI,CASH',
            'reference_number' => 'nullable|string|max:100',
            'purchase_id'      => 'nullable|integer|exists:pharmacy_purchases,id',
            'tds_amount'       => 'nullable|numeric|min:0',
            'notes'            => 'nullable|string|max:500',
        ]);

        try {
            $payment = $this->pharmacyService->recordSupplierPayment(
                $hospitalId,
                (int) $id,
                $validated,
                $request->user()->id
            );
            return $this->successResponse($payment, 'Payment recorded and ledger updated successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * List All Supplier Payment Vouchers
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/supplier-payments",
        summary: "List All Supplier Payment Vouchers",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function supplierPayments(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only(['supplier_id', 'payment_mode', 'start_date', 'end_date', 'per_page']);
        $payments = $this->pharmacyService->getSupplierPayments($hospitalId, $filters);
        return $this->successResponse($payments, 'Supplier payments retrieved successfully');
    }

    /**
     * Inward Purchase GRN (Goods Receipt Note)
     */
    #[OA\Post(
        path: "/api/v1/pharmacy/purchases",
        summary: "Inward Medicine Purchase (GRN)",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function createPurchase(Request $request)
    {
        $validated = $request->validate([
            'supplier_id'         => 'required|integer|exists:pharmacy_suppliers,id',
            'supplier_invoice_no' => 'required|string|max:100',
            'invoice_date'        => 'required|date',
            'received_date'       => 'nullable|date',
            'discount_amount'     => 'nullable|numeric|min:0',
            'igst_amount'         => 'nullable|numeric|min:0',
            'payment_status'      => 'nullable|string|in:UNPAID,PARTIAL,PAID',
            'paid_amount'         => 'nullable|numeric|min:0',
            'notes'               => 'nullable|string',
            'items'               => 'required|array|min:1',
            'items.*.hospital_medicine_id'   => 'required|integer|exists:hospital_medicines,id',
            'items.*.batch_number'           => 'required|string|max:100',
            'items.*.mfg_date'               => 'nullable|date',
            'items.*.expiry_date'            => 'required|date|after:today',
            'items.*.pack_size'              => 'nullable|integer|min:1',
            'items.*.pack_quantity'          => 'required|integer|min:1',
            'items.*.free_pack_quantity'     => 'nullable|integer|min:0',
            'items.*.purchase_rate_per_unit' => 'required|numeric|min:0',
            'items.*.discount_percent'       => 'nullable|numeric|min:0|max:100',
            'items.*.gst_rate'               => 'nullable|numeric|in:0,5,12,18,28',
            'items.*.unit_mrp'               => 'nullable|numeric|min:0',
            'items.*.selling_price_per_unit' => 'nullable|numeric|min:0',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $purchase = $this->pharmacyService->createPurchaseGrn($hospitalId, $validated, $userId);
            return $this->successResponse($purchase, 'Purchase GRN recorded and batches added to inventory successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/pharmacy/purchases",
        summary: "List Inward Purchase Orders (GRNs)",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function purchases(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only(['search', 'supplier_id', 'payment_status', 'per_page']);
        $purchases = $this->pharmacyService->getPurchases($hospitalId, $filters);
        return $this->successResponse($purchases, 'Purchases retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/pharmacy/purchases/{id}",
        summary: "Get Purchase GRN Details by ID",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function showPurchase(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $purchase = $this->pharmacyService->getPurchaseDetails($hospitalId, (int) $id);
            return $this->successResponse($purchase, 'Purchase details retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFoundResponse($e->getMessage());
        }
    }

    /**
     * Batch Stock Inventory & Surveillance
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/batches",
        summary: "Get Live Batch Stock Inventory (FEFO)",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function batchStock(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only(['search', 'status', 'hospital_medicine_id', 'per_page']);
        $batches = $this->pharmacyService->getBatchStock($hospitalId, $filters);
        return $this->successResponse($batches, 'Batch stock retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/pharmacy/batches/near-expiry",
        summary: "Get Near-Expiry Batches (<90 Days)",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function nearExpiry(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $days = (int) $request->input('days', 90);
        $batches = $this->pharmacyService->getNearExpiryBatches($hospitalId, $days);
        return $this->successResponse($batches, 'Near-expiry batches retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/pharmacy/batches/medicine/{id}",
        summary: "Get Active FEFO Batches for Specific Medicine",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function batchesForMedicine(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $batches = $this->pharmacyService->getAvailableBatchesForMedicine($hospitalId, (int) $id);
        return $this->successResponse($batches, 'Available batches retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/pharmacy/substitutes",
        summary: "Find In-Stock Generic Salt Substitutes & Equivalent Formulations",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function substitutes(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $params = $request->only(['medicine_id', 'generic_name', 'search']);
        $result = $this->pharmacyService->getGenericSubstitutes($hospitalId, $params);
        return $this->successResponse($result, 'Generic salt substitutes retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/pharmacy/batches/{id}/adjust",
        summary: "Adjust Batch Stock (Breakage, Spoilage, Recount)",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function adjustStock(Request $request, $id)
    {
        $validated = $request->validate([
            'adjustment_quantity' => 'required|integer', // Can be positive or negative
            'reason'              => 'required|string|max:255',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $batch = $this->pharmacyService->adjustBatchStock(
                $hospitalId,
                (int) $id,
                $validated['adjustment_quantity'],
                $validated['reason'],
                $userId
            );
            return $this->successResponse($batch, 'Batch stock adjusted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * OPD/IPD Prescription Dispense Queue
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/prescriptions/pending",
        summary: "List Active Prescriptions Ready for Dispensing",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function pendingPrescriptions(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only(['search']);
        $prescriptions = $this->pharmacyService->getPendingPrescriptions($hospitalId, $filters);
        return $this->successResponse($prescriptions, 'Pending prescriptions retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/pharmacy/prescriptions/{id}/dispense-details",
        summary: "Load Prescription Items Matched with Shelf Batches",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function prescriptionDispenseDetails(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $details = $this->pharmacyService->getPrescriptionDetailsForDispense($hospitalId, (int) $id);
            return $this->successResponse($details, 'Prescription details loaded with shelf batches');
        } catch (\Exception $e) {
            return $this->notFoundResponse($e->getMessage());
        }
    }

    /**
     * Omni-Channel Sales / POS Billing
     */
    #[OA\Post(
        path: "/api/v1/pharmacy/sales",
        summary: "Point of Sale (POS) Checkout & Medicine Dispensing",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function processSale(Request $request)
    {
        $validated = $request->validate([
            'sale_type'         => 'required|string|in:WALK_IN,OPD,IPD,EMERGENCY',
            'customer_name'     => 'required|string|max:150',
            'customer_phone'    => 'nullable|string|max:20',
            'doctor_name'       => 'nullable|string|max:150',
            'patient_id'        => 'nullable|integer|exists:patients,id',
            'opd_visit_id'      => 'nullable|integer|exists:opd_visits,id',
            'ipd_admission_id'  => 'nullable|integer|exists:ipd_admissions,id',
            'prescription_id'   => 'nullable|integer|exists:prescriptions,id',
            'discount_amount'   => 'nullable|numeric|min:0',
            'payment_mode'      => 'required|string|in:CASH,UPI,CARD,SPLIT,IPD_LEDGER',
            'payment_details'   => 'nullable|array',
            'notes'             => 'nullable|string',
            'items'             => 'required|array|min:1',
            'items.*.batch_id'         => 'required|integer|exists:pharmacy_batches,id',
            'items.*.quantity'         => 'required|integer|min:1',
            'items.*.unit_price'       => 'nullable|numeric|min:0',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.gst_rate'         => 'nullable|numeric|in:0,5,12,18,28',
            'items.*.hsn_code'         => 'nullable|string|max:20',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $sale = $this->pharmacyService->processSale($hospitalId, $validated, $userId);
            return $this->successResponse($sale, 'Medicine dispensed and GST invoice generated successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/pharmacy/sales",
        summary: "List Pharmacy Sales Invoices",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function sales(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only(['search', 'sale_type', 'payment_mode', 'date', 'per_page']);
        $sales = $this->pharmacyService->getSales($hospitalId, $filters);
        return $this->successResponse($sales, 'Sales retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/pharmacy/sales/{id}",
        summary: "Get Formatted Pharmacy Tax Invoice by ID",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function showSale(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $sale = $this->pharmacyService->getSaleDetails($hospitalId, (int) $id);
            return $this->successResponse($sale, 'Sale invoice retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFoundResponse($e->getMessage());
        }
    }

    #[OA\Get(
        path: "/api/v1/pharmacy/patients/{id}/medication-history",
        summary: "Get Patient Past Medication History & 1-Click Refill Availability",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function patientMedicationHistory(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $history = $this->pharmacyService->getPatientMedicationHistory($hospitalId, (int) $id);
        return $this->successResponse($history, 'Patient medication history retrieved successfully');
    }

    /**
     * Customer Returns & Credit Notes
     */
    #[OA\Post(
        path: "/api/v1/pharmacy/returns",
        summary: "Customer Sales Return & Restock",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function processReturn(Request $request)
    {
        $validated = $request->validate([
            'sale_id'       => 'required|integer|exists:pharmacy_sales,id',
            'return_reason' => 'nullable|string|max:255',
            'refund_mode'   => 'required|string|in:CASH,UPI,IPD_DEDUCTION',
            'items'         => 'required|array|min:1',
            'items.*.sale_item_id' => 'required|integer|exists:pharmacy_sale_items,id',
            'items.*.quantity'     => 'required|integer|min:1',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $return = $this->pharmacyService->processReturn($hospitalId, $validated, $userId);
            return $this->successResponse($return, 'Customer return processed, stock restored, and credit note generated successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/pharmacy/returns",
        summary: "List Customer Returns & Credit Notes",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function returns(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only(['search', 'per_page']);
        $returns = $this->pharmacyService->getReturns($hospitalId, $filters);
        return $this->successResponse($returns, 'Returns retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/pharmacy/returns/{id}",
        summary: "Get Return Credit Note Details by ID",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function showReturn(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $return = $this->pharmacyService->getReturnDetails($hospitalId, (int) $id);
            return $this->successResponse($return, 'Return details retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFoundResponse($e->getMessage());
        }
    }

    /**
     * Stock Movements Audit Ledger
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/stock-transactions",
        summary: "Immutable Stock Transactions Audit Trail",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function stockTransactions(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only(['transaction_type', 'hospital_medicine_id', 'search', 'per_page']);
        $transactions = $this->pharmacyService->getStockTransactions($hospitalId, $filters);
        return $this->successResponse($transactions, 'Stock transactions retrieved successfully');
    }

    /**
     * Supplier Returns (RTV) List
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/supplier-returns",
        summary: "List Supplier Returns to Vendor (RTV)",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function supplierReturns(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only(['supplier_id', 'status', 'from_date', 'to_date', 'per_page']);
        $returns = $this->pharmacyService->getSupplierReturns($hospitalId, $filters);
        return $this->successResponse($returns, 'Supplier returns retrieved successfully');
    }

    /**
     * Create Supplier Return (RTV)
     */
    #[OA\Post(
        path: "/api/v1/pharmacy/supplier-returns",
        summary: "Create Supplier Return to Vendor (RTV) Challan",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function createSupplierReturn(Request $request)
    {
        $validated = $request->validate([
            'supplier_id'   => 'required|integer|exists:pharmacy_suppliers,id',
            'purchase_id'   => 'nullable|integer|exists:pharmacy_purchases,id',
            'return_reason' => 'nullable|string|in:NEAR_EXPIRY,EXPIRED,DAMAGED,WRONG_GOODS,QUALITY_ISSUE',
            'notes'         => 'nullable|string',
            'items'         => 'required|array|min:1',
            'items.*.hospital_medicine_id' => 'required|integer|exists:hospital_medicines,id',
            'items.*.batch_id'             => 'required|integer|exists:pharmacy_batches,id',
            'items.*.quantity_returned'    => 'required|integer|min:1',
            'items.*.purchase_rate'        => 'required|numeric|min:0',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $rtv = $this->pharmacyService->createSupplierReturn($hospitalId, $validated, $userId);
            return $this->successResponse($rtv, 'Supplier return (RTV) created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Show Supplier Return Details
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/supplier-returns/{id}",
        summary: "Get Supplier Return Details by ID",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function showSupplierReturn(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $rtv = $this->pharmacyService->getSupplierReturnDetails($hospitalId, (int) $id);
            return $this->successResponse($rtv, 'Supplier return details retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFoundResponse($e->getMessage());
        }
    }

    /**
     * Update Supplier Return Status (e.g., Issue Debit Note)
     */
    #[OA\Patch(
        path: "/api/v1/pharmacy/supplier-returns/{id}/status",
        summary: "Update Supplier Return Status / Issue Debit Note",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function updateSupplierReturnStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status'            => 'required|string|in:CHALLAN_PRINTED,SUPPLIER_ACCEPTED,DEBIT_NOTE_ISSUED,CLOSED',
            'debit_note_number' => 'nullable|string|max:50',
            'debit_note_date'   => 'nullable|date',
            'debit_note_amount' => 'nullable|numeric|min:0',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $rtv = $this->pharmacyService->updateSupplierReturnStatus(
                $hospitalId,
                (int) $id,
                $validated['status'],
                $validated,
                $userId
            );
            return $this->successResponse($rtv, 'Supplier return status updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Expiry Intelligence Dashboard
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/expiry-dashboard",
        summary: "Get Expiry Intelligence Dashboard Categories (Critical, Near-Expiry, Expired)",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function expiryDashboard(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $dashboard = $this->pharmacyService->getExpiryDashboard($hospitalId);
        return $this->successResponse($dashboard, 'Expiry dashboard data retrieved successfully');
    }

    /**
     * Quarantine Batch
     */
    #[OA\Post(
        path: "/api/v1/pharmacy/batches/{id}/quarantine",
        summary: "Quarantine a batch from active dispensing",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function quarantineBatch(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $batch = $this->pharmacyService->quarantineBatch($hospitalId, (int) $id, $userId);
            return $this->successResponse($batch, 'Batch quarantined successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Statutory Compliance: CDSCO Schedule H / H1 & Narcotic Regulatory Register
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/regulatory-register",
        summary: "Get CDSCO Schedule H / H1 & Narcotic Regulatory Audit Register (FDA Inspection Compliance)",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function cdscoRegister(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only([
            'schedule_type',
            'start_date',
            'end_date',
            'search',
            'per_page',
            'all',
        ]);
        $register = $this->pharmacyService->getCdscoRegulatoryRegister($hospitalId, $filters);
        return $this->successResponse($register, 'CDSCO Regulatory Register retrieved successfully');
    }

    /**
     * Statutory GST Tax Intelligence & Filing Report (GSTR-3B & Input/Output Tax Ledger)
     */
    #[OA\Get(
        path: "/api/v1/pharmacy/gst-report",
        summary: "Get Pharmacy GST Input Tax Credit vs Output Liability Report (GSTR-3B Compliant)",
        security: [["bearerAuth" => []]],
        tags: ["13. Pharmacy & Inventory"]
    )]
    public function gstReport(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only([
            'start_date',
            'end_date',
            'period',
        ]);
        $report = $this->pharmacyService->getGstReport($hospitalId, $filters);
        return $this->successResponse($report, 'GST tax report retrieved successfully');
    }

    /**
     * IPD Nursing Ward Drug Indents & Requisitions
     */
    public function wardIndents(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only([
            'status', 'priority', 'ward_name', 'ipd_admission_id',
            'start_date', 'end_date', 'search', 'per_page'
        ]);
        $indents = $this->pharmacyService->getWardIndents($hospitalId, $filters);
        return $this->successResponse($indents, 'Ward indents retrieved successfully');
    }

    public function createWardIndent(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = auth()->id() ?: 1;

        $request->validate([
            'ipd_admission_id' => 'required|integer',
            'items'            => 'required|array|min:1',
            'items.*.hospital_medicine_id' => 'required|integer',
            'items.*.requested_quantity'   => 'required|integer|min:1',
        ]);

        try {
            $indent = $this->pharmacyService->createWardIndent($hospitalId, $request->all(), $userId);
            return $this->successResponse($indent, 'Ward drug indent created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    public function showWardIndent(Request $request, int $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $indent = $this->pharmacyService->showWardIndent($hospitalId, $id);
            return $this->successResponse($indent, 'Ward indent details retrieved');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }
    }

    public function dispenseWardIndent(Request $request, int $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = auth()->id() ?: 1;

        try {
            $indent = $this->pharmacyService->dispenseWardIndent($hospitalId, $id, $request->all(), $userId);
            return $this->successResponse($indent, 'Ward indent dispensed and charged to IPD ledger successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    public function rejectWardIndent(Request $request, int $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = auth()->id() ?: 1;

        $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        try {
            $indent = $this->pharmacyService->rejectWardIndent($hospitalId, $id, $request->input('reason'), $userId);
            return $this->successResponse($indent, 'Ward indent rejected');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    public function returnWardIndentItem(Request $request, int $indentId, int $itemId)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = auth()->id() ?: 1;

        $request->validate([
            'return_quantity' => 'required|integer|min:1',
        ]);

        try {
            $indent = $this->pharmacyService->returnWardIndentItem($hospitalId, $indentId, $itemId, (int) $request->input('return_quantity'), $userId);
            return $this->successResponse($indent, 'Ward medicine returned and IPD ledger adjusted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Low Stock Intelligence & Purchase Orders (PO)
     */
    public function lowStockAlerts(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $alerts = $this->pharmacyService->getLowStockAlerts($hospitalId);
        return $this->successResponse($alerts, 'Low stock alerts retrieved successfully');
    }

    public function purchaseOrders(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only([
            'status', 'supplier_id', 'start_date', 'end_date', 'search', 'per_page'
        ]);
        $orders = $this->pharmacyService->getPurchaseOrders($hospitalId, $filters);
        return $this->successResponse($orders, 'Purchase orders retrieved successfully');
    }

    public function createPurchaseOrder(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = auth()->id() ?: 1;

        $request->validate([
            'supplier_id' => 'required|integer',
            'items'       => 'required|array|min:1',
            'items.*.hospital_medicine_id' => 'required|integer',
            'items.*.pack_quantity'        => 'required|integer|min:1',
        ]);

        try {
            $po = $this->pharmacyService->createPurchaseOrder($hospitalId, $request->all(), $userId);
            return $this->successResponse($po, 'Purchase order generated successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    public function showPurchaseOrder(Request $request, int $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $po = $this->pharmacyService->showPurchaseOrder($hospitalId, $id);
            return $this->successResponse($po, 'Purchase order retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }
    }

    public function updatePurchaseOrderStatus(Request $request, int $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = auth()->id() ?: 1;

        $request->validate([
            'status' => 'required|string',
        ]);

        try {
            $po = $this->pharmacyService->updatePurchaseOrderStatus($hospitalId, $id, $request->input('status'), $userId);
            return $this->successResponse($po, 'Purchase order status updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }
}
