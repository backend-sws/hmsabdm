<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class EmergencyTriage extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'emergency_triages';

    protected $fillable = [
        'hospital_id',
        'triage_number',
        'patient_id',
        'doctor_id',
        'ipd_admission_id',
        'ward_id',
        'bed_id',
        'is_unknown_patient',
        'patient_name',
        'gender',
        'approximate_age',
        'brought_by',
        'brought_by_contact',
        'priority_level',
        'triage_category',
        'chief_complaint',
        'consciousness_level',
        'gcs_score',
        'initial_vitals',
        'is_mlc',
        'mlc_number',
        'police_station',
        'police_officer_name',
        'police_buckle_number',
        'incident_place',
        'mlc_injuries_details',
        'status',
        'arrival_time',
        'stabilized_at',
        'discharged_at',
        'clinical_notes',
        'created_by_user_id',
    ];

    protected $casts = [
        'is_unknown_patient' => 'boolean',
        'is_mlc'             => 'boolean',
        'initial_vitals'     => 'array',
        'approximate_age'    => 'integer',
        'gcs_score'          => 'integer',
        'arrival_time'       => 'datetime',
        'stabilized_at'      => 'datetime',
        'discharged_at'      => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function (EmergencyTriage $triage) {
            if (empty($triage->triage_number) && !empty($triage->hospital_id)) {
                $year = date('Y');
                $lastTriage = static::where('hospital_id', $triage->hospital_id)
                    ->whereYear('created_at', $year)
                    ->max('id');
                $nextSeq = str_pad(($lastTriage ? $lastTriage + 1 : 1), 5, '0', STR_PAD_LEFT);
                $triage->triage_number = "EMG-{$year}-{$nextSeq}";
            }

            if ($triage->is_mlc && empty($triage->mlc_number) && !empty($triage->hospital_id)) {
                $year = date('Y');
                $lastMlc = static::where('hospital_id', $triage->hospital_id)
                    ->where('is_mlc', true)
                    ->whereYear('created_at', $year)
                    ->count();
                $nextMlcSeq = str_pad($lastMlc + 1, 5, '0', STR_PAD_LEFT);
                $triage->mlc_number = "MLC-{$year}-{$nextMlcSeq}";
            }

            if (empty($triage->arrival_time)) {
                $triage->arrival_time = now();
            }
        });
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }

    public function ipdAdmission()
    {
        return $this->belongsTo(IpdAdmission::class);
    }

    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }

    public function bed()
    {
        return $this->belongsTo(Bed::class);
    }

    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
