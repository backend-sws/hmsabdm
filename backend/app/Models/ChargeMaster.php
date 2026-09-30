<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class ChargeMaster extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'charges_master';

    protected $fillable = [
        'hospital_id',
        'category_id',
        'code',
        'name',
        'description',
        'billing_type',
        'standard_rate',
        'tax_percentage',
        'department_id',
        'doctor_id',
        'ward_id',
        'is_active',
        'is_system',
    ];

    protected $casts = [
        'standard_rate'  => 'float',
        'tax_percentage' => 'float',
        'is_active'      => 'boolean',
        'is_system'      => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(ChargeCategory::class, 'category_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }

    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }

    public function ledgerItems()
    {
        return $this->hasMany(BillingLedgerItem::class, 'charge_id');
    }
}
