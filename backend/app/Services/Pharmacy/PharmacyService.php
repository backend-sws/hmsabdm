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

        $medicine->update($data);
        return $medicine->fresh();
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

                $lineSubtotal = $quantity * $unitPrice;
                $lineDiscount = $lineSubtotal * ($discountPct / 100);
                $lineTaxable  = max(0, $lineSubtotal - $lineDiscount);

                $lineCgst     = $lineTaxable * ($gstRate / 200);
                $lineSgst     = $lineTaxable * ($gstRate / 200);
                $lineTotal    = $lineTaxable + $lineCgst + $lineSgst;

                $subtotalAmount += $lineSubtotal;
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

            $grossTotal = $taxableAmount + $cgstAmount + $sgstAmount;
            $netTotal   = round($grossTotal);
            $roundOff   = round($netTotal - $grossTotal, 2);

            $paymentMode   = $data['payment_mode'] ?? 'CASH';
            $paymentStatus = $paymentMode === 'IPD_LEDGER' ? 'CHARGED_TO_IPD' : 'PAID';

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
            ->with(['patient:id,uhid,first_name,last_name,phone', 'billedByUser:id,name'])
            ->withCount('items');

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
}

