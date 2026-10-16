<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class LabOrder extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'patient_id',
        'ipd_admission_id',
        'prescription_id',
        'doctor_id',
        'invoice_id',
        'order_number',
        'sample_accession_number',
        'urgency',
        'order_type',
        'is_bedside_collection',
        'status',
        'token_number',
        'token_called_at',
        'booth_number',
        'is_called',
        'rejection_reason',
        'rejection_notes',
        'rejected_at',
        'rejected_by_user_id',
        'is_recollected',
        'sample_collected_at',
        'sample_collected_by_user_id',
        'sample_notes',
        'result_entered_at',
        'result_entered_by_user_id',
        'authorized_at',
        'authorized_by_doctor_id',
        'authorization_notes',
        'clinical_notes',
    ];

    protected $casts = [
        'token_called_at'       => 'datetime',
        'is_called'             => 'boolean',
        'is_bedside_collection' => 'boolean',
        'rejected_at'           => 'datetime',
        'is_recollected'        => 'boolean',
        'sample_collected_at'   => 'datetime',
        'result_entered_at'     => 'datetime',
        'authorized_at'         => 'datetime',
    ];

    public function ipdAdmission()
    {
        return $this->belongsTo(IpdAdmission::class, 'ipd_admission_id');
    }

    public function rejectedBy()
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function items()
    {
        return $this->hasMany(LabOrderItem::class, 'order_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    public function prescription()
    {
        return $this->belongsTo(Prescription::class, 'prescription_id');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function sampleCollector()
    {
        return $this->belongsTo(User::class, 'sample_collected_by_user_id');
    }

    public function resultEnterer()
    {
        return $this->belongsTo(User::class, 'result_entered_by_user_id');
    }

    public function authorizingDoctor()
    {
        return $this->belongsTo(Doctor::class, 'authorized_by_doctor_id');
    }

    public function auditLogs()
    {
        return $this->hasMany(LabAuditLog::class, 'order_id')->orderBy('created_at', 'desc');
    }
}
