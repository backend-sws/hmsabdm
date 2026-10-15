<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PatientInsuranceDetail extends Model
{
    protected $fillable = [
        'patient_id', 'hospital_id', 'payer_id', 'policy_number', 'member_id',
        'group_number', 'ayushman_id', 'abha_id', 'esic_ip_number', 'cghs_beneficiary_number',
        'insured_name', 'relation_to_patient', 'sum_insured', 'sum_insured_remaining',
        'copay_percent', 'deductible', 'policy_start', 'policy_end',
        'is_primary', 'card_image_path', 'policy_document_path',
        'verification_status', 'verified_at', 'verified_by', 'verification_notes', 'is_active',
    ];

    protected $casts = [
        'policy_start' => 'date',
        'policy_end' => 'date',
        'verified_at' => 'datetime',
        'is_primary' => 'boolean',
        'is_active' => 'boolean',
        'sum_insured' => 'float',
        'sum_insured_remaining' => 'float',
        'copay_percent' => 'float',
        'deductible' => 'float',
    ];

    public function patient(): BelongsTo { return $this->belongsTo(Patient::class); }
    public function hospital(): BelongsTo { return $this->belongsTo(Hospital::class); }
    public function payer(): BelongsTo { return $this->belongsTo(InsurancePayer::class, 'payer_id'); }
    public function preauths(): HasMany { return $this->hasMany(InsurancePreauth::class, 'patient_insurance_id'); }
    public function claims(): HasMany { return $this->hasMany(InsuranceClaim::class, 'patient_insurance_id'); }

    public function getIsPolicyActiveAttribute(): bool
    {
        if (!$this->policy_end) return true;
        return $this->policy_end->isFuture() || $this->policy_end->isToday();
    }
}
