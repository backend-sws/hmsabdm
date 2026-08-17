<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class Vital extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'patient_id',
        'opd_visit_id',
        'ipd_admission_id',
        'encounter_type',
        'recorded_by',
        'recorded_at',
        'temperature',
        'temperature_unit',
        'blood_pressure_sys',
        'blood_pressure_dia',
        'pulse_rate',
        'respiratory_rate',
        'oxygen_saturation',
        'weight',
        'height',
        'bmi',
        'blood_glucose',
        'glucose_type',
        'custom_vitals'
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
        'temperature' => 'float',
        'blood_pressure_sys' => 'integer',
        'blood_pressure_dia' => 'integer',
        'pulse_rate' => 'integer',
        'respiratory_rate' => 'integer',
        'oxygen_saturation' => 'float',
        'weight' => 'float',
        'height' => 'float',
        'bmi' => 'float',
        'blood_glucose' => 'float',
        'custom_vitals' => 'array',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function opdVisit()
    {
        return $this->belongsTo(OpdVisit::class);
    }

    public function ipdAdmission()
    {
        return $this->belongsTo(IpdAdmission::class);
    }

    public function recordedByUser()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
