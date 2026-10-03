<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class IpdShiftHandover extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'ipd_shift_handovers';

    protected $fillable = [
        'hospital_id',
        'ward_id',
        'ipd_admission_id',
        'patient_id',
        'shift_name',
        'shift_date',
        'outgoing_nurse_name',
        'incoming_nurse_name',
        'patient_condition',
        'handover_notes',
        'critical_alerts',
        'pending_tasks',
        'acknowledged_at',
    ];

    protected $casts = [
        'shift_date'      => 'date',
        'acknowledged_at' => 'datetime',
    ];

    public function admission()
    {
        return $this->belongsTo(IpdAdmission::class, 'ipd_admission_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }
}
