<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PharmacyPurchaseItem extends Model
{
    use HasFactory;

    protected $table = 'pharmacy_purchase_items';

    protected $fillable = [
        'purchase_id',
        'hospital_medicine_id',
        'batch_id',
        'batch_number',
        'mfg_date',
        'expiry_date',
        'pack_size',
        'pack_quantity',
        'free_pack_quantity',
        'total_unit_quantity',
        'purchase_rate_per_unit',
        'discount_percent',
        'gst_rate',
        'unit_mrp',
        'selling_price_per_unit',
        'taxable_amount',
        'cgst_amount',
        'sgst_amount',
        'total_amount',
    ];

    protected $casts = [
        'mfg_date'               => 'date',
        'expiry_date'            => 'date',
        'pack_size'              => 'integer',
        'pack_quantity'          => 'integer',
        'free_pack_quantity'     => 'integer',
        'total_unit_quantity'    => 'integer',
        'purchase_rate_per_unit' => 'float',
        'discount_percent'       => 'float',
        'gst_rate'               => 'float',
        'unit_mrp'               => 'float',
        'selling_price_per_unit' => 'float',
        'taxable_amount'         => 'float',
        'cgst_amount'            => 'float',
        'sgst_amount'            => 'float',
        'total_amount'           => 'float',
    ];

    public function purchase()
    {
        return $this->belongsTo(PharmacyPurchase::class, 'purchase_id');
    }

    public function medicine()
    {
        return $this->belongsTo(HospitalMedicine::class, 'hospital_medicine_id');
    }

    public function batch()
    {
        return $this->belongsTo(PharmacyBatch::class, 'batch_id');
    }
}
