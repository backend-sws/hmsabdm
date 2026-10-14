<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class IpdAdmission extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'patient_id',
        'doctor_id',
        'department_id',
        'ward_id',
        'bed_id',
        'ipd_number',
        'admission_type',
        'admission_reason',
        'is_mlc',
        'mlc_details',
        'status',
        'advance_deposit',
        'payment_status',
        'payment_method',
        'payment_ref',
        'payment_breakdown',
        'admission_date',
        'discharge_date',
        'discharge_type',
        'discharge_summary',
        'discharge_advice',
        'final_diagnosis',
        'discharged_by_user_id',
        'invoice_id',
        'attendant_name',
        'attendant_relation',
        'attendant_phone',
        'attendant_address',
    ];

    protected $attributes = [
        'status'         => 'admitted',
        'admission_type' => 'planned',
        'is_mlc'         => false,
    ];

    protected $casts = [
        'admission_date'    => 'datetime',
        'discharge_date'    => 'datetime',
        'is_mlc'            => 'boolean',
        'advance_deposit'   => 'float',
        'payment_breakdown' => 'array',
    ];

    protected static function booted()
    {
        static::creating(function (IpdAdmission $admission) {
            if (empty($admission->ipd_number) && !empty($admission->hospital_id)) {
                $admission->ipd_number = Hospital::generateNextIpdNumber($admission->hospital_id);
            }
            if (empty($admission->status)) {
                $admission->status = 'admitted';
            }
            if (empty($admission->admission_date)) {
                $admission->admission_date = now();
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

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }

    public function bed()
    {
        return $this->belongsTo(Bed::class);
    }

    public function vitals()
    {
        return $this->hasMany(Vital::class);
    }

    public function latestVital()
    {
        return $this->hasOne(Vital::class)->latestOfMany();
    }


    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }

    public function doctorRounds()
    {
        return $this->hasMany(IpdDoctorRound::class);
    }

    public function nursingProcedures()
    {
        return $this->hasMany(IpdNursingProcedure::class);
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class);
    }

    public function intakeOutputs()
    {
        return $this->hasMany(IpdIntakeOutput::class);
    }

    public function marAdministrations()
    {
        return $this->hasMany(IpdMarAdministration::class);
    }

    public function shiftHandovers()
    {
        return $this->hasMany(IpdShiftHandover::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function dischargedByUser()
    {
        return $this->belongsTo(User::class, 'discharged_by_user_id');
    }

    public function labOrders()
    {
        return $this->hasMany(LabOrder::class, 'ipd_admission_id')->orderBy('created_at', 'desc');
    }

    public function wardIndents()
    {
        return $this->hasMany(PharmacyWardIndent::class, 'ipd_admission_id')->orderBy('created_at', 'desc');
    }

    public function dischargeSummary()
    {
        return $this->hasOne(IpdDischargeSummary::class, 'ipd_admission_id');
    }
}

