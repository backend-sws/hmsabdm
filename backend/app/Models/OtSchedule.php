<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class OtSchedule extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'booking_number',
        'operation_theatre_id',
        'ipd_admission_id',
        'patient_id',
        'primary_surgeon_id',
        'assistant_surgeon_id',
        'anesthetist_id',
        'surgical_department_id',
        'procedure_name',
        'procedure_code',
        'surgery_date',
        'scheduled_start_time',
        'scheduled_end_time',
        'actual_start_time',
        'actual_end_time',
        'anesthesia_type',
        'priority',
        'status',
        'pre_op_diagnosis',
        'post_op_diagnosis',
        'scrub_nurse_name',
        'circulating_nurse_name',
        'blood_required_units',
        'special_instruments',
        'surgeon_notes',
        'recovery_notes',
        'pacu_discharge_time',
        'created_by_user_id',
    ];

    protected $casts = [
        'surgery_date'        => 'date',
        'actual_start_time'   => 'datetime',
        'actual_end_time'     => 'datetime',
        'pacu_discharge_time' => 'datetime',
        'blood_required_units'=> 'integer',
    ];

    public function operationTheatre()
    {
        return $this->belongsTo(OperationTheatre::class, 'operation_theatre_id');
    }

    public function ipdAdmission()
    {
        return $this->belongsTo(IpdAdmission::class, 'ipd_admission_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function primarySurgeon()
    {
        return $this->belongsTo(Doctor::class, 'primary_surgeon_id');
    }

    public function assistantSurgeon()
    {
        return $this->belongsTo(Doctor::class, 'assistant_surgeon_id');
    }

    public function anesthetist()
    {
        return $this->belongsTo(Doctor::class, 'anesthetist_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class, 'surgical_department_id');
    }

    public function checklistRecord()
    {
        return $this->hasOne(OtChecklistRecord::class, 'ot_schedule_id');
    }

    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
