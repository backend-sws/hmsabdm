<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class PharmacySupplier extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'pharmacy_suppliers';

    protected $fillable = [
        'hospital_id',
        'supplier_name',
        'contact_person',
        'phone',
        'email',
        'gstin',
        'drug_license_no',
        'pan_no',
        'address',
        'credit_days',
        'credit_limit',
        'opening_balance',
        'bank_name',
        'bank_account_no',
        'bank_ifsc',
        'is_active',
    ];

    protected $casts = [
        'credit_days'     => 'integer',
        'credit_limit'    => 'float',
        'opening_balance' => 'float',
        'is_active'       => 'boolean',
    ];

    public function purchases()
    {
        return $this->hasMany(PharmacyPurchase::class, 'supplier_id');
    }

    public function payments()
    {
        return $this->hasMany(PharmacySupplierPayment::class, 'supplier_id');
    }
}
