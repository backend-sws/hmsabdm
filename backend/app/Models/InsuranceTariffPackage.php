<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InsuranceTariffPackage extends Model
{
    protected $fillable = [
        'payer_id', 'charge_master_id', 'procedure_name', 'hbp_code', 'cghs_code',
        'icd10_code', 'category', 'approved_rate', 'room_rent_cap_per_day',
        'icu_cap_per_day', 'max_los_days', 'exclusions', 'effective_from',
        'effective_to', 'requires_prior_approval', 'is_active',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
        'requires_prior_approval' => 'boolean',
        'is_active' => 'boolean',
        'approved_rate' => 'float',
    ];

    public function payer(): BelongsTo { return $this->belongsTo(InsurancePayer::class, 'payer_id'); }
    public function chargeMaster(): BelongsTo { return $this->belongsTo(ChargeMaster::class, 'charge_master_id'); }
}
