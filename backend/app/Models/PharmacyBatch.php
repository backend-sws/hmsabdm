<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class PharmacyBatch extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'pharmacy_batches';

    protected $fillable = [
        'hospital_id',
        'hospital_medicine_id',
        'batch_number',
        'mfg_date',
        'expiry_date',
        'purchase_rate',
        'mrp',
        'selling_price',
        'available_quantity',
        'reserved_quantity',
        'rack_location',
        'supplier_id',
        'is_active',
        'expiry_status',
        'quarantined_at',
        'quarantined_by_user_id',
    ];

    protected $casts = [
        'supplier_id'        => 'integer',
        'mfg_date'           => 'date',
        'expiry_date'        => 'date',
        'purchase_rate'      => 'float',
        'mrp'                => 'float',
        'selling_price'      => 'float',
        'available_quantity' => 'integer',
        'reserved_quantity'  => 'integer',
        'is_active'          => 'boolean',
        'quarantined_at'     => 'datetime',
    ];

    public function medicine()
    {
        return $this->belongsTo(HospitalMedicine::class, 'hospital_medicine_id');
    }

    public function supplier()
    {
        return $this->belongsTo(PharmacySupplier::class, 'supplier_id');
    }

    public function purchaseItems()
    {
        return $this->hasMany(PharmacyPurchaseItem::class, 'batch_id');
    }

    public function quarantinedByUser()
    {
        return $this->belongsTo(User::class, 'quarantined_by_user_id');
    }

    public function isExpired(): bool
    {
        return $this->expiry_date->isPast();
    }

    public function isNearExpiry(int $days = 90): bool
    {
        return !$this->isExpired() && $this->expiry_date->diffInDays(now()) <= $days;
    }
}
