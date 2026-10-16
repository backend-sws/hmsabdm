<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class PharmacyPurchaseOrder extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'pharmacy_purchase_orders';

    protected $fillable = [
        'hospital_id',
        'po_number',
        'supplier_id',
        'po_date',
        'expected_delivery_date',
        'status',
        'total_items_count',
        'subtotal_amount',
        'discount_amount',
        'taxable_amount',
        'tax_amount',
        'net_amount',
        'notes',
        'created_by_user_id',
        'approved_by_user_id',
    ];

    protected $casts = [
        'po_date'                => 'date',
        'expected_delivery_date' => 'date',
        'total_items_count'      => 'integer',
        'subtotal_amount'        => 'float',
        'discount_amount'        => 'float',
        'taxable_amount'         => 'float',
        'tax_amount'             => 'float',
        'net_amount'             => 'float',
    ];

    public function supplier()
    {
        return $this->belongsTo(PharmacySupplier::class, 'supplier_id');
    }

    public function items()
    {
        return $this->hasMany(PharmacyPurchaseOrderItem::class, 'purchase_order_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function purchases()
    {
        return $this->hasMany(PharmacyPurchase::class, 'purchase_order_id');
    }
}
