<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PharmacySupplierReturnItem extends Model
{
    use HasFactory;

    protected $table = 'pharmacy_supplier_return_items';

    protected $fillable = [
        'supplier_return_id',
        'hospital_medicine_id',
        'batch_id',
        'batch_number',
        'expiry_date',
        'quantity_returned',
        'purchase_rate',
        'line_total',
    ];

    protected $casts = [
        'expiry_date'       => 'date',
        'quantity_returned' => 'integer',
        'purchase_rate'     => 'float',
        'line_total'        => 'float',
    ];

    public function supplierReturn()
    {
        return $this->belongsTo(PharmacySupplierReturn::class, 'supplier_return_id');
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
