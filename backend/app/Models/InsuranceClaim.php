<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InsuranceClaim extends Model
{
    protected $fillable = [
        'claim_number', 'preauth_id', 'admission_id', 'opd_visit_id', 'payer_id',
        'patient_insurance_id', 'hospital_id', 'claim_type', 'status',
        'total_bill_amount', 'claimed_amount', 'non_payable_amount', 'copay_amount',
        'deducted_amount', 'approved_amount', 'settled_amount',
        'secondary_claim_id', 'secondary_approved_amount',
        'tpa_claim_number', 'nhcx_claim_id', 'tms_transaction_id',
        'submission_date', 'approval_date', 'settled_at', 'settlement_utr',
        'rejection_reason', 'resubmission_count', 'resubmission_notes',
        'grievance_raised_at', 'grievance_notes', 'grievance_resolved_at',
        'documents', 'followup_notes', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'documents' => 'array',
        'followup_notes' => 'array',
        'settled_at' => 'datetime',
        'grievance_raised_at' => 'datetime',
        'grievance_resolved_at' => 'datetime',
        'submission_date' => 'date',
        'approval_date' => 'date',
        'total_bill_amount' => 'float',
        'claimed_amount' => 'float',
        'non_payable_amount' => 'float',
        'copay_amount' => 'float',
        'deducted_amount' => 'float',
        'approved_amount' => 'float',
        'settled_amount' => 'float',
    ];

    public function payer(): BelongsTo { return $this->belongsTo(InsurancePayer::class, 'payer_id'); }
    public function patientInsurance(): BelongsTo { return $this->belongsTo(PatientInsuranceDetail::class, 'patient_insurance_id'); }
    public function hospital(): BelongsTo { return $this->belongsTo(Hospital::class); }
    public function preauth(): BelongsTo { return $this->belongsTo(InsurancePreauth::class, 'preauth_id'); }
    public function admission(): BelongsTo { return $this->belongsTo(IpdAdmission::class, 'admission_id'); }
    public function arLedger(): HasMany { return $this->hasMany(InsuranceArLedger::class, 'claim_id'); }
    public function secondaryClaim(): BelongsTo { return $this->belongsTo(InsuranceClaim::class, 'secondary_claim_id'); }

    public function getOutstandingAmountAttribute(): float
    {
        $settled = $this->settled_amount ?? 0;
        $approved = $this->approved_amount ?? $this->claimed_amount ?? 0;
        return max(0, $approved - $settled);
    }

    public function getAgingDaysAttribute(): int
    {
        if (!$this->submission_date) return 0;
        return (int) $this->submission_date->diffInDays(now());
    }

    public function getAgingBucketAttribute(): string
    {
        $days = $this->aging_days;
        if ($days <= 30) return '0-30';
        if ($days <= 60) return '31-60';
        if ($days <= 90) return '61-90';
        return '90+';
    }
}
