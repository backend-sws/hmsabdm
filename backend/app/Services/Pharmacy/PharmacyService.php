<?php

namespace App\Services\Pharmacy;

use App\Models\HospitalMedicine;
use App\Models\MedicineMaster;
use App\Models\PharmacySupplier;
use App\Models\PharmacyPurchase;
use App\Models\PharmacyPurchaseItem;
use App\Models\PharmacyBatch;
use App\Models\PharmacySale;
use App\Models\PharmacySaleItem;
use App\Models\PharmacyReturn;
use App\Models\PharmacyReturnItem;
use App\Models\PharmacySupplierReturn;
use App\Models\PharmacySupplierReturnItem;
use App\Models\StockTransaction;
use App\Models\PharmacySupplierPayment;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\BillingLedgerItem;
use App\Models\PharmacyWardIndent;
use App\Models\PharmacyWardIndentItem;
use App\Models\PharmacyPurchaseOrder;
use App\Models\PharmacyPurchaseOrderItem;
use App\Models\IpdAdmission;
use App\Models\Patient;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PharmacyService implements PharmacyServiceInterface
{
    /**
     * Database-aware case-insensitive LIKE operator (ILIKE for PostgreSQL, LIKE for MySQL/SQLite)
     */
    protected function likeOp(): string
    {
        return DB::getDriverName() === 'pgsql' ? 'ilike' : 'like';
    }

    /**
     * Get paginated formulary / catalog of hospital medicines
     */
    public function getFormulary(int $hospitalId, array $filters = []): mixed
    {
        $query = HospitalMedicine::where('hospital_id', $hospitalId)
            ->with(['activeBatches'])
            ->withCount(['batches as total_batches_count'])
            ->withSum(['batches as total_stock' => function ($q) {
                $q->where('is_active', true)
                  ->where('expiry_date', '>=', now()->toDateString());
            }], 'available_quantity');

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $like = $this->likeOp();
            $query->where(function ($q) use ($search, $like) {
                $q->where('brand_name', $like, $search)
                  ->orWhere('generic_name', $like, $search)
                  ->orWhere('item_code', $like, $search)
                  ->orWhere('manufacturer', $like, $search);
            });
        }

        if (!empty($filters['dosage_form'])) {
            $query->where('dosage_form', $filters['dosage_form']);
        }

        if (!empty($filters['prescription_type'])) {
            $query->where('prescription_type', $filters['prescription_type']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['sort_by'])) {
            $direction = strtolower($filters['sort_dir'] ?? 'asc') === 'desc' ? 'desc' : 'asc';
            $query->orderBy($filters['sort_by'], $direction);
        } else {
            $query->orderBy('brand_name', 'asc');
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);
        return $query->paginate($perPage);
    }

    /**
     * Fast search from 200,000+ National Medicine Master
     */
    public function searchMasterMedicines(string $query, int $limit = 30): mixed
    {
        $term = trim($query);
        if (strlen($term) < 2) {
            return [];
        }

        $isPgsql = DB::getDriverName() === 'pgsql';
        $like = $this->likeOp();

        $q = MedicineMaster::query();

        $q->where(function ($sub) use ($term, $like) {
            $sub->where('brand_name', $like, "%{$term}%")
                ->orWhere('generic_name', $like, "%{$term}%")
                ->orWhere('salt_composition', $like, "%{$term}%");
        });

        if ($isPgsql) {
            // Prioritize: 1. Exact brand, 2. Brand prefix, 3. Generic prefix, 4. Substring
            $q->orderByRaw("CASE 
                WHEN brand_name ILIKE ? THEN 1 
                WHEN brand_name ILIKE ? THEN 2 
                WHEN generic_name ILIKE ? THEN 3 
                ELSE 4 
            END", ["{$term}", "{$term}%", "{$term}%"]);
        } else {
            $q->orderBy('brand_name', 'asc');
        }

        return $q->select([
                'id',
                'brand_name',
                'generic_name',
                'salt_composition',
                'dosage_form',
                'manufacturer',
                'therapeutic_category',
                'prescription_type',
                'mrp',
                'is_generic',
            ])
            ->limit($limit)
            ->get();
    }

    /**
     * 1-Click Import from National Master into Hospital Formulary
     */
    public function importFromMaster(int $hospitalId, int $masterMedicineId, array $overrides = []): HospitalMedicine
    {
        $master = MedicineMaster::findOrFail($masterMedicineId);

        // Check if already in hospital catalog
        $existing = HospitalMedicine::where('hospital_id', $hospitalId)
            ->where('master_medicine_id', $masterMedicineId)
            ->first();

        if ($existing) {
            return $existing;
        }

        $sku = 'MED-' . strtoupper(substr(uniqid(), -6));

        return HospitalMedicine::create([
            'hospital_id'            => $hospitalId,
            'master_medicine_id'     => $master->id,
            'item_code'              => $overrides['item_code'] ?? $sku,
            'brand_name'             => $master->brand_name,
            'generic_name'           => $master->generic_name ?? $master->salt_composition,
            'dosage_form'            => $overrides['dosage_form'] ?? ($master->dosage_form ?: 'Tablet'),
            'strength'               => $overrides['strength'] ?? null,
            'manufacturer'           => $master->manufacturer,
            'default_purchase_price' => (float) ($overrides['default_purchase_price'] ?? ($master->mrp ? $master->mrp * 0.75 : 0)),
            'default_selling_price'  => (float) ($overrides['default_selling_price'] ?? ($master->mrp ?: 0)),
            'mrp'                    => (float) ($overrides['mrp'] ?? ($master->mrp ?: 0)),
            'hsn_code'               => $overrides['hsn_code'] ?? '3004',
            'gst_rate'               => (float) ($overrides['gst_rate'] ?? 12.0),
            'rack_location'          => $overrides['rack_location'] ?? null,
            'min_reorder_level'      => (int) ($overrides['min_reorder_level'] ?? 20),
            'max_stock_level'        => isset($overrides['max_stock_level']) ? (int) $overrides['max_stock_level'] : null,
            'strip_size'             => (int) ($overrides['strip_size'] ?? 10),
            'box_size'               => (int) ($overrides['box_size'] ?? 1),
            'base_unit'              => $overrides['base_unit'] ?? 'Tab',
            'reorder_unit'           => $overrides['reorder_unit'] ?? 'unit',
            'prescription_type'      => $overrides['prescription_type'] ?? ($master->prescription_type === 'OTC' ? 'OTC' : 'SCHEDULE_H'),
            'is_active'              => true,
        ]);
    }

    /**
     * Create 100% Custom Hospital Medicine
     */
    public function createCustomMedicine(int $hospitalId, array $data): HospitalMedicine
    {
        $sku = $data['item_code'] ?? ('MED-' . strtoupper(substr(uniqid(), -6)));

        return HospitalMedicine::create([
            'hospital_id'            => $hospitalId,
            'master_medicine_id'     => null,
            'item_code'              => $sku,
            'brand_name'             => trim($data['brand_name']),
            'generic_name'           => isset($data['generic_name']) ? trim($data['generic_name']) : null,
            'dosage_form'            => $data['dosage_form'] ?? 'Tablet',
            'strength'               => $data['strength'] ?? null,
            'manufacturer'           => $data['manufacturer'] ?? null,
            'default_purchase_price' => (float) ($data['default_purchase_price'] ?? 0),
            'default_selling_price'  => (float) ($data['default_selling_price'] ?? 0),
            'mrp'                    => (float) ($data['mrp'] ?? 0),
            'hsn_code'               => $data['hsn_code'] ?? '3004',
            'gst_rate'               => (float) ($data['gst_rate'] ?? 12.0),
            'rack_location'          => $data['rack_location'] ?? null,
            'min_reorder_level'      => (int) ($data['min_reorder_level'] ?? 20),
            'max_stock_level'        => isset($data['max_stock_level']) ? (int) $data['max_stock_level'] : null,
            'strip_size'             => (int) ($data['strip_size'] ?? 10),
            'box_size'               => (int) ($data['box_size'] ?? 1),
            'base_unit'              => $data['base_unit'] ?? 'Tab',
            'reorder_unit'           => $data['reorder_unit'] ?? 'unit',
            'prescription_type'      => $data['prescription_type'] ?? 'SCHEDULE_H',
            'is_active'              => $data['is_active'] ?? true,
        ]);
    }

    /**
     * Update an existing hospital medicine
     */
    public function updateMedicine(int $hospitalId, int $medicineId, array $data): HospitalMedicine
    {
        $medicine = HospitalMedicine::where('hospital_id', $hospitalId)
            ->where('id', $medicineId)
            ->firstOrFail();

        $updateActiveBatches = !empty($data['update_active_batches']);
        unset($data['update_active_batches']);

        $medicine->update($data);

        // Optionally synchronize updated pricing and rack to currently active batches in stock
        if ($updateActiveBatches) {
            $batchUpdates = [];
            if (isset($data['mrp'])) {
                $batchUpdates['mrp'] = (float) $data['mrp'];
            }
            if (isset($data['default_selling_price'])) {
                $batchUpdates['selling_price'] = (float) $data['default_selling_price'];
            }
            if (isset($data['default_purchase_price'])) {
                $batchUpdates['purchase_rate'] = (float) $data['default_purchase_price'];
            }
            if (isset($data['rack_location'])) {
                $batchUpdates['rack_location'] = $data['rack_location'];
            }

            if (!empty($batchUpdates)) {
                $medicine->activeBatches()->update($batchUpdates);
            }
        }

        return $medicine->fresh(['activeBatches', 'masterMedicine']);
    }

    /**
     * Get single medicine details with active batches and stock
     */
    public function getMedicine(int $hospitalId, int $medicineId): HospitalMedicine
    {
        return HospitalMedicine::where('hospital_id', $hospitalId)
            ->where('id', $medicineId)
            ->with(['activeBatches', 'masterMedicine'])
            ->firstOrFail();
    }

    /**
     * Suppliers / Vendor Master
     */
    public function getSuppliers(int $hospitalId, array $filters = []): mixed
    {
        $query = PharmacySupplier::where('hospital_id', $hospitalId)
            ->withCount('purchases')
            ->withSum('purchases as total_purchases_amount', 'net_amount')
            ->withSum('purchases as total_purchases_paid', 'paid_amount')
            ->withSum('payments as total_direct_payments', 'amount');

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $like = $this->likeOp();
            $query->where(function ($q) use ($search, $like) {
                $q->where('supplier_name', $like, $search)
                  ->orWhere('contact_person', $like, $search)
                  ->orWhere('phone', $like, $search)
                  ->orWhere('gstin', $like, $search);
            });
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        $suppliers = $query->orderBy('supplier_name', 'asc')->get();

        return $suppliers->map(function ($s) {
            $totalPurchases = (float) ($s->total_purchases_amount ?? 0);
            $totalPaid = (float) ($s->total_direct_payments ?? 0);
            if ($totalPaid == 0 && ($s->total_purchases_paid ?? 0) > 0) {
                $totalPaid = (float) $s->total_purchases_paid;
            }
            $openingBalance = (float) ($s->opening_balance ?? 0);
            $totalPayable = $openingBalance + $totalPurchases;
            $outstanding = max(0, round($totalPayable - $totalPaid, 2));
            $creditLimit = (float) ($s->credit_limit ?? 0);

            $s->calculated_total_purchases = $totalPurchases;
            $s->calculated_total_paid = $totalPaid;
            $s->calculated_outstanding = $outstanding;
            $s->calculated_credit_utilization = $creditLimit > 0 ? min(100, round(($outstanding / $creditLimit) * 100, 1)) : 0;
            $s->is_credit_limit_exceeded = $creditLimit > 0 && $outstanding > $creditLimit;

            return $s;
        });
    }

    public function createSupplier(int $hospitalId, array $data): PharmacySupplier
    {
        return PharmacySupplier::create(array_merge($data, [
            'hospital_id' => $hospitalId,
        ]));
    }

    public function updateSupplier(int $hospitalId, int $supplierId, array $data): PharmacySupplier
    {
        $supplier = PharmacySupplier::where('hospital_id', $hospitalId)
            ->where('id', $supplierId)
            ->firstOrFail();

        $supplier->update($data);
        return $supplier->fresh();
    }

    /**
     * Complete Supplier Ledger: Orders/Purchases History & Payment Vouchers
     */
    public function getSupplierLedger(int $hospitalId, int $supplierId): array
    {
        $supplier = PharmacySupplier::where('hospital_id', $hospitalId)
            ->where('id', $supplierId)
            ->firstOrFail();

        // 1. Inward Orders / Purchases with items
        $purchases = PharmacyPurchase::where('hospital_id', $hospitalId)
            ->where('supplier_id', $supplierId)
            ->with(['items.medicine', 'receivedByUser:id,name'])
            ->orderBy('received_date', 'desc')
            ->get();

        // 2. Direct Payment Vouchers
        $payments = PharmacySupplierPayment::where('hospital_id', $hospitalId)
            ->where('supplier_id', $supplierId)
            ->with(['paidByUser:id,name', 'purchase:id,grn_number,supplier_invoice_no'])
            ->orderBy('payment_date', 'desc')
            ->get();

        $totalPurchases = (float) $purchases->sum('net_amount');
        $voucherPayments = (float) $payments->sum('amount');
        $purchaseLevelPaid = (float) $purchases->sum('paid_amount');
        $totalPaid = $voucherPayments > 0 ? $voucherPayments : $purchaseLevelPaid;

        $openingBalance = (float) ($supplier->opening_balance ?? 0);
        $totalPayable = $openingBalance + $totalPurchases;
        $outstanding = max(0, round($totalPayable - $totalPaid, 2));
        $creditLimit = (float) ($supplier->credit_limit ?? 0);

        return [
            'supplier' => array_merge($supplier->toArray(), [
                'total_purchases_amount' => $totalPurchases,
                'total_paid_amount'      => $totalPaid,
                'outstanding_balance'    => $outstanding,
                'available_credit'       => $creditLimit > 0 ? max(0, round($creditLimit - $outstanding, 2)) : 0,
                'credit_utilization'     => $creditLimit > 0 ? min(100, round(($outstanding / $creditLimit) * 100, 1)) : 0,
                'purchases_count'        => $purchases->count(),
                'payments_count'         => $payments->count(),
            ]),
            'purchases' => $purchases,
            'payments'  => $payments,
        ];
    }

    /**
     * Record Supplier Payment Voucher & Reconcile Inward Purchases
     */
    public function recordSupplierPayment(int $hospitalId, int $supplierId, array $data, int $userId): PharmacySupplierPayment
    {
        return DB::transaction(function () use ($hospitalId, $supplierId, $data, $userId) {
            $supplier = PharmacySupplier::where('hospital_id', $hospitalId)
                ->where('id', $supplierId)
                ->firstOrFail();

            $year = date('Y');
            $random = strtoupper(substr(uniqid(), -5));
            $paymentNumber = "PAY-{$year}-{$random}";

            $amount = (float) $data['amount'];
            $tdsAmount = (float) ($data['tds_amount'] ?? 0);
            $purchaseId = !empty($data['purchase_id']) ? (int) $data['purchase_id'] : null;

            $payment = PharmacySupplierPayment::create([
                'hospital_id'      => $hospitalId,
                'supplier_id'      => $supplierId,
                'purchase_id'      => $purchaseId,
                'payment_number'   => $paymentNumber,
                'payment_date'     => $data['payment_date'] ?? now()->toDateString(),
                'amount'           => $amount,
                'tds_amount'       => $tdsAmount,
                'payment_mode'     => $data['payment_mode'] ?? 'NEFT_RTGS',
                'reference_number' => $data['reference_number'] ?? null,
                'notes'            => $data['notes'] ?? null,
                'paid_by_user_id'  => $userId,
            ]);

            // Reconcile purchases
            if ($purchaseId) {
                $purchase = PharmacyPurchase::where('hospital_id', $hospitalId)
                    ->where('id', $purchaseId)
                    ->where('supplier_id', $supplierId)
                    ->first();

                if ($purchase) {
                    $newPaid = round((float) $purchase->paid_amount + $amount + $tdsAmount, 2);
                    $purchase->paid_amount = $newPaid;
                    $purchase->payment_status = $newPaid >= (float) $purchase->net_amount ? 'PAID' : 'PARTIAL';
                    $purchase->save();
                }
            } else {
                // FIFO apply payment across unpaid/partial purchases of this supplier
                $remainingToAllocate = $amount + $tdsAmount;
                $unpaidPurchases = PharmacyPurchase::where('hospital_id', $hospitalId)
                    ->where('supplier_id', $supplierId)
                    ->whereIn('payment_status', ['UNPAID', 'PARTIAL'])
                    ->orderBy('received_date', 'asc')
                    ->get();

                foreach ($unpaidPurchases as $p) {
                    if ($remainingToAllocate <= 0) break;
                    $dueOnThis = max(0, (float) $p->net_amount - (float) $p->paid_amount);
                    if ($dueOnThis <= 0) continue;

                    $alloc = min($remainingToAllocate, $dueOnThis);
                    $p->paid_amount = round((float) $p->paid_amount + $alloc, 2);
                    $p->payment_status = $p->paid_amount >= (float) $p->net_amount ? 'PAID' : 'PARTIAL';
                    $p->save();

                    $remainingToAllocate -= $alloc;
                }
            }

            return $payment->load(['supplier', 'purchase', 'paidByUser']);
        });
    }

    public function getSupplierPayments(int $hospitalId, array $filters = []): mixed
    {
        $query = PharmacySupplierPayment::where('hospital_id', $hospitalId)
            ->with(['supplier', 'purchase', 'paidByUser:id,name']);

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['payment_mode'])) {
            $query->where('payment_mode', $filters['payment_mode']);
        }

        if (!empty($filters['start_date']) && !empty($filters['end_date'])) {
            $query->whereBetween('payment_date', [$filters['start_date'], $filters['end_date']]);
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);
        return $query->orderBy('payment_date', 'desc')->paginate($perPage);
    }

    /**
     * Create Inward Purchase GRN (Goods Receipt Note)
     */
    public function createPurchaseGrn(int $hospitalId, array $data, int $userId): PharmacyPurchase
    {
        return DB::transaction(function () use ($hospitalId, $data, $userId) {
            $itemsData = $data['items'] ?? [];
            if (empty($itemsData)) {
                throw new \InvalidArgumentException('Purchase order must contain at least one medicine item');
            }

            $subtotalAmount = 0.0;
            $discountAmount = (float) ($data['discount_amount'] ?? 0.0);
            $taxableAmount  = 0.0;
            $cgstAmount     = 0.0;
            $sgstAmount     = 0.0;
            $igstAmount     = (float) ($data['igst_amount'] ?? 0.0);

            // Pre-calculate line items
            $processedItems = [];

            foreach ($itemsData as $item) {
                $medicine = HospitalMedicine::where('hospital_id', $hospitalId)
                    ->where('id', $item['hospital_medicine_id'])
                    ->firstOrFail();

                $packSize          = max((int) ($item['pack_size'] ?? 1), 1);
                $packQuantity      = max((int) ($item['pack_quantity'] ?? 1), 1);
                $freePackQuantity  = max((int) ($item['free_pack_quantity'] ?? 0), 0);
                $totalUnitQuantity = ($packQuantity + $freePackQuantity) * $packSize;

                $ratePerUnit   = (float) ($item['purchase_rate_per_unit'] ?? $medicine->default_purchase_price);
                $discountPct   = (float) ($item['discount_percent'] ?? 0.0);
                $gstRate       = (float) ($item['gst_rate'] ?? $medicine->gst_rate);
                $unitMrp       = (float) ($item['unit_mrp'] ?? $medicine->mrp);
                $sellingPrice  = (float) ($item['selling_price_per_unit'] ?? $medicine->default_selling_price);

                $lineSubtotal  = $packQuantity * $packSize * $ratePerUnit;
                $lineDiscount  = $lineSubtotal * ($discountPct / 100);
                $lineTaxable   = max(0, $lineSubtotal - $lineDiscount);

                $lineCgst      = $lineTaxable * ($gstRate / 200);
                $lineSgst      = $lineTaxable * ($gstRate / 200);
                $lineTotal     = $lineTaxable + $lineCgst + $lineSgst;

                $subtotalAmount += $lineSubtotal;
                $taxableAmount  += $lineTaxable;
                $cgstAmount     += $lineCgst;
                $sgstAmount     += $lineSgst;

                $processedItems[] = [
                    'medicine'               => $medicine,
                    'batch_number'           => trim(strtoupper($item['batch_number'])),
                    'mfg_date'               => $item['mfg_date'] ?? null,
                    'expiry_date'            => $item['expiry_date'],
                    'pack_size'              => $packSize,
                    'pack_quantity'          => $packQuantity,
                    'free_pack_quantity'     => $freePackQuantity,
                    'total_unit_quantity'    => $totalUnitQuantity,
                    'purchase_rate_per_unit' => $ratePerUnit,
                    'discount_percent'       => $discountPct,
                    'gst_rate'               => $gstRate,
                    'unit_mrp'               => $unitMrp,
                    'selling_price_per_unit' => $sellingPrice,
                    'taxable_amount'         => round($lineTaxable, 2),
                    'cgst_amount'            => round($lineCgst, 2),
                    'sgst_amount'            => round($lineSgst, 2),
                    'total_amount'           => round($lineTotal, 2),
                ];
            }

            $grossPayable = $taxableAmount + $cgstAmount + $sgstAmount + $igstAmount;
            $netPayable   = round($grossPayable);
            $roundOff     = round($netPayable - $grossPayable, 2);

            // 1. Create Purchase GRN Header
            $purchase = PharmacyPurchase::create([
                'hospital_id'         => $hospitalId,
                'supplier_id'         => $data['supplier_id'],
                'supplier_invoice_no' => trim($data['supplier_invoice_no']),
                'invoice_date'        => $data['invoice_date'],
                'received_date'       => $data['received_date'] ?? now()->toDateString(),
                'subtotal_amount'     => round($subtotalAmount, 2),
                'discount_amount'     => round($discountAmount, 2),
                'taxable_amount'      => round($taxableAmount, 2),
                'cgst_amount'         => round($cgstAmount, 2),
                'sgst_amount'         => round($sgstAmount, 2),
                'igst_amount'         => round($igstAmount, 2),
                'round_off'           => $roundOff,
                'net_amount'          => $netPayable,
                'payment_status'      => $data['payment_status'] ?? 'UNPAID',
                'paid_amount'         => (float) ($data['paid_amount'] ?? 0.0),
                'notes'               => $data['notes'] ?? null,
                'received_by_user_id' => $userId,
            ]);

            // 2. Process Items & Update/Create Batches
            foreach ($processedItems as $pItem) {
                $medicine = $pItem['medicine'];

                // Find or create batch
                $batch = PharmacyBatch::firstOrCreate(
                    [
                        'hospital_id'          => $hospitalId,
                        'hospital_medicine_id' => $medicine->id,
                        'batch_number'         => $pItem['batch_number'],
                    ],
                    [
                        'mfg_date'           => $pItem['mfg_date'],
                        'expiry_date'        => $pItem['expiry_date'],
                        'purchase_rate'      => $pItem['purchase_rate_per_unit'],
                        'mrp'                => $pItem['unit_mrp'],
                        'selling_price'      => $pItem['selling_price_per_unit'],
                        'available_quantity' => 0,
                        'rack_location'      => $medicine->rack_location,
                        'is_active'          => true,
                    ]
                );

                // Update batch latest prices and increment stock
                $batch->supplier_id         = $purchase->supplier_id;
                $batch->purchase_rate       = $pItem['purchase_rate_per_unit'];
                $batch->mrp                 = $pItem['unit_mrp'];
                $batch->selling_price       = $pItem['selling_price_per_unit'];
                $batch->expiry_date         = $pItem['expiry_date'];
                $batch->available_quantity += $pItem['total_unit_quantity'];
                $batch->is_active           = true;
                $batch->save();

                // Keep hospital medicine formulary in sync with latest purchase prices
                if ($pItem['purchase_rate_per_unit'] > 0) {
                    $medicine->update([
                        'default_purchase_price' => $pItem['purchase_rate_per_unit'],
                        'default_selling_price'  => $pItem['selling_price_per_unit'] > 0 ? $pItem['selling_price_per_unit'] : $medicine->default_selling_price,
                        'mrp'                    => $pItem['unit_mrp'] > 0 ? $pItem['unit_mrp'] : $medicine->mrp,
                    ]);
                }

                // Create Purchase Line Item
                PharmacyPurchaseItem::create([
                    'purchase_id'            => $purchase->id,
                    'hospital_medicine_id'   => $medicine->id,
                    'batch_id'               => $batch->id,
                    'batch_number'           => $pItem['batch_number'],
                    'mfg_date'               => $pItem['mfg_date'],
                    'expiry_date'            => $pItem['expiry_date'],
                    'pack_size'              => $pItem['pack_size'],
                    'pack_quantity'          => $pItem['pack_quantity'],
                    'free_pack_quantity'     => $pItem['free_pack_quantity'],
                    'total_unit_quantity'    => $pItem['total_unit_quantity'],
                    'purchase_rate_per_unit' => $pItem['purchase_rate_per_unit'],
                    'discount_percent'       => $pItem['discount_percent'],
                    'gst_rate'               => $pItem['gst_rate'],
                    'unit_mrp'               => $pItem['unit_mrp'],
                    'selling_price_per_unit' => $pItem['selling_price_per_unit'],
                    'taxable_amount'         => $pItem['taxable_amount'],
                    'cgst_amount'            => $pItem['cgst_amount'],
                    'sgst_amount'            => $pItem['sgst_amount'],
                    'total_amount'           => $pItem['total_amount'],
                ]);

                // Create Immutable Stock Audit Transaction
                StockTransaction::create([
                    'hospital_id'          => $hospitalId,
                    'hospital_medicine_id' => $medicine->id,
                    'batch_id'             => $batch->id,
                    'transaction_type'     => 'PURCHASE_INWARD',
                    'quantity_in'          => $pItem['total_unit_quantity'],
                    'quantity_out'         => 0,
                    'balance_after'        => $batch->available_quantity,
                    'reference_id'         => $purchase->grn_number,
                    'notes'                => "GRN Inward from {$purchase->supplier?->supplier_name} (Inv #{$purchase->supplier_invoice_no})",
                    'performed_by_user_id' => $userId,
                ]);
            }

            return $purchase->load(['items.medicine', 'items.batch', 'supplier']);
        });
    }

    public function getPurchases(int $hospitalId, array $filters = []): mixed
    {
        $query = PharmacyPurchase::where('hospital_id', $hospitalId)
            ->with(['supplier', 'receivedByUser'])
            ->withCount('items');

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $like = $this->likeOp();
            $query->where(function ($q) use ($search, $like) {
                $q->where('grn_number', $like, $search)
                  ->orWhere('supplier_invoice_no', $like, $search)
                  ->orWhereHas('supplier', function ($sq) use ($search, $like) {
                      $sq->where('supplier_name', $like, $search);
                  });
            });
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['payment_status'])) {
            $query->where('payment_status', $filters['payment_status']);
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);
        return $query->orderBy('received_date', 'desc')->paginate($perPage);
    }

    public function getPurchaseDetails(int $hospitalId, int $purchaseId): PharmacyPurchase
    {
        return PharmacyPurchase::where('hospital_id', $hospitalId)
            ->where('id', $purchaseId)
            ->with(['supplier', 'items.medicine', 'items.batch', 'receivedByUser'])
            ->firstOrFail();
    }

    /**
     * Batch-Wise Inventory Queries
     */
    public function getBatchStock(int $hospitalId, array $filters = []): mixed
    {
        $query = PharmacyBatch::where('hospital_id', $hospitalId)
            ->with(['medicine', 'supplier:id,supplier_name,phone,gstin']);

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $like = $this->likeOp();
            $query->where(function ($q) use ($search, $like) {
                $q->where('batch_number', $like, $search)
                  ->orWhereHas('medicine', function ($mq) use ($search, $like) {
                      $mq->where('brand_name', $like, $search)
                         ->orWhere('generic_name', $like, $search)
                         ->orWhere('item_code', $like, $search);
                  })
                  ->orWhereHas('supplier', function ($sq) use ($search, $like) {
                      $sq->where('supplier_name', $like, $search);
                  });
            });
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', (int) $filters['supplier_id']);
        }

        if (!empty($filters['status'])) {
            $today = now()->toDateString();
            if ($filters['status'] === 'expired') {
                $query->where('expiry_date', '<', $today);
            } elseif ($filters['status'] === 'near_expiry') {
                $nearLimit = now()->addDays(90)->toDateString();
                $query->where('expiry_date', '>=', $today)
                      ->where('expiry_date', '<=', $nearLimit);
            } elseif ($filters['status'] === 'active') {
                $query->where('expiry_date', '>=', $today)
                      ->where('available_quantity', '>', 0);
            } elseif ($filters['status'] === 'out_of_stock') {
                $query->where('available_quantity', '<=', 0);
            }
        }

        if (!empty($filters['hospital_medicine_id'])) {
            $query->where('hospital_medicine_id', $filters['hospital_medicine_id']);
        }

        $perPage = min((int) ($filters['per_page'] ?? 25), 100);
        return $query->orderBy('expiry_date', 'asc')->paginate($perPage);
    }

    public function getNearExpiryBatches(int $hospitalId, int $days = 90): mixed
    {
        $today = now()->toDateString();
        $targetDate = now()->addDays($days)->toDateString();

        return PharmacyBatch::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->where('available_quantity', '>', 0)
            ->where('expiry_date', '>=', $today)
            ->where('expiry_date', '<=', $targetDate)
            ->with(['medicine', 'supplier:id,supplier_name,phone,gstin'])
            ->orderBy('expiry_date', 'asc')
            ->get();
    }

    public function getAvailableBatchesForMedicine(int $hospitalId, int $medicineId): mixed
    {
        return PharmacyBatch::where('hospital_id', $hospitalId)
            ->where('hospital_medicine_id', $medicineId)
            ->where('is_active', true)
            ->where('available_quantity', '>', 0)
            ->where('expiry_date', '>=', now()->toDateString())
            ->with('supplier:id,supplier_name,phone,gstin')
            ->orderBy('expiry_date', 'asc') // FEFO (First-Expiry-First-Out)
            ->get();
    }

    public function adjustBatchStock(int $hospitalId, int $batchId, int $adjustmentQty, string $reason, int $userId): PharmacyBatch
    {
        return DB::transaction(function () use ($hospitalId, $batchId, $adjustmentQty, $reason, $userId) {
            $batch = PharmacyBatch::where('hospital_id', $hospitalId)
                ->where('id', $batchId)
                ->firstOrFail();

            $oldBalance = $batch->available_quantity;
            $newBalance = max(0, $oldBalance + $adjustmentQty);
            $batch->available_quantity = $newBalance;
            $batch->save();

            StockTransaction::create([
                'hospital_id'          => $hospitalId,
                'hospital_medicine_id' => $batch->hospital_medicine_id,
                'batch_id'             => $batch->id,
                'transaction_type'     => $adjustmentQty < 0 ? 'STOCK_ADJUSTMENT' : 'STOCK_ADJUSTMENT',
                'quantity_in'          => $adjustmentQty > 0 ? $adjustmentQty : 0,
                'quantity_out'         => $adjustmentQty < 0 ? abs($adjustmentQty) : 0,
                'balance_after'        => $newBalance,
                'reference_id'         => 'ADJ-' . strtoupper(substr(uniqid(), -5)),
                'notes'                => "Manual stock adjustment: {$reason}",
                'performed_by_user_id' => $userId,
            ]);

            return $batch->fresh(['medicine']);
        });
    }

    /**
     * Pending OPD/IPD Prescriptions for Dispensing
     */
    public function getPendingPrescriptions(int $hospitalId, array $filters = []): mixed
    {
        $query = Prescription::where('prescriptions.hospital_id', $hospitalId)
            ->whereHas('items', function ($iq) {
                $iq->where('is_dispensed', false);
            })
            ->with([
                'patient',
                'doctor',
                'opdVisit',
                'items' => function ($iq) {
                    $iq->where('is_dispensed', false);
                },
            ]);

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $like = $this->likeOp();
            $query->where(function ($q) use ($search, $like) {
                $q->where('prescription_number', $like, $search)
                  ->orWhereHas('patient', function ($pq) use ($search, $like) {
                      $pq->where('name', $like, $search)
                         ->orWhere('uhid', $like, $search)
                         ->orWhere('mobile', $like, $search);
                  });
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate(20);
    }

    public function getPrescriptionDetailsForDispense(int $hospitalId, int $prescriptionId): mixed
    {
        $rx = Prescription::where('hospital_id', $hospitalId)
            ->where('id', $prescriptionId)
            ->with([
                'patient',
                'doctor',
                'opdVisit',
                'items',
            ])
            ->firstOrFail();

        // For each item, look up matching hospital medicines and available FEFO batches
        $enrichedItems = $rx->items->map(function ($item) use ($hospitalId) {
            $med = null;
            if ($item->medicine_id) {
                $med = HospitalMedicine::where('hospital_id', $hospitalId)
                    ->where('master_medicine_id', $item->medicine_id)
                    ->first();
            }

            if (!$med && !empty($item->medicine_name)) {
                $like = $this->likeOp();
                $med = HospitalMedicine::where('hospital_id', $hospitalId)
                    ->where('brand_name', $like, '%' . trim($item->medicine_name) . '%')
                    ->first();
            }

            $availableBatches = $med ? $this->getAvailableBatchesForMedicine($hospitalId, $med->id) : collect([]);

            return [
                'prescription_item_id' => $item->id,
                'medicine_name'        => $item->medicine_name,
                'dosage_form'          => $item->dosage_form,
                'dosage'               => $item->dosage,
                'frequency'            => $item->frequency,
                'duration_days'        => $item->duration_days,
                'instructions'         => $item->instructions,
                'is_dispensed'         => $item->is_dispensed,
                'hospital_medicine'    => $med,
                'available_batches'    => $availableBatches,
                'fefo_batch'           => $availableBatches->first(),
            ];
        });

        return [
            'prescription'   => $rx,
            'dispense_items' => $enrichedItems,
        ];
    }

    /**
     * Process Omni-Channel Sale & Point of Sale (POS) Billing
     */
    public function processSale(int $hospitalId, array $data, int $userId): PharmacySale
    {
        return DB::transaction(function () use ($hospitalId, $data, $userId) {
            $itemsData = $data['items'] ?? [];
            if (empty($itemsData)) {
                throw new \InvalidArgumentException('Sale must contain at least one medicine item');
            }

            $subtotalAmount = 0.0;
            $discountAmount = (float) ($data['discount_amount'] ?? 0.0);
            $taxableAmount  = 0.0;
            $cgstAmount     = 0.0;
            $sgstAmount     = 0.0;

            $processedSaleItems = [];

            foreach ($itemsData as $item) {
                $batch = PharmacyBatch::where('hospital_id', $hospitalId)
                    ->where('id', $item['batch_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                $medicine = $batch->medicine;
                $quantity = max((int) $item['quantity'], 1);

                if ($batch->isExpired()) {
                    throw new \InvalidArgumentException("Batch {$batch->batch_number} of {$medicine->brand_name} has expired on {$batch->expiry_date->format('d/m/Y')}. Dispensing expired medicine is prohibited!");
                }

                if ($batch->available_quantity < $quantity) {
                    throw new \InvalidArgumentException("Insufficient stock in batch {$batch->batch_number}. Available: {$batch->available_quantity}, Requested: {$quantity}");
                }

                $unitPrice    = (float) ($item['unit_price'] ?? $batch->selling_price);
                $unitMrp      = (float) ($batch->mrp ?: $unitPrice);
                $discountPct  = (float) ($item['discount_percent'] ?? 0.0);
                $gstRate      = (float) ($item['gst_rate'] ?? $medicine->gst_rate);
                $hsnCode      = $item['hsn_code'] ?? $medicine->hsn_code;

                $isTaxInclusive = isset($item['is_tax_inclusive'])
                    ? filter_var($item['is_tax_inclusive'], FILTER_VALIDATE_BOOLEAN)
                    : (($data['tax_mode'] ?? 'INCLUSIVE') === 'INCLUSIVE');

                $lineGross    = $quantity * $unitPrice;
                $lineDiscount = $lineGross * ($discountPct / 100);
                $lineNet      = max(0, $lineGross - $lineDiscount);

                if ($isTaxInclusive) {
                    // MRP / Retail Inclusive GST: Back-calculate Taxable base & GST from selling price
                    if ($gstRate > 0) {
                        $lineTaxable = round($lineNet / (1 + ($gstRate / 100)), 2);
                        $lineTax     = round($lineNet - $lineTaxable, 2);
                        $lineCgst    = round($lineTax / 2, 2);
                        $lineSgst    = round($lineTax - $lineCgst, 2);
                    } else {
                        $lineTaxable = $lineNet;
                        $lineCgst    = 0.0;
                        $lineSgst    = 0.0;
                    }
                    $lineTotal = $lineNet;
                } else {
                    // Tax Exclusive: GST is added on top of the rate
                    $lineTaxable = $lineNet;
                    $lineCgst    = round($lineTaxable * ($gstRate / 200), 2);
                    $lineSgst    = round($lineTaxable * ($gstRate / 200), 2);
                    $lineTotal   = round($lineTaxable + $lineCgst + $lineSgst, 2);
                }

                $subtotalAmount += $lineGross;
                $taxableAmount  += $lineTaxable;
                $cgstAmount     += $lineCgst;
                $sgstAmount     += $lineSgst;

                $processedSaleItems[] = [
                    'medicine'         => $medicine,
                    'batch'            => $batch,
                    'quantity'         => $quantity,
                    'unit_mrp'         => $unitMrp,
                    'unit_price'       => $unitPrice,
                    'discount_percent' => $discountPct,
                    'gst_rate'         => $gstRate,
                    'hsn_code'         => $hsnCode,
                    'taxable_amount'   => round($lineTaxable, 2),
                    'cgst_amount'      => round($lineCgst, 2),
                    'sgst_amount'      => round($lineSgst, 2),
                    'total_amount'     => round($lineTotal, 2),
                ];
            }

            $grossTotal = max(0, ($taxableAmount + $cgstAmount + $sgstAmount) - $discountAmount);
            $netTotal   = round($grossTotal);
            $roundOff   = round($netTotal - $grossTotal, 2);

            $paymentMode   = $data['payment_mode'] ?? 'CASH';
            $paymentStatus = $paymentMode === 'IPD_LEDGER' ? 'CHARGED_TO_IPD' : 'PAID';

            $doctorRegNo = $data['doctor_reg_no'] ?? null;
            if (empty($doctorRegNo) && !empty($data['prescription_id'])) {
                $rx = Prescription::with('doctor')->find($data['prescription_id']);
                if ($rx && $rx->doctor && !empty($rx->doctor->hpr_id)) {
                    $doctorRegNo = $rx->doctor->hpr_id;
                }
            }

            // 1. Create Pharmacy Sale Header
            $sale = PharmacySale::create([
                'hospital_id'       => $hospitalId,
                'sale_type'         => $data['sale_type'] ?? 'WALK_IN',
                'patient_id'        => $data['patient_id'] ?? null,
                'opd_visit_id'      => $data['opd_visit_id'] ?? null,
                'ipd_admission_id'  => $data['ipd_admission_id'] ?? null,
                'prescription_id'   => $data['prescription_id'] ?? null,
                'customer_name'     => trim($data['customer_name']),
                'customer_phone'    => $data['customer_phone'] ?? null,
                'doctor_name'       => $data['doctor_name'] ?? null,
                'doctor_reg_no'     => $doctorRegNo,
                'subtotal_amount'   => round($subtotalAmount, 2),
                'discount_amount'   => round($discountAmount, 2),
                'taxable_amount'    => round($taxableAmount, 2),
                'cgst_amount'       => round($cgstAmount, 2),
                'sgst_amount'       => round($sgstAmount, 2),
                'round_off'         => $roundOff,
                'net_amount'        => $netTotal,
                'payment_mode'      => $paymentMode,
                'payment_details'   => $data['payment_details'] ?? null,
                'payment_status'    => $paymentStatus,
                'notes'             => $data['notes'] ?? null,
                'billed_by_user_id' => $userId,
            ]);

            // 2. Deduct Stock & Create Sale Items
            foreach ($processedSaleItems as $sItem) {
                $batch    = $sItem['batch'];
                $medicine = $sItem['medicine'];
                $qty      = $sItem['quantity'];

                $batch->available_quantity -= $qty;
                $batch->save();

                PharmacySaleItem::create([
                    'sale_id'              => $sale->id,
                    'hospital_medicine_id' => $medicine->id,
                    'batch_id'             => $batch->id,
                    'batch_number'         => $batch->batch_number,
                    'expiry_date'          => $batch->expiry_date,
                    'hsn_code'             => $sItem['hsn_code'],
                    'quantity'             => $qty,
                    'unit_mrp'             => $sItem['unit_mrp'],
                    'unit_price'           => $sItem['unit_price'],
                    'discount_percent'     => $sItem['discount_percent'],
                    'taxable_amount'       => $sItem['taxable_amount'],
                    'gst_rate'             => $sItem['gst_rate'],
                    'cgst_amount'          => $sItem['cgst_amount'],
                    'sgst_amount'          => $sItem['sgst_amount'],
                    'total_amount'         => $sItem['total_amount'],
                    'returned_quantity'    => 0,
                ]);

                // Immutable stock ledger log
                StockTransaction::create([
                    'hospital_id'          => $hospitalId,
                    'hospital_medicine_id' => $medicine->id,
                    'batch_id'             => $batch->id,
                    'transaction_type'     => 'SALE_DISPENSE',
                    'quantity_in'          => 0,
                    'quantity_out'         => $qty,
                    'balance_after'        => $batch->available_quantity,
                    'reference_id'         => $sale->invoice_number,
                    'notes'                => "POS dispense to {$sale->customer_name} ({$sale->sale_type})",
                    'performed_by_user_id' => $userId,
                ]);
            }

            // 3. If linked to prescription, mark items as dispensed
            if (!empty($data['prescription_id'])) {
                PrescriptionItem::where('prescription_id', $data['prescription_id'])
                    ->update(['is_dispensed' => true]);
            }

            // 4. If IPD Ledger charge, record into IPD billing ledger
            if ($paymentMode === 'IPD_LEDGER' && !empty($data['ipd_admission_id'])) {
                BillingLedgerItem::create([
                    'hospital_id'        => $hospitalId,
                    'patient_id'         => $sale->patient_id,
                    'encounter_type'     => 'ipd',
                    'encounter_id'       => (int) $data['ipd_admission_id'],
                    'category'           => 'pharmacy',
                    'item_name'          => "Pharmacy Dispense (Invoice #{$sale->invoice_number})",
                    'unit_price'         => $netTotal,
                    'quantity'           => 1.0,
                    'tax_amount'         => round($cgstAmount + $sgstAmount, 2),
                    'discount_amount'    => $discountAmount,
                    'total_amount'       => $netTotal,
                    'charged_at'         => now(),
                    'charged_by_user_id' => $userId,
                    'auto_generated'     => true,
                    'notes'              => "Posted from Pharmacy POS Desk to IPD Ledger (Invoice #{$sale->invoice_number})",
                    'status'             => 'unbilled',
                ]);
            }

            return $sale->load(['items.medicine', 'items.batch', 'patient', 'billedByUser']);
        });
    }

    public function getSales(int $hospitalId, array $filters = []): mixed
    {
        $query = PharmacySale::where('hospital_id', $hospitalId)
            ->with(['patient', 'billedByUser:id,name'])
            ->withCount('items');

        if (!empty($filters['patient_id'])) {
            $query->where('patient_id', (int) $filters['patient_id']);
        }

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $like = $this->likeOp();
            $query->where(function ($q) use ($search, $like) {
                $q->where('invoice_number', $like, $search)
                  ->orWhere('customer_name', $like, $search)
                  ->orWhere('customer_phone', $like, $search);
            });
        }

        if (!empty($filters['sale_type'])) {
            $query->where('sale_type', $filters['sale_type']);
        }

        if (!empty($filters['payment_mode'])) {
            $query->where('payment_mode', $filters['payment_mode']);
        }

        if (!empty($filters['date'])) {
            $query->whereDate('created_at', $filters['date']);
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);
        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function getSaleDetails(int $hospitalId, int $saleId): PharmacySale
    {
        return PharmacySale::where('hospital_id', $hospitalId)
            ->where('id', $saleId)
            ->with([
                'patient',
                'opdVisit',
                'ipdAdmission',
                'prescription',
                'items.medicine',
                'items.batch',
                'returns.items',
                'billedByUser',
            ])
            ->firstOrFail();
    }

    /**
     * Process Customer Sales Return & Credit Note
     */
    public function processReturn(int $hospitalId, array $data, int $userId): PharmacyReturn
    {
        return DB::transaction(function () use ($hospitalId, $data, $userId) {
            $sale = PharmacySale::where('hospital_id', $hospitalId)
                ->where('id', $data['sale_id'])
                ->with('items')
                ->firstOrFail();

            $returnItemsData = $data['items'] ?? [];
            if (empty($returnItemsData)) {
                throw new \InvalidArgumentException('At least one item must be selected for return');
            }

            $totalRefund = 0.0;
            $processedReturns = [];

            foreach ($returnItemsData as $rItem) {
                $saleItem = PharmacySaleItem::where('sale_id', $sale->id)
                    ->where('id', $rItem['sale_item_id'])
                    ->firstOrFail();

                $returnQty = (int) $rItem['quantity'];
                $availableToReturn = $saleItem->quantity - $saleItem->returned_quantity;

                if ($returnQty <= 0 || $returnQty > $availableToReturn) {
                    throw new \InvalidArgumentException("Invalid return quantity {$returnQty} for item {$saleItem->medicine?->brand_name}. Max returnable: {$availableToReturn}");
                }

                $unitPrice    = $saleItem->unit_price;
                $lineTaxable  = $unitPrice * $returnQty * (1 - ($saleItem->discount_percent / 100));
                $lineCgst     = $lineTaxable * ($saleItem->gst_rate / 200);
                $lineSgst     = $lineTaxable * ($saleItem->gst_rate / 200);
                $lineRefund   = round($lineTaxable + $lineCgst + $lineSgst, 2);

                $totalRefund += $lineRefund;

                $processedReturns[] = [
                    'sale_item'               => $saleItem,
                    'quantity_returned'       => $returnQty,
                    'unit_price'              => $unitPrice,
                    'taxable_amount_reversed' => round($lineTaxable, 2),
                    'cgst_reversed'           => round($lineCgst, 2),
                    'sgst_reversed'           => round($lineSgst, 2),
                    'net_refund_amount'       => $lineRefund,
                ];
            }

            // 1. Create Return Header
            $return = PharmacyReturn::create([
                'hospital_id'           => $hospitalId,
                'sale_id'               => $sale->id,
                'customer_name'         => $sale->customer_name,
                'customer_phone'        => $sale->customer_phone,
                'return_reason'         => $data['return_reason'] ?? 'Customer medicine return',
                'refund_amount'         => round($totalRefund),
                'refund_mode'           => $data['refund_mode'] ?? 'CASH',
                'processed_by_user_id'  => $userId,
            ]);

            // 2. Restore Stock into Original Batches & Create Return Items
            foreach ($processedReturns as $pRet) {
                $saleItem = $pRet['sale_item'];
                $retQty   = $pRet['quantity_returned'];

                $saleItem->returned_quantity += $retQty;
                $saleItem->save();

                // Restore batch stock
                $batch = PharmacyBatch::where('id', $saleItem->batch_id)->lockForUpdate()->first();
                if ($batch) {
                    $batch->available_quantity += $retQty;
                    $batch->save();

                    // Log stock transaction
                    StockTransaction::create([
                        'hospital_id'          => $hospitalId,
                        'hospital_medicine_id' => $saleItem->hospital_medicine_id,
                        'batch_id'             => $batch->id,
                        'transaction_type'     => 'SALES_RETURN',
                        'quantity_in'          => $retQty,
                        'quantity_out'         => 0,
                        'balance_after'        => $batch->available_quantity,
                        'reference_id'         => $return->credit_note_number,
                        'notes'                => "Customer return on invoice {$sale->invoice_number}",
                        'performed_by_user_id' => $userId,
                    ]);
                }

                PharmacyReturnItem::create([
                    'return_id'               => $return->id,
                    'sale_item_id'            => $saleItem->id,
                    'hospital_medicine_id'    => $saleItem->hospital_medicine_id,
                    'batch_id'                => $saleItem->batch_id,
                    'quantity_returned'       => $retQty,
                    'unit_price'              => $pRet['unit_price'],
                    'taxable_amount_reversed' => $pRet['taxable_amount_reversed'],
                    'cgst_reversed'           => $pRet['cgst_reversed'],
                    'sgst_reversed'           => $pRet['sgst_reversed'],
                    'net_refund_amount'       => $pRet['net_refund_amount'],
                ]);
            }

            // Update sale status if fully returned
            $totalOriginalUnits = $sale->items->sum('quantity');
            $totalReturnedUnits = $sale->items->sum('returned_quantity');
            if ($totalReturnedUnits >= $totalOriginalUnits) {
                $sale->payment_status = 'REFUNDED';
            } else {
                $sale->payment_status = 'PARTIALLY_REFUNDED';
            }
            $sale->save();

            // 3. If original sale was charged to IPD Ledger, post credit reversal to IPD running ledger
            if ($sale->payment_mode === 'IPD_LEDGER' && $sale->ipd_admission_id) {
                BillingLedgerItem::create([
                    'hospital_id'        => $hospitalId,
                    'patient_id'         => $sale->patient_id,
                    'encounter_type'     => 'ipd',
                    'encounter_id'       => (int) $sale->ipd_admission_id,
                    'category'           => 'pharmacy',
                    'item_name'          => "Pharmacy Return Credit (Credit Note #{$return->credit_note_number})",
                    'unit_price'         => -round($totalRefund),
                    'quantity'           => 1.0,
                    'tax_amount'         => 0.00,
                    'discount_amount'    => 0.00,
                    'total_amount'       => -round($totalRefund),
                    'charged_at'         => now(),
                    'charged_by_user_id' => $userId,
                    'auto_generated'     => true,
                    'notes'              => "Returned medications against Invoice #{$sale->invoice_number}",
                    'status'             => 'unbilled',
                ]);
            }

            return $return->load(['items.medicine', 'sale']);
        });
    }

    public function getReturns(int $hospitalId, array $filters = []): mixed
    {
        $query = PharmacyReturn::where('hospital_id', $hospitalId)
            ->with(['sale:id,invoice_number,sale_type,net_amount', 'processedByUser:id,name'])
            ->withCount('items');

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $like = $this->likeOp();
            $query->where(function ($q) use ($search, $like) {
                $q->where('credit_note_number', $like, $search)
                  ->orWhere('customer_name', $like, $search)
                  ->orWhereHas('sale', function ($sq) use ($search, $like) {
                      $sq->where('invoice_number', $like, $search);
                  });
            });
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);
        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function getReturnDetails(int $hospitalId, int $returnId): PharmacyReturn
    {
        return PharmacyReturn::where('hospital_id', $hospitalId)
            ->where('id', $returnId)
            ->with([
                'sale',
                'items.medicine',
                'items.batch',
                'processedByUser',
            ])
            ->firstOrFail();
    }

    /**
     * Stock Movement Audit Ledger
     */
    public function getStockTransactions(int $hospitalId, array $filters = []): mixed
    {
        $query = StockTransaction::where('hospital_id', $hospitalId)
            ->with(['medicine:id,brand_name,dosage_form,item_code', 'batch:id,batch_number,expiry_date', 'performedByUser:id,name']);

        if (!empty($filters['transaction_type'])) {
            $query->where('transaction_type', $filters['transaction_type']);
        }

        if (!empty($filters['hospital_medicine_id'])) {
            $query->where('hospital_medicine_id', $filters['hospital_medicine_id']);
        }

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $like = $this->likeOp();
            $query->where(function ($q) use ($search, $like) {
                $q->where('reference_id', $like, $search)
                  ->orWhereHas('medicine', function ($mq) use ($search, $like) {
                      $mq->where('brand_name', $like, $search);
                  });
            });
        }

        $perPage = min((int) ($filters['per_page'] ?? 25), 100);
        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * Dashboard KPI Stats
     */
    public function getPharmacyDashboardStats(int $hospitalId): array
    {
        $today = now()->toDateString();
        $nearExpiryThreshold = now()->addDays(90)->toDateString();

        $todaySales = PharmacySale::where('hospital_id', $hospitalId)
            ->whereDate('created_at', $today);

        $todaySalesCount = (clone $todaySales)->count();
        $todayRevenue    = (clone $todaySales)->sum('net_amount');

        $totalMedicines = HospitalMedicine::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->count();

        $nearExpiryBatchesCount = PharmacyBatch::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->where('available_quantity', '>', 0)
            ->where('expiry_date', '>=', $today)
            ->where('expiry_date', '<=', $nearExpiryThreshold)
            ->count();

        $expiredBatchesCount = PharmacyBatch::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->where('available_quantity', '>', 0)
            ->where('expiry_date', '<', $today)
            ->count();

        // Count medicines with stock <= min_reorder_level
        $medicines = HospitalMedicine::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->with(['batches' => function ($q) use ($today) {
                $q->where('is_active', true)->where('expiry_date', '>=', $today);
            }])
            ->get();

        $lowStockCount = 0;
        foreach ($medicines as $med) {
            $currentStock = $med->batches->sum('available_quantity');
            if ($currentStock <= $med->min_reorder_level) {
                $lowStockCount++;
            }
        }

        return [
            'today_sales_count'   => $todaySalesCount,
            'today_revenue'       => round((float) $todayRevenue, 2),
            'total_medicines'     => $totalMedicines,
            'low_stock_count'     => $lowStockCount,
            'near_expiry_count'   => $nearExpiryBatchesCount,
            'expired_count'       => $expiredBatchesCount,
        ];
    }

    // -------------------------------------------------------------------------
    // Supplier Return to Vendor (RTV)
    // -------------------------------------------------------------------------

    /**
     * Get paginated supplier returns (RTV) for a hospital.
     */
    public function getSupplierReturns(int $hospitalId, array $filters = []): mixed
    {
        $query = PharmacySupplierReturn::where('hospital_id', $hospitalId)
            ->with(['supplier:id,supplier_name', 'initiatedBy:id,name'])
            ->withCount('items');

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        return $query->orderByDesc('created_at')->paginate((int) ($filters['per_page'] ?? 20));
    }

    /**
     * Create a new Supplier Return (RTV) with line items.
     * Reduces batch stock for each returned item.
     */
    public function createSupplierReturn(int $hospitalId, array $data, int $userId): PharmacySupplierReturn
    {
        return DB::transaction(function () use ($hospitalId, $data, $userId) {
            // Generate sequential RTV number
            $today  = Carbon::today();
            $prefix = 'RTV-' . $today->format('Ymd') . '-';
            $last   = PharmacySupplierReturn::where('hospital_id', $hospitalId)
                ->whereDate('created_at', $today)
                ->orderByDesc('id')
                ->value('rtv_number');
            $seq = $last ? ((int) substr($last, -4)) + 1 : 1;
            $rtvNumber = $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);

            $totalValue       = 0.00;
            $itemPayload      = [];
            $targetSupplierId = !empty($data['supplier_id']) ? (int) $data['supplier_id'] : null;

            foreach ($data['items'] as $item) {
                $batch = PharmacyBatch::where('hospital_id', $hospitalId)
                    ->where('id', $item['batch_id'])
                    ->with('supplier:id,supplier_name')
                    ->lockForUpdate()
                    ->firstOrFail();

                // Auto-resolve supplier from the first batch if not explicitly passed
                if (!$targetSupplierId && $batch->supplier_id) {
                    $targetSupplierId = $batch->supplier_id;
                }

                // Guard: Ensure batch belongs to the same supplier
                if ($batch->supplier_id && $targetSupplierId && $batch->supplier_id !== $targetSupplierId) {
                    $supplierName = $batch->supplier?->supplier_name ?? "Vendor #{$batch->supplier_id}";
                    throw new \InvalidArgumentException("Batch '{$batch->batch_number}' belongs to '{$supplierName}'. An RTV Challan & Debit Note can only be issued to a single supplier.");
                }

                $qty       = (int) $item['quantity_returned'];
                $rate      = (float) $item['purchase_rate'];
                $lineTotal = round($qty * $rate, 2);
                $totalValue += $lineTotal;

                // Deduct from batch
                $batch->decrement('available_quantity', $qty);

                // Record stock transaction
                StockTransaction::create([
                    'hospital_id'          => $hospitalId,
                    'hospital_medicine_id' => $item['hospital_medicine_id'],
                    'batch_id'             => $item['batch_id'],
                    'transaction_type'     => 'PURCHASE_RETURN',
                    'quantity_in'          => 0,
                    'quantity_out'         => $qty,
                    'balance_after'        => $batch->available_quantity,
                    'reference_id'         => $rtvNumber,
                    'notes'                => 'RTV: ' . $rtvNumber,
                    'performed_by_user_id' => $userId,
                ]);

                $itemPayload[] = [
                    'hospital_medicine_id' => $item['hospital_medicine_id'],
                    'batch_id'             => $item['batch_id'],
                    'batch_number'         => $batch->batch_number,
                    'expiry_date'          => $batch->expiry_date,
                    'quantity_returned'    => $qty,
                    'purchase_rate'        => $rate,
                    'line_total'           => $lineTotal,
                ];
            }

            if (!$targetSupplierId) {
                throw new \InvalidArgumentException('Supplier / Vendor could not be identified for this return. Please select a supplier.');
            }

            $return = PharmacySupplierReturn::create([
                'hospital_id'         => $hospitalId,
                'rtv_number'          => $rtvNumber,
                'supplier_id'         => $targetSupplierId,
                'purchase_id'         => $data['purchase_id'] ?? null,
                'return_reason'       => $data['return_reason'] ?? 'NEAR_EXPIRY',
                'notes'               => $data['notes'] ?? null,
                'status'              => 'DRAFT',
                'total_return_value'  => round($totalValue, 2),
                'initiated_by_user_id'=> $userId,
            ]);

            $return->items()->createMany($itemPayload);

            return $return->load(['supplier', 'items.medicine', 'items.batch']);
        });
    }

    /**
     * Get full details of a supplier return with line items.
     */
    public function getSupplierReturnDetails(int $hospitalId, int $returnId): PharmacySupplierReturn
    {
        return PharmacySupplierReturn::where('hospital_id', $hospitalId)
            ->with([
                'supplier',
                'purchase',
                'initiatedBy:id,name',
                'approvedBy:id,name',
                'items.medicine:id,brand_name,generic_name,item_code',
                'items.batch:id,batch_number,expiry_date',
            ])
            ->findOrFail($returnId);
    }

    /**
     * Update status of a supplier return (e.g., approve, issue debit note).
     */
    public function updateSupplierReturnStatus(
        int $hospitalId,
        int $returnId,
        string $status,
        array $extra,
        int $userId
    ): PharmacySupplierReturn {
        $return = PharmacySupplierReturn::where('hospital_id', $hospitalId)
            ->findOrFail($returnId);

        $allowedTransitions = [
            'DRAFT'                => ['CHALLAN_PRINTED'],
            'CHALLAN_PRINTED'      => ['SUPPLIER_ACCEPTED'],
            'SUPPLIER_ACCEPTED'    => ['DEBIT_NOTE_ISSUED'],
            'DEBIT_NOTE_ISSUED'    => ['CLOSED'],
        ];

        $current = $return->status;
        if (!in_array($status, $allowedTransitions[$current] ?? [], true)) {
            throw new \InvalidArgumentException(
                "Cannot transition RTV from {$current} to {$status}."
            );
        }

        $update = ['status' => $status];

        if ($status === 'SUPPLIER_ACCEPTED') {
            $update['approved_by_user_id'] = $userId;
            $update['approved_at']         = now();
        }
        if ($status === 'DEBIT_NOTE_ISSUED') {
            $update['debit_note_number'] = $extra['debit_note_number'] ?? null;
            $update['debit_note_date']   = $extra['debit_note_date'] ?? today()->toDateString();
            $update['debit_note_amount'] = $extra['debit_note_amount'] ?? $return->total_return_value;
        }

        $return->update($update);

        return $return->fresh(['supplier', 'items']);
    }

    // -------------------------------------------------------------------------
    // Expiry Intelligence Dashboard
    // -------------------------------------------------------------------------

    /**
     * Detailed expiry intelligence breakdown for the dashboard.
     */
    public function getExpiryDashboard(int $hospitalId): array
    {
        $today      = Carbon::today();
        $in30Days   = Carbon::today()->addDays(30);
        $in90Days   = Carbon::today()->addDays(90);

        $batches = PharmacyBatch::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->where('available_quantity', '>', 0)
            ->with([
                'medicine:id,brand_name,generic_name,item_code',
                'supplier:id,supplier_name,phone,gstin',
            ])
            ->get();

        $expired    = [];
        $critical   = [];
        $nearExpiry = [];
        $good       = [];

        foreach ($batches as $b) {
            $expiry = Carbon::parse($b->expiry_date);
            $entry  = [
                'batch_id'          => $b->id,
                'batch_number'      => $b->batch_number,
                'hospital_medicine_id' => $b->hospital_medicine_id,
                'medicine_name'     => $b->medicine?->brand_name,
                'generic_name'      => $b->medicine?->generic_name,
                'item_code'         => $b->medicine?->item_code,
                'expiry_date'       => $b->expiry_date,
                'available_quantity'=> $b->available_quantity,
                'purchase_rate'     => $b->purchase_rate,
                'supplier_id'       => $b->supplier_id,
                'supplier_name'     => $b->supplier?->supplier_name,
                'supplier'          => $b->supplier,
                'days_to_expiry'    => $today->diffInDays($expiry, false),
            ];

            if ($expiry->lt($today)) {
                $entry['category'] = 'EXPIRED';
                $expired[]  = $entry;
            } elseif ($expiry->lte($in30Days)) {
                $entry['category'] = 'CRITICAL';
                $critical[] = $entry;
            } elseif ($expiry->lte($in90Days)) {
                $entry['category'] = 'NEAR_EXPIRY';
                $nearExpiry[] = $entry;
            } else {
                $entry['category'] = 'GOOD';
                $good[]     = $entry;
            }
        }

        return [
            'summary' => [
                'expired_count'    => count($expired),
                'critical_count'   => count($critical),
                'near_expiry_count'=> count($nearExpiry),
                'good_count'       => count($good),
            ],
            'expired'     => $expired,
            'critical'    => $critical,
            'near_expiry' => $nearExpiry,
        ];
    }

    /**
     * Quarantine a batch (mark as QUARANTINED, deactivate from dispensing).
     */
    public function quarantineBatch(int $hospitalId, int $batchId, int $userId): PharmacyBatch
    {
        $batch = PharmacyBatch::where('hospital_id', $hospitalId)
            ->findOrFail($batchId);

        $batch->update([
            'expiry_status'          => 'QUARANTINED',
            'is_active'              => false,
            'quarantined_at'         => now(),
            'quarantined_by_user_id' => $userId,
        ]);

        StockTransaction::create([
            'hospital_id'          => $hospitalId,
            'hospital_medicine_id' => $batch->hospital_medicine_id,
            'batch_id'             => $batchId,
            'transaction_type'     => 'STOCK_ADJUSTMENT',
            'quantity_in'          => 0,
            'quantity_out'         => 0,
            'balance_after'        => $batch->available_quantity,
            'reference_id'         => 'QUARANTINE-' . $batchId,
            'notes'                => 'Batch quarantined by user #' . $userId,
            'performed_by_user_id' => $userId,
        ]);

        return $batch->fresh();
    }

    /**
     * Generic Salt Substitute Intelligence
     * Finds medicines in the hospital with the same active pharmaceutical salt/generic composition
     */
    public function getGenericSubstitutes(int $hospitalId, array $params): array
    {
        $medicineId = !empty($params['medicine_id']) ? (int) $params['medicine_id'] : null;
        $genericName = !empty($params['generic_name']) ? trim($params['generic_name']) : null;
        $search = !empty($params['search']) ? trim($params['search']) : null;

        $targetMedicine = null;
        if ($medicineId) {
            $targetMedicine = HospitalMedicine::where('hospital_id', $hospitalId)->find($medicineId);
            if ($targetMedicine && empty($genericName)) {
                $genericName = trim($targetMedicine->generic_name ?? '');
            }
        }

        if (empty($genericName) && !empty($search)) {
            $genericName = $search;
        }

        if (empty($genericName) || strlen($genericName) < 2) {
            return [
                'target_medicine' => $targetMedicine,
                'generic_name'    => $genericName ?? '',
                'substitutes'     => [],
                'total_count'     => 0,
            ];
        }

        $like = $this->likeOp();
        $today = now()->toDateString();

        // Match medicines by generic salt
        $medicines = HospitalMedicine::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->where(function ($q) use ($genericName, $like) {
                $q->where('generic_name', $like, "%{$genericName}%");
                $parts = preg_split('/[\+\,\/]/', $genericName);
                if (count($parts) > 1) {
                    foreach ($parts as $p) {
                        $trimmed = trim($p);
                        if (strlen($trimmed) >= 3) {
                            $q->orWhere('generic_name', $like, "%{$trimmed}%");
                        }
                    }
                }
            })
            ->with(['batches' => function ($bq) use ($today) {
                $bq->where('is_active', true)
                   ->where('available_quantity', '>', 0)
                   ->where('expiry_date', '>=', $today)
                   ->orderBy('expiry_date', 'asc'); // FEFO
            }])
            ->get();

        $substitutes = $medicines->map(function ($med) use ($targetMedicine) {
            $activeBatches = $med->batches ?? collect();
            $totalStock = $activeBatches->sum('available_quantity');
            $fefoBatch = $activeBatches->first(); // Earliest valid expiry batch

            $minPrice = $activeBatches->count() > 0 
                ? (float) $activeBatches->min('selling_price') 
                : (float) ($med->default_selling_price ?: $med->mrp);
            $maxPrice = $activeBatches->count() > 0 
                ? (float) $activeBatches->max('selling_price') 
                : (float) ($med->default_selling_price ?: $med->mrp);

            $earliestExpiry = $fefoBatch?->expiry_date;
            $daysToExpiry = null;
            if ($earliestExpiry) {
                $daysToExpiry = (int) now()->startOfDay()->diffInDays(\Carbon\Carbon::parse($earliestExpiry)->startOfDay(), false);
            }

            return [
                'id'                    => $med->id,
                'brand_name'            => $med->brand_name,
                'generic_name'          => $med->generic_name,
                'dosage_form'           => $med->dosage_form,
                'strength'              => $med->strength,
                'manufacturer'          => $med->manufacturer,
                'mrp'                   => (float) $med->mrp,
                'default_selling_price' => (float) $med->default_selling_price,
                'min_price'             => $minPrice,
                'max_price'             => $maxPrice,
                'pack_size'             => $med->pack_size ?? 1,
                'prescription_type'     => $med->prescription_type,
                'total_stock'           => $totalStock,
                'in_stock'              => $totalStock > 0,
                'earliest_expiry'       => $earliestExpiry,
                'days_to_expiry'        => $daysToExpiry,
                'is_current'            => $targetMedicine ? ($med->id === $targetMedicine->id) : false,
                'fefo_batch'            => $fefoBatch,
                'batches'               => $activeBatches,
            ];
        })
        ->sortByDesc('in_stock')
        ->values()
        ->all();

        return [
            'target_medicine' => $targetMedicine,
            'generic_name'    => $genericName,
            'substitutes'     => $substitutes,
            'total_count'     => count($substitutes),
        ];
    }

    /**
     * Patient Past Medication History & 1-Click Refill Intelligence
     */
    public function getPatientMedicationHistory(int $hospitalId, int $patientId): array
    {
        $today = now()->toDateString();

        // 1. Fetch recent sales invoices for this patient
        $sales = PharmacySale::where('hospital_id', $hospitalId)
            ->where('patient_id', $patientId)
            ->with([
                'items.medicine',
                'items.batch',
                'billedByUser:id,name',
            ])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // 2. Aggregate unique medicines purchased previously
        $medicationMap = [];
        foreach ($sales as $sale) {
            foreach ($sale->items as $item) {
                $medId = $item->hospital_medicine_id;
                if (!isset($medicationMap[$medId])) {
                    $medicationMap[$medId] = [
                        'medicine_id'       => $medId,
                        'brand_name'        => $item->medicine?->brand_name ?? 'Medicine',
                        'generic_name'      => $item->medicine?->generic_name,
                        'dosage_form'       => $item->medicine?->dosage_form ?? 'Tablet',
                        'strength'          => $item->medicine?->strength,
                        'prescription_type' => $item->medicine?->prescription_type ?? 'OTC',
                        'pack_size'         => $item->medicine?->pack_size ?? 1,
                        'last_purchased_at' => $sale->created_at?->toIso8601String(),
                        'last_invoice_no'   => $sale->invoice_number,
                        'last_quantity'     => $item->quantity,
                        'last_unit_price'   => (float) $item->unit_price,
                        'purchase_count'    => 1,
                    ];
                } else {
                    $medicationMap[$medId]['purchase_count']++;
                }
            }
        }

        // 3. For each previously purchased medicine, check today's stock and earliest FEFO batch
        $medicationList = [];
        foreach ($medicationMap as $medId => $data) {
            $batches = PharmacyBatch::where('hospital_id', $hospitalId)
                ->where('hospital_medicine_id', $medId)
                ->where('is_active', true)
                ->where('available_quantity', '>', 0)
                ->where('expiry_date', '>=', $today)
                ->orderBy('expiry_date', 'asc') // FEFO
                ->get();

            $totalStock = $batches->sum('available_quantity');
            $fefoBatch = $batches->first();

            $data['current_stock'] = $totalStock;
            $data['in_stock']      = $totalStock > 0;
            $data['fefo_batch']    = $fefoBatch;
            $data['can_refill']    = $totalStock > 0 && $fefoBatch !== null;

            $medicationList[] = $data;
        }

        return [
            'patient_id'    => $patientId,
            'recent_sales'  => $sales,
            'medications'   => $medicationList,
            'total_past_rx' => count($medicationList),
        ];
    }

    /**
     * Statutory Compliance: CDSCO Schedule H / H1 & Narcotic Regulatory Register
     * Generates inspection-ready register under Drugs & Cosmetics Rules 1945 (Form 35 / Rule 65 & 97)
     */
    public function getCdscoRegulatoryRegister(int $hospitalId, array $filters = []): mixed
    {
        $like = $this->likeOp();

        // 1. Build Base Query on PharmacySaleItem where medicine is controlled
        $query = PharmacySaleItem::query()
            ->whereHas('sale', function ($sq) use ($hospitalId) {
                $sq->where('hospital_id', $hospitalId);
            })
            ->whereHas('medicine', function ($mq) {
                $mq->whereIn('prescription_type', ['SCHEDULE_H', 'SCHEDULE_H1', 'NARCOTIC']);
            })
            ->with([
                'sale' => function ($sq) {
                    $sq->with([
                        'patient:id,uhid,name,mobile,address,city,district,state,pincode',
                        'prescription.doctor:id,name,qualification,specialization,hpr_id',
                        'billedByUser:id,name',
                    ]);
                },
                'medicine:id,item_code,brand_name,generic_name,dosage_form,strength,manufacturer,prescription_type,hsn_code,strip_size,box_size',
                'batch:id,batch_number,expiry_date,mrp',
            ]);

        // Filter by Schedule Classification
        if (!empty($filters['schedule_type']) && $filters['schedule_type'] !== 'ALL') {
            $scheduleType = strtoupper(trim($filters['schedule_type']));
            $query->whereHas('medicine', function ($mq) use ($scheduleType) {
                $mq->where('prescription_type', $scheduleType);
            });
        }

        // Filter by Date Range
        if (!empty($filters['start_date'])) {
            $query->whereHas('sale', function ($sq) use ($filters) {
                $sq->whereDate('created_at', '>=', $filters['start_date']);
            });
        }
        if (!empty($filters['end_date'])) {
            $query->whereHas('sale', function ($sq) use ($filters) {
                $sq->whereDate('created_at', '<=', $filters['end_date']);
            });
        }

        // Filter by Keyword Search
        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($search, $like) {
                $q->where('batch_number', $like, $search)
                  ->orWhereHas('medicine', function ($mq) use ($search, $like) {
                      $mq->where('brand_name', $like, $search)
                        ->orWhere('generic_name', $like, $search)
                        ->orWhere('manufacturer', $like, $search);
                  })
                  ->orWhereHas('sale', function ($sq) use ($search, $like) {
                      $sq->where('invoice_number', $like, $search)
                        ->orWhere('customer_name', $like, $search)
                        ->orWhere('customer_phone', $like, $search)
                        ->orWhere('doctor_name', $like, $search)
                        ->orWhere('doctor_reg_no', $like, $search)
                        ->orWhereHas('patient', function ($pq) use ($search, $like) {
                            $pq->where('name', $like, $search)
                              ->orWhere('uhid', $like, $search)
                              ->orWhere('mobile', $like, $search);
                        });
                  });
            });
        }

        // Order chronologically descending (newest dispensing first)
        $query->orderBy('created_at', 'desc');

        // Summary Statistics for compliance audit overview
        $totalItemsCount = (clone $query)->count();
        $h1Count = (clone $query)->whereHas('medicine', fn($mq) => $mq->where('prescription_type', 'SCHEDULE_H1'))->count();
        $hCount = (clone $query)->whereHas('medicine', fn($mq) => $mq->where('prescription_type', 'SCHEDULE_H'))->count();
        $narcoticsCount = (clone $query)->whereHas('medicine', fn($mq) => $mq->where('prescription_type', 'NARCOTIC'))->count();

        // Pagination or Full Export
        $isAll = filter_var($filters['all'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $perPage = !empty($filters['per_page']) ? (int) $filters['per_page'] : 25;
        $items = $isAll ? $query->get() : $query->paginate($perPage);

        // Transform collection to flatten compliance records cleanly
        $transformer = function ($item) {
            $sale = $item->sale;
            $med = $item->medicine;
            $patient = $sale?->patient;
            $doctor = $sale?->prescription?->doctor;

            // Resolve Patient Address
            $patientAddress = null;
            if ($patient) {
                $addressParts = array_filter([
                    $patient->address,
                    $patient->city,
                    $patient->district,
                    $patient->state ? ($patient->pincode ? "{$patient->state} - {$patient->pincode}" : $patient->state) : $patient->pincode,
                ]);
                $patientAddress = !empty($addressParts) ? implode(', ', $addressParts) : null;
            }

            // Resolve Prescribing Doctor Name & Reg No
            $doctorName = $sale?->doctor_name ?: ($doctor?->name ? "Dr. {$doctor->name}" : 'Not Specified');
            $doctorRegNo = $sale?->doctor_reg_no ?: ($doctor?->hpr_id ?: null);
            $doctorSpecialization = $doctor?->specialization ?: $doctor?->qualification;

            return [
                'id'                   => $item->id,
                'sale_id'              => $item->sale_id,
                'invoice_number'       => $sale?->invoice_number,
                'dispensed_at'         => $item->created_at?->toIso8601String(),
                'dispensed_date'       => $item->created_at?->format('Y-m-d'),
                'dispensed_time'       => $item->created_at?->format('H:i A'),
                'sale_type'            => $sale?->sale_type ?? 'WALK_IN',
                
                // Patient Details
                'patient_uhid'         => $patient?->uhid ?: null,
                'patient_name'         => $patient?->name ?: $sale?->customer_name,
                'patient_phone'        => $patient?->mobile ?: $sale?->customer_phone,
                'patient_address'      => $patientAddress ?: 'Local Area / Hospital Counter',
                
                // Doctor Details
                'doctor_name'          => $doctorName,
                'doctor_reg_no'        => $doctorRegNo ?: 'N/A',
                'doctor_qualification' => $doctorSpecialization,
                
                // Drug Details
                'medicine_id'          => $med?->id,
                'brand_name'           => $med?->brand_name,
                'generic_name'         => $med?->generic_name,
                'dosage_form'          => $med?->dosage_form,
                'strength'             => $med?->strength,
                'prescription_type'    => $med?->prescription_type ?? 'SCHEDULE_H',
                'manufacturer'         => $med?->manufacturer ?: 'Standard Pharma',
                'hsn_code'             => $item->hsn_code,
                
                // Batch & Dispensing
                'batch_number'         => $item->batch_number,
                'expiry_date'          => $item->expiry_date?->format('Y-m-d'),
                'quantity'             => (int) $item->quantity,
                'unit_price'           => (float) $item->unit_price,
                'total_amount'         => (float) $item->total_amount,
                
                // Dispensing Pharmacist (Qualified Person under Rule 65)
                'dispensed_by'         => $sale?->billedByUser?->name ?: 'Duty Pharmacist',
                'pharmacist_sign_off'  => 'VERIFIED_DIGITALLY',
            ];
        };

        if ($isAll) {
            $transformedItems = $items->map($transformer);
            return [
                'records' => $transformedItems,
                'summary' => [
                    'total_dispensed' => $totalItemsCount,
                    'schedule_h1'     => $h1Count,
                    'schedule_h'      => $hCount,
                    'narcotics'       => $narcoticsCount,
                ],
            ];
        }

        $items->getCollection()->transform($transformer);

        return [
            'paginated' => $items,
            'summary'   => [
                'total_dispensed' => $totalItemsCount,
                'schedule_h1'     => $h1Count,
                'schedule_h'      => $hCount,
                'narcotics'       => $narcoticsCount,
            ],
        ];
    }

    /**
     * Statutory GST Tax Intelligence & Filing Report (GSTR-3B & Input/Output Tax Ledger)
     */
    public function getGstReport(int $hospitalId, array $filters = []): array
    {
        // 1. Resolve Date Range
        $startDate = $filters['start_date'] ?? now()->startOfMonth()->toDateString();
        $endDate   = $filters['end_date'] ?? now()->toDateString();

        // 2. OUTWARD SUPPLIES (Sales / POS Billing)
        $salesQuery = PharmacySale::where('hospital_id', $hospitalId)
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate);

        $salesCount       = (clone $salesQuery)->count();
        $salesGrossTotal  = (float) (clone $salesQuery)->sum('net_amount');
        $salesTaxable     = (float) (clone $salesQuery)->sum('taxable_amount');
        $salesCgst        = (float) (clone $salesQuery)->sum('cgst_amount');
        $salesSgst        = (float) (clone $salesQuery)->sum('sgst_amount');
        $salesOutputTax   = round($salesCgst + $salesSgst, 2);

        // 3. CUSTOMER SALES RETURNS (Credit Notes - Reversal of Output Tax)
        $custReturnsQuery = PharmacyReturnItem::whereHas('return', function ($q) use ($hospitalId, $startDate, $endDate) {
            $q->where('hospital_id', $hospitalId)
              ->whereDate('created_at', '>=', $startDate)
              ->whereDate('created_at', '<=', $endDate);
        });

        $custReturnsCount   = (clone $custReturnsQuery)->count();
        $custReturnTaxable  = (float) (clone $custReturnsQuery)->sum('taxable_amount_reversed');
        $custReturnCgst     = (float) (clone $custReturnsQuery)->sum('cgst_reversed');
        $custReturnSgst     = (float) (clone $custReturnsQuery)->sum('sgst_reversed');
        $custReturnTaxReversal = round($custReturnCgst + $custReturnSgst, 2);

        // Net Outward Tax Liability (Sales minus Returns)
        $netOutwardTaxable = max(0, round($salesTaxable - $custReturnTaxable, 2));
        $netOutputCgst     = max(0, round($salesCgst - $custReturnCgst, 2));
        $netOutputSgst     = max(0, round($salesSgst - $custReturnSgst, 2));
        $netOutputTax      = round($netOutputCgst + $netOutputSgst, 2);

        // 4. INWARD SUPPLIES (Purchases / GRN from Suppliers - Input Tax Credit ITC)
        $purchasesQuery = PharmacyPurchase::where('hospital_id', $hospitalId)
            ->whereDate('invoice_date', '>=', $startDate)
            ->whereDate('invoice_date', '<=', $endDate);

        $purchasesCount   = (clone $purchasesQuery)->count();
        $purchasesGross   = (float) (clone $purchasesQuery)->sum('net_amount');
        $purchasesTaxable = (float) (clone $purchasesQuery)->sum('taxable_amount');
        $purchasesCgst    = (float) (clone $purchasesQuery)->sum('cgst_amount');
        $purchasesSgst    = (float) (clone $purchasesQuery)->sum('sgst_amount');
        $purchasesIgst    = (float) (clone $purchasesQuery)->sum('igst_amount');
        $purchasesItc     = round($purchasesCgst + $purchasesSgst + $purchasesIgst, 2);

        // 5. SUPPLIER RETURNS (RTV Debit Notes - Reversal of ITC)
        $supplierReturnsQuery = PharmacySupplierReturn::where('hospital_id', $hospitalId)
            ->whereDate('rtv_date', '>=', $startDate)
            ->whereDate('rtv_date', '<=', $endDate);

        $supplierReturnsCount  = (clone $supplierReturnsQuery)->count();
        $supplierReturnsItcRev = (float) (clone $supplierReturnsQuery)->sum('gst_reversal_amount');

        // Net Inward Tax Credit (ITC from Purchases minus Supplier Returns)
        $netItcAvailable = max(0, round($purchasesItc - $supplierReturnsItcRev, 2));

        // 6. NET GST SETTLEMENT (GSTR-3B Formula)
        $netTaxPayable     = max(0, round($netOutputTax - $netItcAvailable, 2));
        $itcCarriedForward = max(0, round($netItcAvailable - $netOutputTax, 2));

        // 7. GST SLAB-WISE BREAKUP (0%, 5%, 12%, 18%, 28%)
        $slabs = [0.0, 5.0, 12.0, 18.0, 28.0];
        $slabBreakdown = [];

        foreach ($slabs as $rate) {
            // Outward sales items for this slab
            $outItems = PharmacySaleItem::whereHas('sale', function ($sq) use ($hospitalId, $startDate, $endDate) {
                $sq->where('hospital_id', $hospitalId)
                   ->whereDate('created_at', '>=', $startDate)
                   ->whereDate('created_at', '<=', $endDate);
            })->where('gst_rate', $rate);

            $outTaxable = (float) (clone $outItems)->sum('taxable_amount');
            $outCgst    = (float) (clone $outItems)->sum('cgst_amount');
            $outSgst    = (float) (clone $outItems)->sum('sgst_amount');
            $outTax     = round($outCgst + $outSgst, 2);

            // Inward purchase items for this slab
            $inItems = PharmacyPurchaseItem::whereHas('purchase', function ($pq) use ($hospitalId, $startDate, $endDate) {
                $pq->where('hospital_id', $hospitalId)
                   ->whereDate('invoice_date', '>=', $startDate)
                   ->whereDate('invoice_date', '<=', $endDate);
            })->where('gst_rate', $rate);

            $inTaxable  = (float) (clone $inItems)->sum('taxable_amount');
            $inCgst     = (float) (clone $inItems)->sum('cgst_amount');
            $inSgst     = (float) (clone $inItems)->sum('sgst_amount');
            $inTax      = round($inCgst + $inSgst, 2);

            $slabBreakdown[] = [
                'gst_rate'           => $rate,
                'slab_label'         => "{$rate}% GST",
                'outward_taxable'    => round($outTaxable, 2),
                'outward_tax'        => $outTax,
                'inward_taxable'     => round($inTaxable, 2),
                'inward_itc'         => $inTax,
                'net_tax'            => round($outTax - $inTax, 2),
            ];
        }

        // 8. Recent Outward Invoices List
        $outwardInvoices = PharmacySale::where('hospital_id', $hospitalId)
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate)
            ->with(['billedByUser:id,name'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(fn($s) => [
                'id'             => $s->id,
                'invoice_number' => $s->invoice_number,
                'invoice_date'   => $s->created_at->format('Y-m-d'),
                'customer_name'  => $s->customer_name,
                'payment_mode'   => $s->payment_mode,
                'taxable_amount' => (float) $s->taxable_amount,
                'cgst_amount'    => (float) $s->cgst_amount,
                'sgst_amount'    => (float) $s->sgst_amount,
                'total_tax'      => round((float) $s->cgst_amount + (float) $s->sgst_amount, 2),
                'net_amount'     => (float) $s->net_amount,
            ]);

        // 9. Recent Inward GRN List
        $inwardPurchases = PharmacyPurchase::where('hospital_id', $hospitalId)
            ->whereDate('invoice_date', '>=', $startDate)
            ->whereDate('invoice_date', '<=', $endDate)
            ->with(['supplier:id,supplier_name,gstin'])
            ->orderBy('invoice_date', 'desc')
            ->limit(50)
            ->get()
            ->map(fn($p) => [
                'id'                  => $p->id,
                'grn_number'          => $p->grn_number,
                'supplier_invoice_no' => $p->supplier_invoice_no,
                'invoice_date'        => $p->invoice_date->format('Y-m-d'),
                'supplier_name'       => $p->supplier?->supplier_name ?: 'Supplier',
                'supplier_gstin'      => $p->supplier?->gstin ?: 'N/A',
                'taxable_amount'      => (float) $p->taxable_amount,
                'cgst_amount'         => (float) $p->cgst_amount,
                'sgst_amount'         => (float) $p->sgst_amount,
                'igst_amount'         => (float) $p->igst_amount,
                'total_itc'           => round((float) $p->cgst_amount + (float) $p->sgst_amount + (float) $p->igst_amount, 2),
                'net_amount'          => (float) $p->net_amount,
            ]);

        return [
            'period' => [
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ],
            'summary' => [
                // Outward
                'sales_count'               => $salesCount,
                'sales_gross_total'         => round($salesGrossTotal, 2),
                'sales_taxable'             => round($salesTaxable, 2),
                'sales_cgst'                => round($salesCgst, 2),
                'sales_sgst'                => round($salesSgst, 2),
                'sales_output_tax'          => $salesOutputTax,
                // Customer Return Reversals
                'cust_returns_count'        => $custReturnsCount,
                'cust_return_taxable'       => round($custReturnTaxable, 2),
                'cust_return_reversal'      => $custReturnTaxReversal,
                // Net Outward
                'net_outward_taxable'       => $netOutwardTaxable,
                'net_output_cgst'           => $netOutputCgst,
                'net_output_sgst'           => $netOutputSgst,
                'net_output_tax'            => $netOutputTax,
                // Inward (ITC)
                'purchases_count'           => $purchasesCount,
                'purchases_gross'           => round($purchasesGross, 2),
                'purchases_taxable'         => round($purchasesTaxable, 2),
                'purchases_cgst'            => round($purchasesCgst, 2),
                'purchases_sgst'            => round($purchasesSgst, 2),
                'purchases_igst'            => round($purchasesIgst, 2),
                'purchases_itc'             => $purchasesItc,
                // Supplier Return ITC Reversal
                'supplier_returns_count'    => $supplierReturnsCount,
                'supplier_returns_reversal' => round($supplierReturnsItcRev, 2),
                'net_itc_available'         => $netItcAvailable,
                // Net Settlement
                'net_gst_payable'           => $netTaxPayable,
                'itc_carried_forward'       => $itcCarriedForward,
            ],
            'slab_breakdown'    => $slabBreakdown,
            'outward_invoices'  => $outwardInvoices,
            'inward_purchases'  => $inwardPurchases,
        ];
    }

    /**
     * IPD Nursing Ward Drug Indents & Requisitions
     */
    public function getWardIndents(int $hospitalId, array $filters = []): mixed
    {
        $query = PharmacyWardIndent::where('hospital_id', $hospitalId)
            ->with([
                'patient:id,uhid,name,gender,dob,mobile',
                'ipdAdmission:id,ipd_number,admission_date,doctor_id',
                'requestedBy:id,name',
                'dispensedBy:id,name',
                'items.medicine',
                'items.batch',
            ])
            ->orderBy('created_at', 'desc');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (!empty($filters['ward_name'])) {
            $query->where('ward_name', $filters['ward_name']);
        }

        if (!empty($filters['ipd_admission_id'])) {
            $query->where('ipd_admission_id', $filters['ipd_admission_id']);
        }

        if (!empty($filters['start_date'])) {
            $query->whereDate('created_at', '>=', $filters['start_date']);
        }

        if (!empty($filters['end_date'])) {
            $query->whereDate('created_at', '<=', $filters['end_date']);
        }

        if (!empty($filters['search'])) {
            $s = trim($filters['search']);
            $query->where(function ($q) use ($s) {
                $q->where('indent_number', $this->likeOp(), "%{$s}%")
                  ->orWhere('ward_name', $this->likeOp(), "%{$s}%")
                  ->orWhere('bed_number', $this->likeOp(), "%{$s}%")
                  ->orWhereHas('patient', function ($pq) use ($s) {
                      $pq->where('name', $this->likeOp(), "%{$s}%")
                         ->orWhere('uhid', $this->likeOp(), "%{$s}%");
                  });
            });
        }

        $perPage = (int) ($filters['per_page'] ?? 20);
        return $query->paginate($perPage);
    }

    public function createWardIndent(int $hospitalId, array $data, int $userId): PharmacyWardIndent
    {
        return DB::transaction(function () use ($hospitalId, $data, $userId) {
            $ipd = IpdAdmission::where('hospital_id', $hospitalId)->findOrFail($data['ipd_admission_id']);
            $patientId = $ipd->patient_id;

            $year   = date('Y');
            $random = strtoupper(substr(uniqid(), -5));
            $indentNumber = "IND-{$year}-{$random}";

            $wardIndent = PharmacyWardIndent::create([
                'hospital_id'          => $hospitalId,
                'indent_number'        => $indentNumber,
                'ipd_admission_id'     => $ipd->id,
                'patient_id'           => $patientId,
                'ward_name'            => $data['ward_name'] ?? 'Inpatient Ward',
                'bed_number'           => $data['bed_number'] ?? 'Bed',
                'priority'             => $data['priority'] ?? 'ROUTINE',
                'status'               => 'PENDING',
                'requested_by_user_id' => $userId,
                'notes'                => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $itemData) {
                $med = HospitalMedicine::where('hospital_id', $hospitalId)->findOrFail($itemData['hospital_medicine_id']);
                
                PharmacyWardIndentItem::create([
                    'ward_indent_id'       => $wardIndent->id,
                    'hospital_medicine_id' => $med->id,
                    'requested_quantity'   => (int) $itemData['requested_quantity'],
                    'dispensed_quantity'   => 0,
                    'returned_quantity'    => 0,
                    'unit_price'           => (float) ($med->default_selling_price ?: $med->mrp),
                    'gst_rate'             => (float) $med->gst_rate,
                    'dosage_instruction'   => $itemData['dosage_instruction'] ?? null,
                    'status'               => 'PENDING',
                ]);
            }

            return $this->showWardIndent($hospitalId, $wardIndent->id);
        });
    }

    public function showWardIndent(int $hospitalId, int $id): PharmacyWardIndent
    {
        return PharmacyWardIndent::where('hospital_id', $hospitalId)
            ->with([
                'patient',
                'ipdAdmission',
                'requestedBy:id,name',
                'dispensedBy:id,name',
                'items.medicine',
                'items.batch',
                'items.billingLedgerItem',
            ])
            ->findOrFail($id);
    }

    public function dispenseWardIndent(int $hospitalId, int $id, array $dispenseData, int $userId): PharmacyWardIndent
    {
        return DB::transaction(function () use ($hospitalId, $id, $dispenseData, $userId) {
            $indent = PharmacyWardIndent::where('hospital_id', $hospitalId)->lockForUpdate()->findOrFail($id);

            if (in_array($indent->status, ['DISPENSED', 'REJECTED'])) {
                throw new \Exception("Indent {$indent->indent_number} is already {$indent->status}");
            }

            $itemsPayload = $dispenseData['items'] ?? [];
            $itemsMap     = collect($itemsPayload)->keyBy('item_id');

            $totalTaxable = 0.0;
            $totalTax     = 0.0;
            $totalAmount  = 0.0;
            $allDispensed = true;
            $anyDispensed = false;

            foreach ($indent->items as $item) {
                $payloadItem = $itemsMap->get($item->id);
                $reqQty      = $item->requested_quantity;
                $dispenseQty = $payloadItem ? (int) ($payloadItem['dispensed_quantity'] ?? $reqQty) : $reqQty;

                if ($dispenseQty <= 0) {
                    $item->update(['status' => 'OUT_OF_STOCK']);
                    $allDispensed = false;
                    continue;
                }

                // Resolve batch: specified or FEFO
                $batchId = $payloadItem['batch_id'] ?? null;
                $batchQuery = PharmacyBatch::where('hospital_id', $hospitalId)
                    ->where('hospital_medicine_id', $item->hospital_medicine_id)
                    ->where('is_active', true)
                    ->where('available_quantity', '>', 0)
                    ->where('expiry_date', '>=', now()->toDateString())
                    ->where('expiry_status', '!=', 'QUARANTINED');

                if ($batchId) {
                    $batch = (clone $batchQuery)->where('id', $batchId)->lockForUpdate()->first();
                } else {
                    $batch = (clone $batchQuery)->orderBy('expiry_date', 'asc')->lockForUpdate()->first();
                }

                if (!$batch || $batch->available_quantity <= 0) {
                    $item->update(['status' => 'OUT_OF_STOCK']);
                    $allDispensed = false;
                    continue;
                }

                $actualQty = min($dispenseQty, $batch->available_quantity);
                if ($actualQty < $dispenseQty) {
                    $allDispensed = false;
                }

                // Decrement stock
                $batch->decrement('available_quantity', $actualQty);

                // Stock transaction
                StockTransaction::create([
                    'hospital_id'          => $hospitalId,
                    'hospital_medicine_id' => $item->hospital_medicine_id,
                    'batch_id'             => $batch->id,
                    'transaction_type'     => 'SALE_DISPENSE',
                    'quantity'             => -$actualQty,
                    'reference_id'         => $indent->id,
                    'reference_type'       => 'WARD_INDENT',
                    'notes'                => "Dispensed for Indent {$indent->indent_number} (Bed: {$indent->bed_number})",
                    'performed_by_user_id' => $userId,
                ]);

                // Pricing calculation (Retail Tax Inclusive)
                $unitPrice = (float) ($batch->selling_price > 0 ? $batch->selling_price : $batch->mrp);
                $gstRate   = (float) ($item->medicine->gst_rate ?? 12);
                $grossLine = round($unitPrice * $actualQty, 2);
                $taxableLine = round($grossLine / (1 + ($gstRate / 100)), 2);
                $taxLine     = round($grossLine - $taxableLine, 2);

                // Post to IPD Billing Ledger
                $ledgerItem = BillingLedgerItem::create([
                    'hospital_id'        => $hospitalId,
                    'patient_id'         => $indent->patient_id,
                    'encounter_type'     => 'ipd',
                    'encounter_id'       => $indent->ipd_admission_id,
                    'category'           => 'pharmacy',
                    'item_name'          => "{$item->medicine->brand_name} (Batch: {$batch->batch_number})",
                    'unit_price'         => $unitPrice,
                    'quantity'           => $actualQty,
                    'tax_amount'         => $taxLine,
                    'discount_amount'    => 0.00,
                    'total_amount'       => $grossLine,
                    'charged_at'         => now(),
                    'charged_by_user_id' => $userId,
                    'auto_generated'     => true,
                    'notes'              => "Ward Indent: {$indent->indent_number}",
                    'status'             => 'unbilled',
                ]);

                $item->update([
                    'batch_id'               => $batch->id,
                    'dispensed_quantity'     => $actualQty,
                    'unit_price'             => $unitPrice,
                    'gst_rate'               => $gstRate,
                    'taxable_amount'         => $taxableLine,
                    'tax_amount'             => $taxLine,
                    'total_amount'           => $grossLine,
                    'billing_ledger_item_id' => $ledgerItem->id,
                    'status'                 => 'DISPENSED',
                ]);

                $totalTaxable += $taxableLine;
                $totalTax     += $taxLine;
                $totalAmount  += $grossLine;
                $anyDispensed  = true;
            }

            $indentStatus = $allDispensed ? 'DISPENSED' : ($anyDispensed ? 'PARTIALLY_DISPENSED' : 'PENDING');

            $indent->update([
                'dispensed_by_user_id' => $userId,
                'dispensed_at'         => now(),
                'status'               => $indentStatus,
                'total_taxable'        => round($totalTaxable, 2),
                'total_tax'            => round($totalTax, 2),
                'total_amount'         => round($totalAmount, 2),
            ]);

            return $this->showWardIndent($hospitalId, $indent->id);
        });
    }

    public function rejectWardIndent(int $hospitalId, int $id, string $reason, int $userId): PharmacyWardIndent
    {
        $indent = PharmacyWardIndent::where('hospital_id', $hospitalId)->findOrFail($id);
        $indent->update([
            'status'           => 'REJECTED',
            'rejection_reason' => $reason,
        ]);
        $indent->items()->update(['status' => 'REJECTED']);

        return $this->showWardIndent($hospitalId, $id);
    }

    public function returnWardIndentItem(int $hospitalId, int $indentId, int $itemId, int $returnQuantity, int $userId): PharmacyWardIndent
    {
        return DB::transaction(function () use ($hospitalId, $indentId, $itemId, $returnQuantity, $userId) {
            $indent = PharmacyWardIndent::where('hospital_id', $hospitalId)->findOrFail($indentId);
            $item   = PharmacyWardIndentItem::where('ward_indent_id', $indent->id)->findOrFail($itemId);

            $availableToReturn = $item->dispensed_quantity - $item->returned_quantity;
            if ($returnQuantity <= 0 || $returnQuantity > $availableToReturn) {
                throw new \Exception("Cannot return {$returnQuantity}. Max returnable quantity is {$availableToReturn}");
            }

            // Restore batch stock
            if ($item->batch_id) {
                $batch = PharmacyBatch::where('hospital_id', $hospitalId)->find($item->batch_id);
                if ($batch) {
                    $batch->increment('available_quantity', $returnQuantity);

                    StockTransaction::create([
                        'hospital_id'          => $hospitalId,
                        'hospital_medicine_id' => $item->hospital_medicine_id,
                        'batch_id'             => $batch->id,
                        'transaction_type'     => 'CUSTOMER_RETURN',
                        'quantity'             => $returnQuantity,
                        'reference_id'         => $indent->id,
                        'reference_type'       => 'WARD_INDENT_RETURN',
                        'notes'                => "Returned from Ward Indent {$indent->indent_number}",
                        'performed_by_user_id' => $userId,
                    ]);
                }
            }

            // Update item returned quantity
            $newReturnedQty = $item->returned_quantity + $returnQuantity;
            $newStatus      = ($newReturnedQty >= $item->dispensed_quantity) ? 'RETURNED' : 'DISPENSED';
            $item->update([
                'returned_quantity' => $newReturnedQty,
                'status'            => $newStatus,
            ]);

            // Reversal on IPD Billing Ledger
            if ($item->billing_ledger_item_id) {
                $ledgerItem = BillingLedgerItem::find($item->billing_ledger_item_id);
                if ($ledgerItem) {
                    if ($newReturnedQty >= $item->dispensed_quantity && $ledgerItem->status === 'unbilled') {
                        $ledgerItem->update(['status' => 'cancelled', 'notes' => 'Full return from ward indent']);
                    } else if ($ledgerItem->status === 'unbilled') {
                        $remainingQty = $item->dispensed_quantity - $newReturnedQty;
                        $unitPrice    = (float) $ledgerItem->unit_price;
                        $newTotal     = round($remainingQty * $unitPrice, 2);
                        $ledgerItem->update([
                            'quantity'     => $remainingQty,
                            'total_amount' => $newTotal,
                            'notes'        => "Adjusted for {$returnQuantity} returned items",
                        ]);
                    }
                }
            }

            return $this->showWardIndent($hospitalId, $indent->id);
        });
    }

    /**
     * Low Stock Intelligence & Purchase Orders (PO)
     */
    public function getLowStockAlerts(int $hospitalId): array
    {
        $medicines = HospitalMedicine::where('hospital_id', $hospitalId)
            ->with(['activeBatches'])
            ->get();

        $alerts = [];
        foreach ($medicines as $med) {
            $currentStock = (int) $med->activeBatches
                ->where('expiry_date', '>=', now()->toDateString())
                ->where('expiry_status', '!=', 'QUARANTINED')
                ->sum('available_quantity');

            $minLevel = (int) ($med->min_reorder_level ?: 10);

            if ($currentStock <= $minLevel) {
                $stripSize = (int) ($med->strip_size ?: 1);
                $packSize  = (int) ($med->pack_size ?: 1);
                $packRatio = max(1, $stripSize * $packSize);

                $deficitUnits = max(0, $minLevel - $currentStock);
                $suggestedPacks = max(1, (int) ceil(($deficitUnits + $minLevel) / $packRatio));

                // Find last supplier from recent purchase
                $lastPurchaseItem = PharmacyPurchaseItem::where('hospital_medicine_id', $med->id)
                    ->whereHas('purchase', fn($q) => $q->where('hospital_id', $hospitalId))
                    ->with('purchase.supplier:id,supplier_name,phone,gstin')
                    ->latest('id')
                    ->first();

                $alerts[] = [
                    'medicine_id'          => $med->id,
                    'brand_name'           => $med->brand_name,
                    'generic_name'         => $med->generic_name,
                    'dosage_form'          => $med->dosage_form,
                    'base_unit'            => $med->base_unit ?: 'Tab',
                    'strip_size'           => $stripSize,
                    'pack_size'            => $packSize,
                    'current_stock_units'  => $currentStock,
                    'current_stock_packs'  => floor($currentStock / $packRatio),
                    'min_reorder_level'    => $minLevel,
                    'deficit_units'        => $deficitUnits,
                    'suggested_packs'      => $suggestedPacks,
                    'default_purchase_rate'=> (float) $med->default_purchase_price,
                    'mrp'                  => (float) $med->mrp,
                    'gst_rate'             => (float) $med->gst_rate,
                    'preferred_supplier'   => $lastPurchaseItem?->purchase?->supplier ?: null,
                ];
            }
        }

        // Sort by highest deficit first
        usort($alerts, fn($a, $b) => $b['deficit_units'] <=> $a['deficit_units']);

        return [
            'total_low_stock_count' => count($alerts),
            'items'                 => $alerts,
        ];
    }

    public function getPurchaseOrders(int $hospitalId, array $filters = []): mixed
    {
        $query = PharmacyPurchaseOrder::where('hospital_id', $hospitalId)
            ->with([
                'supplier:id,supplier_name,contact_person,phone,email,gstin',
                'items.medicine',
                'createdBy:id,name',
                'approvedBy:id,name',
            ])
            ->orderBy('created_at', 'desc');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['start_date'])) {
            $query->whereDate('po_date', '>=', $filters['start_date']);
        }

        if (!empty($filters['end_date'])) {
            $query->whereDate('po_date', '<=', $filters['end_date']);
        }

        if (!empty($filters['search'])) {
            $s = trim($filters['search']);
            $query->where(function ($q) use ($s) {
                $q->where('po_number', $this->likeOp(), "%{$s}%")
                  ->orWhereHas('supplier', function ($sq) use ($s) {
                      $sq->where('supplier_name', $this->likeOp(), "%{$s}%")
                         ->orWhere('gstin', $this->likeOp(), "%{$s}%");
                  });
            });
        }

        $perPage = (int) ($filters['per_page'] ?? 20);
        return $query->paginate($perPage);
    }

    public function createPurchaseOrder(int $hospitalId, array $data, int $userId): PharmacyPurchaseOrder
    {
        return DB::transaction(function () use ($hospitalId, $data, $userId) {
            $year   = date('Y');
            $random = strtoupper(substr(uniqid(), -5));
            $poNumber = "PO-{$year}-{$random}";

            $po = PharmacyPurchaseOrder::create([
                'hospital_id'            => $hospitalId,
                'po_number'              => $poNumber,
                'supplier_id'            => (int) $data['supplier_id'],
                'po_date'                => $data['po_date'] ?? now()->toDateString(),
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'status'                 => $data['status'] ?? 'ORDERED',
                'notes'                  => $data['notes'] ?? null,
                'created_by_user_id'     => $userId,
            ]);

            $subtotalAmount = 0.0;
            $discountAmount = 0.0;
            $taxableAmount  = 0.0;
            $taxAmount      = 0.0;
            $netAmount      = 0.0;

            foreach ($data['items'] as $itemData) {
                $med = HospitalMedicine::where('hospital_id', $hospitalId)->findOrFail($itemData['hospital_medicine_id']);

                $packQty   = max(1, (int) $itemData['pack_quantity']);
                $stripSize = max(1, (int) ($itemData['strip_size'] ?? $med->strip_size ?: 1));
                $packSize  = max(1, (int) ($itemData['pack_size'] ?? $med->pack_size ?: 1));
                $totalUnits= $packQty * $packSize * $stripSize;

                $packRate  = (float) ($itemData['pack_purchase_rate'] ?? ($med->default_purchase_price * $packSize * $stripSize));
                $unitPrice = round($packRate / ($packSize * $stripSize), 4);
                $discPct   = (float) ($itemData['discount_percent'] ?? 0);
                $gstRate   = (float) ($itemData['gst_rate'] ?? $med->gst_rate ?: 12);

                $itemSubtotal = round($packQty * $packRate, 2);
                $itemDiscount = round(($itemSubtotal * $discPct) / 100, 2);
                $itemTaxable  = round($itemSubtotal - $itemDiscount, 2);
                $itemTax      = round(($itemTaxable * $gstRate) / 100, 2);
                $itemCgst     = round($itemTax / 2, 2);
                $itemSgst     = round($itemTax - $itemCgst, 2);
                $itemTotal    = round($itemTaxable + $itemTax, 2);

                PharmacyPurchaseOrderItem::create([
                    'purchase_order_id'    => $po->id,
                    'hospital_medicine_id' => $med->id,
                    'pack_quantity'        => $packQty,
                    'strip_size'           => $stripSize,
                    'pack_size'            => $packSize,
                    'total_loose_units'    => $totalUnits,
                    'pack_purchase_rate'   => $packRate,
                    'unit_purchase_price'  => $unitPrice,
                    'discount_percent'     => $discPct,
                    'gst_rate'             => $gstRate,
                    'taxable_amount'       => $itemTaxable,
                    'cgst_amount'          => $itemCgst,
                    'sgst_amount'          => $itemSgst,
                    'total_amount'         => $itemTotal,
                    'received_quantity'    => 0,
                    'status'               => 'PENDING',
                ]);

                $subtotalAmount += $itemSubtotal;
                $discountAmount += $itemDiscount;
                $taxableAmount  += $itemTaxable;
                $taxAmount      += $itemTax;
                $netAmount      += $itemTotal;
            }

            $po->update([
                'total_items_count' => count($data['items']),
                'subtotal_amount'   => round($subtotalAmount, 2),
                'discount_amount'   => round($discountAmount, 2),
                'taxable_amount'    => round($taxableAmount, 2),
                'tax_amount'        => round($taxAmount, 2),
                'net_amount'        => round($netAmount, 2),
            ]);

            return $this->showPurchaseOrder($hospitalId, $po->id);
        });
    }

    public function showPurchaseOrder(int $hospitalId, int $id): PharmacyPurchaseOrder
    {
        return PharmacyPurchaseOrder::where('hospital_id', $hospitalId)
            ->with([
                'supplier',
                'items.medicine',
                'createdBy:id,name',
                'approvedBy:id,name',
                'purchases',
            ])
            ->findOrFail($id);
    }

    public function updatePurchaseOrderStatus(int $hospitalId, int $id, string $status, int $userId): PharmacyPurchaseOrder
    {
        $po = PharmacyPurchaseOrder::where('hospital_id', $hospitalId)->findOrFail($id);
        $po->update([
            'status' => $status,
            'approved_by_user_id' => $userId,
        ]);
        return $this->showPurchaseOrder($hospitalId, $id);
    }
}


