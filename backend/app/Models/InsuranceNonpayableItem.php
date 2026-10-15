<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InsuranceNonpayableItem extends Model
{
    protected $fillable = [
        'hospital_id', 'payer_id', 'charge_master_id', 'item_name', 'item_code',
        'category', 'reason', 'irdai_circular', 'is_active',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function hospital(): BelongsTo { return $this->belongsTo(Hospital::class); }
    public function payer(): BelongsTo { return $this->belongsTo(InsurancePayer::class, 'payer_id'); }
    public function chargeMaster(): BelongsTo { return $this->belongsTo(ChargeMaster::class, 'charge_master_id'); }
}
