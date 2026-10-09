<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class Prescription extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'patient_id',
        'doctor_id',
        'opd_visit_id',
        'ipd_admission_id',
        'encounter_type',
        'prescription_number',
        'chief_complaints',
        'clinical_notes',
        'diet_advice',
        'general_advice',
        'follow_up_date',
        'disposition',
        'disposition_notes',
        'admit_priority',
        'recommended_ward',
        'status',
    ];

    protected $casts = [
        'chief_complaints' => 'array',
        'follow_up_date'   => 'date',
    ];

    protected static function booted()
    {
        static::creating(function (Prescription $rx) {
            if (empty($rx->prescription_number)) {
                $year = date('Y');
                $random = strtoupper(substr(uniqid(), -5));
                $rx->prescription_number = "RX-{$year}-{$random}";
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

    public function opdVisit()
    {
        return $this->belongsTo(OpdVisit::class, 'opd_visit_id');
    }

    public function ipdAdmission()
    {
        return $this->belongsTo(IpdAdmission::class, 'ipd_admission_id');
    }

    public function items()
    {
        return $this->hasMany(PrescriptionItem::class, 'prescription_id');
    }

    public function diagnoses()
    {
        return $this->hasMany(PrescriptionDiagnosis::class, 'prescription_id');
    }

    public function investigations()
    {
        return $this->hasMany(PrescriptionInvestigation::class, 'prescription_id');
    }
}
