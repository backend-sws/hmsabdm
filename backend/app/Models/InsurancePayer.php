<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InsurancePayer extends Model
{
    protected $fillable = [
        'hospital_id', 'name', 'payer_type', 'code', 'contact_person',
        'contact_phone', 'contact_email', 'portal_url', 'api_endpoint',
        'empanelment_number', 'empanelment_letter_path', 'empanelment_valid_till',
        'gst_number', 'pan_number', 'address', 'default_copay_percent',
        'default_deductible', 'preauth_tat_hours', 'claim_settlement_days',
        'metadata', 'is_active',
    ];

    protected $casts = [
        'metadata' => 'array',
        'is_active' => 'boolean',
        'empanelment_valid_till' => 'date',
        'default_copay_percent' => 'float',
        'default_deductible' => 'float',
    ];

    public function hospital(): BelongsTo { return $this->belongsTo(Hospital::class); }
    public function tariffPackages(): HasMany { return $this->hasMany(InsuranceTariffPackage::class, 'payer_id'); }
    public function preauths(): HasMany { return $this->hasMany(InsurancePreauth::class, 'payer_id'); }
    public function claims(): HasMany { return $this->hasMany(InsuranceClaim::class, 'payer_id'); }
    public function patientInsurances(): HasMany { return $this->hasMany(PatientInsuranceDetail::class, 'payer_id'); }
    public function nonPayableItems(): HasMany { return $this->hasMany(InsuranceNonpayableItem::class, 'payer_id'); }

    public function getPayerTypeLabelAttribute(): string
    {
        return match($this->payer_type) {
            'tpa' => 'TPA',
            'insurance_company' => 'Insurance Company',
            'corporate' => 'Corporate',
            'cghs' => 'CGHS',
            'esic' => 'ESIC',
            'pmjay' => 'AB-PMJAY',
            default => 'Other',
        };
    }
}
