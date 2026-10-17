<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DonorScreening extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'donor_screenings';

    protected $fillable = [
        'hospital_id',
        'donor_id',
        'weight_kg',
        'hemoglobin_g_dl',
        'bp_systolic',
        'bp_diastolic',
        'pulse',
        'temperature',
        'medical_history_answers',
        'is_eligible',
        'rejection_reason',
        'donor_signature_data',
        'examined_by_user_id',
    ];

    protected $casts = [
        'weight_kg'               => 'float',
        'hemoglobin_g_dl'         => 'float',
        'bp_systolic'             => 'integer',
        'bp_diastolic'            => 'integer',
        'pulse'                   => 'integer',
        'temperature'             => 'float',
        'medical_history_answers' => 'array',
        'is_eligible'             => 'boolean',
    ];

    public function donor(): BelongsTo
    {
        return $this->belongsTo(BloodDonor::class, 'donor_id');
    }

    public function examinedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'examined_by_user_id');
    }
}
