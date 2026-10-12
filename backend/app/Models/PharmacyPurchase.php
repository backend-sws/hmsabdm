<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class PharmacyPurchase extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'pharmacy_purchases';

    protected $fillable = [
        'hospital_id',
        'supplier_id',
        'grn_number',
        'supplier_invoice_no',
        'invoice_date',
        'received_date',
        'subtotal_amount',
        'discount_amount',
        'taxable_amount',
        'cgst_amount',
        'sgst_amount',
        'igst_amount',
        'round_off',
        'net_amount',
        'payment_status',
        'paid_amount',
        'notes',
        'received_by_user_id',
    ];

    protected $casts = [
        'invoice_date'    => 'date',
        'received_date'   => 'date',
        'subtotal_amount' => 'float',
        'discount_amount' => 'float',
        'taxable_amount'  => 'float',
        'cgst_amount'     => 'float',
        'sgst_amount'     => 'float',
        'igst_amount'     => 'float',
        'round_off'       => 'float',
        'net_amount'      => 'float',
        'paid_amount'     => 'float',
    ];

    protected static function booted()
    {
        static::creating(function (PharmacyPurchase $purchase) {
            if (empty($purchase->grn_number)) {
                $year = date('Y');
                $random = strtoupper(substr(uniqid(), -5));
                $purchase->grn_number = "GRN-{$year}-{$random}";
            }
        });
    }

    public function supplier()
    {
        return $this->belongsTo(PharmacySupplier::class, 'supplier_id');
    }

    public function items()
    {
        return $this->hasMany(PharmacyPurchaseItem::class, 'purchase_id');
    }

    public function receivedByUser()
    {
        return $this->belongsTo(User::class, 'received_by_user_id');
    }
}
