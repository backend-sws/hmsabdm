<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PharmacyWardIndentItem extends Model
{
    use HasFactory;

    protected $table = 'pharmacy_ward_indent_items';

    protected $fillable = [
        'ward_indent_id',
        'hospital_medicine_id',
        'batch_id',
        'requested_quantity',
        'dispensed_quantity',
        'returned_quantity',
        'unit_price',
        'gst_rate',
        'taxable_amount',
        'tax_amount',
        'total_amount',
        'dosage_instruction',
        'billing_ledger_item_id',
        'status',
    ];

    protected $casts = [
        'requested_quantity' => 'integer',
        'dispensed_quantity' => 'integer',
        'returned_quantity'  => 'integer',
        'unit_price'         => 'float',
        'gst_rate'           => 'float',
        'taxable_amount'     => 'float',
        'tax_amount'         => 'float',
        'total_amount'       => 'float',
    ];

    public function indent()
    {
        return $this->belongsTo(PharmacyWardIndent::class, 'ward_indent_id');
    }

    public function medicine()
    {
        return $this->belongsTo(HospitalMedicine::class, 'hospital_medicine_id');
    }

    public function batch()
    {
        return $this->belongsTo(PharmacyBatch::class, 'batch_id');
    }

    public function billingLedgerItem()
    {
        return $this->belongsTo(BillingLedgerItem::class, 'billing_ledger_item_id');
    }
}
