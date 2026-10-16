<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class BillingLedgerItem extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'patient_id',
        'encounter_type',
        'encounter_id',
        'charge_id',
        'category',
        'item_name',
        'unit_price',
        'quantity',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'charged_at',
        'charged_by_user_id',
        'auto_generated',
        'notes',
        'status',
        'invoice_id',
    ];

    protected $casts = [
        'unit_price'      => 'float',
        'quantity'        => 'float',
        'tax_amount'      => 'float',
        'discount_amount' => 'float',
        'total_amount'    => 'float',
        'auto_generated'  => 'boolean',
        'charged_at'      => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function charge()
    {
        return $this->belongsTo(ChargeMaster::class, 'charge_id');
    }

    public function chargedBy()
    {
        return $this->belongsTo(User::class, 'charged_by_user_id');
    }

    public function opdVisit()
    {
        return $this->belongsTo(OpdVisit::class, 'encounter_id');
    }

    public function ipdAdmission()
    {
        return $this->belongsTo(IpdAdmission::class, 'encounter_id');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
