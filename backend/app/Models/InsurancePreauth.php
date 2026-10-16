<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class InsurancePreauth extends Model
{
    protected $fillable = [
        'preauth_number', 'admission_id', 'opd_visit_id', 'payer_id', 'patient_insurance_id',
        'hospital_id', 'preauth_type', 'status', 'icd10_codes', 'hbp_code', 'cghs_package_code',
        'primary_diagnosis', 'proposed_treatment', 'estimated_los_days', 'estimated_amount',
        'room_rent_per_day', 'tpa_preauth_number', 'approved_amount', 'approved_room_rent_cap',
        'approved_icu_cap', 'approved_los_days', 'valid_till', 'sanction_letter_path',
        'approval_remarks', 'denial_reason', 'tpa_query', 'query_raised_at', 'query_response',
        'query_responded_at', 'query_documents', 'followup_notes', 'submitted_at', 'approved_at', 'denied_at',
        'parent_preauth_id', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'icd10_codes' => 'array',
        'query_documents' => 'array',
        'followup_notes' => 'array',
        'query_raised_at' => 'datetime',
        'query_responded_at' => 'datetime',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'denied_at' => 'datetime',
        'valid_till' => 'date',
        'estimated_amount' => 'float',
        'approved_amount' => 'float',
    ];

    public function payer(): BelongsTo { return $this->belongsTo(InsurancePayer::class, 'payer_id'); }
    public function patientInsurance(): BelongsTo { return $this->belongsTo(PatientInsuranceDetail::class, 'patient_insurance_id'); }
    public function hospital(): BelongsTo { return $this->belongsTo(Hospital::class); }
    public function admission(): BelongsTo { return $this->belongsTo(IpdAdmission::class, 'admission_id'); }
    public function parentPreauth(): BelongsTo { return $this->belongsTo(InsurancePreauth::class, 'parent_preauth_id'); }
    public function enhancements(): HasMany { return $this->hasMany(InsurancePreauth::class, 'parent_preauth_id'); }
    public function claims(): HasMany { return $this->hasMany(InsuranceClaim::class, 'preauth_id'); }
    public function implantApprovals(): HasMany { return $this->hasMany(InsuranceImplantApproval::class, 'preauth_id'); }

    public function getIsExpiredAttribute(): bool
    {
        if (!$this->valid_till) return false;
        return $this->valid_till->isPast();
    }

    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'approved' => 'green',
            'queried', 'query_responded' => 'yellow',
            'denied', 'cancelled', 'expired' => 'red',
            'submitted' => 'blue',
            default => 'gray',
        };
    }
}
