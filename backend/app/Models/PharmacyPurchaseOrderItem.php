<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PharmacyPurchaseOrderItem extends Model
{
    use HasFactory;

    protected $table = 'pharmacy_purchase_order_items';

    protected $fillable = [
        'purchase_order_id',
        'hospital_medicine_id',
        'pack_quantity',
        'strip_size',
        'pack_size',
        'total_loose_units',
        'pack_purchase_rate',
        'unit_purchase_price',
        'discount_percent',
        'gst_rate',
        'taxable_amount',
        'cgst_amount',
        'sgst_amount',
        'total_amount',
        'received_quantity',
        'status',
    ];

    protected $casts = [
        'pack_quantity'       => 'integer',
        'strip_size'          => 'integer',
        'pack_size'           => 'integer',
        'total_loose_units'   => 'integer',
        'pack_purchase_rate'  => 'float',
        'unit_purchase_price' => 'float',
        'discount_percent'    => 'float',
        'gst_rate'            => 'float',
        'taxable_amount'      => 'float',
        'cgst_amount'         => 'float',
        'sgst_amount'         => 'float',
        'total_amount'        => 'float',
        'received_quantity'   => 'integer',
    ];

    public function purchaseOrder()
    {
        return $this->belongsTo(PharmacyPurchaseOrder::class, 'purchase_order_id');
    }

    public function medicine()
    {
        return $this->belongsTo(HospitalMedicine::class, 'hospital_medicine_id');
    }
}
