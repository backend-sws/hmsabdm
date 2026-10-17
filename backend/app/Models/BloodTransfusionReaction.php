<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BloodTransfusionReaction extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'blood_transfusion_reactions';

    protected $fillable = [
        'hospital_id',
        'blood_unit_id',
        'patient_id',
        'admission_id',
        'requisition_id',
        'transfusion_started_at',
        'reaction_occurred_at',
        'volume_transfused_ml',
        'reaction_type',
        'severity',
        'clinical_symptoms',
        'action_taken',
        'remnant_bag_returned',
        'investigation_findings',
        'investigation_status',
        'reported_by_user_id',
    ];

    protected $casts = [
        'transfusion_started_at' => 'datetime',
        'reaction_occurred_at'   => 'datetime',
        'volume_transfused_ml'   => 'integer',
        'remnant_bag_returned'   => 'boolean',
    ];

    public function bloodUnit(): BelongsTo
    {
        return $this->belongsTo(BloodUnit::class, 'blood_unit_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(IpdAdmission::class, 'admission_id');
    }

    public function requisition(): BelongsTo
    {
        return $this->belongsTo(BloodRequisition::class, 'requisition_id');
    }

    public function reportedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_user_id');
    }
}
