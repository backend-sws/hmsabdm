<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class IpdDischargeSummary extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'ipd_admission_id',
        'patient_id',
        'doctor_id',
        'prepared_by_user_id',
        'finalized_by_user_id',
        'summary_number',
        'status',
        'discharge_type',
        'admission_date',
        'discharge_date',
        'admission_diagnosis',
        'final_diagnosis',
        'icd10_code',
        'chief_complaints',
        'history_of_present_illness',
        'past_history_and_allergies',
        'condition_at_discharge',
        'discharge_vitals',
        'hospital_course',
        'procedures_surgeries',
        'investigations_summary',
        'treatment_given',
        'discharge_medications',
        'dietary_advice',
        'physical_activity_advice',
        'wound_care_instructions',
        'emergency_red_flags',
        'follow_up_date',
        'follow_up_doctor_id',
        'follow_up_instructions',
        'finalized_at',
    ];

    protected $casts = [
        'admission_date'        => 'datetime',
        'discharge_date'        => 'datetime',
        'follow_up_date'        => 'date',
        'finalized_at'          => 'datetime',
        'discharge_vitals'      => 'array',
        'discharge_medications' => 'array',
    ];

    public function ipdAdmission()
    {
        return $this->belongsTo(IpdAdmission::class, 'ipd_admission_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    public function preparedByUser()
    {
        return $this->belongsTo(User::class, 'prepared_by_user_id');
    }

    public function finalizedByUser()
    {
        return $this->belongsTo(User::class, 'finalized_by_user_id');
    }

    public function followUpDoctor()
    {
        return $this->belongsTo(Doctor::class, 'follow_up_doctor_id');
    }
}
