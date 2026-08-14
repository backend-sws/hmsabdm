<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class Vital extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id', 'patient_id', 'opd_visit_id', 'recorded_by', 'recorded_at',
        'temperature', 'temperature_unit', 'blood_pressure_sys', 'blood_pressure_dia',
        'pulse_rate', 'respiratory_rate', 'oxygen_saturation', 'weight', 'height',
        'bmi', 'blood_glucose', 'glucose_type'
    ];
}
