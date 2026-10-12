<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PharmacyReturnItem extends Model
{
    use HasFactory;

    protected $table = 'pharmacy_return_items';

    protected $fillable = [
        'return_id',
        'sale_item_id',
        'hospital_medicine_id',
        'batch_id',
        'quantity_returned',
        'unit_price',
        'taxable_amount_reversed',
        'cgst_reversed',
        'sgst_reversed',
        'net_refund_amount',
    ];

    protected $casts = [
        'quantity_returned'       => 'integer',
        'unit_price'              => 'float',
        'taxable_amount_reversed' => 'float',
        'cgst_reversed'           => 'float',
        'sgst_reversed'           => 'float',
        'net_refund_amount'       => 'float',
    ];

    public function return()
    {
        return $this->belongsTo(PharmacyReturn::class, 'return_id');
    }

    public function saleItem()
    {
        return $this->belongsTo(PharmacySaleItem::class, 'sale_item_id');
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
