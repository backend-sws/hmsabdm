<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class PharmacySupplierReturn extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'pharmacy_supplier_returns';

    protected $fillable = [
        'hospital_id',
        'rtv_number',
        'supplier_id',
        'purchase_id',
        'return_reason',
        'notes',
        'status',
        'total_return_value',
        'debit_note_amount',
        'debit_note_number',
        'debit_note_date',
        'initiated_by_user_id',
        'approved_by_user_id',
        'approved_at',
    ];

    protected $casts = [
        'total_return_value' => 'float',
        'debit_note_amount'  => 'float',
        'debit_note_date'    => 'date',
        'approved_at'        => 'datetime',
    ];

    public function supplier()
    {
        return $this->belongsTo(PharmacySupplier::class, 'supplier_id');
    }

    public function purchase()
    {
        return $this->belongsTo(PharmacyPurchase::class, 'purchase_id');
    }

    public function items()
    {
        return $this->hasMany(PharmacySupplierReturnItem::class, 'supplier_return_id');
    }

    public function initiatedBy()
    {
        return $this->belongsTo(User::class, 'initiated_by_user_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}
