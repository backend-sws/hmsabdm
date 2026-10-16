<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class PharmacySupplierPayment extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'pharmacy_supplier_payments';

    protected $fillable = [
        'hospital_id',
        'supplier_id',
        'purchase_id',
        'payment_number',
        'payment_date',
        'amount',
        'tds_amount',
        'payment_mode',
        'reference_number',
        'notes',
        'paid_by_user_id',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount'       => 'float',
        'tds_amount'   => 'float',
    ];

    public function supplier()
    {
        return $this->belongsTo(PharmacySupplier::class, 'supplier_id');
    }

    public function purchase()
    {
        return $this->belongsTo(PharmacyPurchase::class, 'purchase_id');
    }

    public function paidByUser()
    {
        return $this->belongsTo(User::class, 'paid_by_user_id');
    }
}
