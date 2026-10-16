<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PharmacySaleItem extends Model
{
    use HasFactory;

    protected $table = 'pharmacy_sale_items';

    protected $fillable = [
        'sale_id',
        'hospital_medicine_id',
        'batch_id',
        'batch_number',
        'expiry_date',
        'hsn_code',
        'quantity',
        'unit_mrp',
        'unit_price',
        'discount_percent',
        'taxable_amount',
        'gst_rate',
        'cgst_amount',
        'sgst_amount',
        'total_amount',
        'returned_quantity',
    ];

    protected $casts = [
        'expiry_date'       => 'date',
        'quantity'          => 'integer',
        'unit_mrp'          => 'float',
        'unit_price'        => 'float',
        'discount_percent'  => 'float',
        'taxable_amount'    => 'float',
        'gst_rate'          => 'float',
        'cgst_amount'       => 'float',
        'sgst_amount'       => 'float',
        'total_amount'      => 'float',
        'returned_quantity' => 'integer',
    ];

    public function sale()
    {
        return $this->belongsTo(PharmacySale::class, 'sale_id');
    }

    public function medicine()
    {
        return $this->belongsTo(HospitalMedicine::class, 'hospital_medicine_id');
    }

    public function batch()
    {
        return $this->belongsTo(PharmacyBatch::class, 'batch_id');
    }

    public function getReturnableQuantityAttribute(): int
    {
        return max(0, $this->quantity - $this->returned_quantity);
    }
}
