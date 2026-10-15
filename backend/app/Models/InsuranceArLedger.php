<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InsuranceArLedger extends Model
{
    protected $table = 'insurance_ar_ledger';

    protected $fillable = [
        'claim_id', 'hospital_id', 'event_type', 'amount', 'running_outstanding',
        'event_date', 'transaction_ref', 'notes', 'created_by',
    ];

    protected $casts = [
        'event_date' => 'date',
        'amount' => 'float',
        'running_outstanding' => 'float',
    ];

    public function claim(): BelongsTo { return $this->belongsTo(InsuranceClaim::class, 'claim_id'); }
    public function hospital(): BelongsTo { return $this->belongsTo(Hospital::class); }
    public function createdByUser(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}
