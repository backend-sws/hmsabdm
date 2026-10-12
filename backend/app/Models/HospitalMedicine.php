<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class HospitalMedicine extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'hospital_medicines';

    protected $fillable = [
        'hospital_id',
        'master_medicine_id',
        'item_code',
        'brand_name',
        'generic_name',
        'dosage_form',
        'strength',
        'manufacturer',
        'default_purchase_price',
        'default_selling_price',
        'mrp',
        'hsn_code',
        'gst_rate',
        'rack_location',
        'min_reorder_level',
        'max_stock_level',
        'strip_size',
        'box_size',
        'base_unit',
        'reorder_unit',
        'prescription_type',
        'is_active',
    ];

    protected $casts = [
        'default_purchase_price' => 'float',
        'default_selling_price'  => 'float',
        'mrp'                    => 'float',
        'gst_rate'               => 'float',
        'min_reorder_level'      => 'integer',
        'max_stock_level'        => 'integer',
        'strip_size'             => 'integer',
        'box_size'               => 'integer',
        'is_active'              => 'boolean',
    ];

    protected $appends = [
        'total_stock',
        'package_type',
        'pack_size',
        'unit_name',
        'packaging_summary',
        'stock_breakdown',
    ];

    public function masterMedicine()
    {
        return $this->belongsTo(MedicineMaster::class, 'master_medicine_id');
    }

    public function batches()
    {
        return $this->hasMany(PharmacyBatch::class, 'hospital_medicine_id');
    }

    public function activeBatches()
    {
        return $this->hasMany(PharmacyBatch::class, 'hospital_medicine_id')
            ->where('is_active', true)
            ->where('available_quantity', '>', 0)
            ->where('expiry_date', '>=', now()->toDateString())
            ->orderBy('expiry_date', 'asc'); // FEFO order
    }

    public function stockTransactions()
    {
        return $this->hasMany(StockTransaction::class, 'hospital_medicine_id');
    }

    /**
     * Total stock across all active, non-expired batches
     */
    public function getTotalStockAttribute(): int
    {
        if (array_key_exists('total_stock', $this->attributes) && $this->attributes['total_stock'] !== null) {
            return (int) $this->attributes['total_stock'];
        }

        if ($this->relationLoaded('activeBatches')) {
            return (int) $this->activeBatches->sum('available_quantity');
        }

        return (int) $this->batches()
            ->where('is_active', true)
            ->where('expiry_date', '>=', now()->toDateString())
            ->sum('available_quantity');
    }

    /**
     * Packaging type (Strip, Bottle, Vial, Tube, Sachet)
     */
    public function getPackageTypeAttribute(): string
    {
        if (!empty($this->attributes['package_type'])) {
            return $this->attributes['package_type'];
        }

        $form = strtolower($this->dosage_form ?? 'tablet');
        if (str_contains($form, 'tablet') || str_contains($form, 'capsule')) {
            return 'Strip';
        }
        if (str_contains($form, 'syrup') || str_contains($form, 'suspension') || str_contains($form, 'drops') || str_contains($form, 'solution') || str_contains($form, 'liquid')) {
            return 'Bottle';
        }
        if (str_contains($form, 'injection') || str_contains($form, 'iv') || str_contains($form, 'fluid')) {
            return 'Vial / Ampoule';
        }
        if (str_contains($form, 'ointment') || str_contains($form, 'cream') || str_contains($form, 'gel')) {
            return 'Tube';
        }
        if (str_contains($form, 'sachet') || str_contains($form, 'powder')) {
            return 'Sachet';
        }

        return 'Pack';
    }

    /**
     * Individual unit name (Tabs, Caps, Bottles, Vials, Tubes, etc.)
     */
    public function getUnitNameAttribute(): string
    {
        if (!empty($this->base_unit)) {
            return $this->base_unit;
        }

        $form = strtolower($this->dosage_form ?? 'tablet');
        if (str_contains($form, 'tablet')) {
            return 'Tabs';
        }
        if (str_contains($form, 'capsule')) {
            return 'Caps';
        }
        if (str_contains($form, 'syrup') || str_contains($form, 'suspension') || str_contains($form, 'drops') || str_contains($form, 'solution')) {
            return 'Bottles';
        }
        if (str_contains($form, 'injection') || str_contains($form, 'iv') || str_contains($form, 'fluid')) {
            return 'Vials';
        }
        if (str_contains($form, 'ointment') || str_contains($form, 'cream') || str_contains($form, 'gel')) {
            return 'Tubes';
        }
        if (str_contains($form, 'sachet') || str_contains($form, 'powder')) {
            return 'Sachets';
        }

        return 'Units';
    }

    /**
     * Units per pack (e.g. 10 tabs per strip, 1 bottle per pack)
     */
    public function getPackSizeAttribute(): int
    {
        if (!empty($this->strip_size)) {
            return (int) $this->strip_size;
        }

        if (!empty($this->attributes['pack_size'])) {
            return (int) $this->attributes['pack_size'];
        }

        $form = strtolower($this->dosage_form ?? 'tablet');
        if (str_contains($form, 'tablet') || str_contains($form, 'capsule')) {
            return 10;
        }

        return 1;
    }

    /**
     * Formatted packaging summary (e.g. "1 Strip = 10 Tabs" or "1 Bottle")
     */
    public function getPackagingSummaryAttribute(): string
    {
        $packType = $this->package_type;
        $packSize = $this->pack_size;
        $unitName = $this->unit_name;

        if ($packSize > 1) {
            return "1 {$packType} = {$packSize} {$unitName}";
        }

        return "1 {$packType}";
    }

    /**
     * Detailed stock breakdown in packs and loose units
     */
    public function getStockBreakdownAttribute(): array
    {
        $total = $this->total_stock;
        $packSize = $this->pack_size;
        $packType = $this->package_type;
        $unitName = $this->unit_name;

        if ($packSize > 1) {
            $packs = intdiv($total, $packSize);
            $loose = $total % $packSize;

            if ($total === 0) {
                $text = "0 {$unitName}";
            } elseif ($packs > 0 && $loose > 0) {
                $text = "{$packs} {$packType} + {$loose} {$unitName} ({$total} Total)";
            } elseif ($packs > 0 && $loose === 0) {
                $text = "{$packs} {$packType}s ({$total} {$unitName})";
            } else {
                $text = "{$loose} Loose {$unitName}";
            }

            return [
                'total_units' => $total,
                'packs'       => $packs,
                'loose_units' => $loose,
                'pack_type'   => $packType,
                'unit_name'   => $unitName,
                'pack_size'   => $packSize,
                'formatted'   => $text,
            ];
        }

        $formatted = "{$total} " . ($total === 1 ? rtrim($unitName, 's') : $unitName);

        return [
            'total_units' => $total,
            'packs'       => $total,
            'loose_units' => 0,
            'pack_type'   => $packType,
            'unit_name'   => $unitName,
            'pack_size'   => 1,
            'formatted'   => $formatted,
        ];
    }
}
