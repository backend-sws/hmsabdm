<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InsuranceImplantApproval extends Model
{
    protected $fillable = [
        'preauth_id', 'admission_id', 'payer_id', 'hospital_id',
        'device_name', 'brand_model', 'barcode_serial', 'manufacturer',
        'device_cost', 'status', 'approval_reference', 'denial_reason',
        'submitted_at', 'approved_at', 'invoice_path', 'created_by',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'device_cost' => 'float',
    ];

    public function preauth(): BelongsTo { return $this->belongsTo(InsurancePreauth::class, 'preauth_id'); }
    public function payer(): BelongsTo { return $this->belongsTo(InsurancePayer::class, 'payer_id'); }
    public function hospital(): BelongsTo { return $this->belongsTo(Hospital::class); }
    public function admission(): BelongsTo { return $this->belongsTo(IpdAdmission::class, 'admission_id'); }
}
