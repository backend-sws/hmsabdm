<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class OpdVisit extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id', 'opd_number', 'patient_id', 'doctor_id', 'department_id', 'appointment_type_id',
        'visit_date', 'queue_token', 'status', 'chief_complaint', 'notes', 'diagnosis',
        'fee_charged', 'discount', 'amount_paid', 'payment_status', 'payment_method', 'payment_ref', 'payment_breakdown',
        'called_at', 'completed_at'
    ];

    protected static function booted()
    {
        static::creating(function (OpdVisit $visit) {
            if (empty($visit->opd_number) && !empty($visit->hospital_id)) {
                $visit->opd_number = Hospital::generateNextOpdNumber($visit->hospital_id);
            }
        });
    }

    protected $casts = [
        'visit_date'        => 'date',
        'fee_charged'       => 'float',
        'discount'          => 'float',
        'amount_paid'       => 'float',
        'payment_breakdown' => 'array',
        'called_at'         => 'datetime',
        'completed_at'      => 'datetime',
    ];

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

    public function vitals()
    {
        return $this->hasMany(Vital::class);
    }

    public function latestVital()
    {
        return $this->hasOne(Vital::class)->latestOfMany();
    }

    public function prescription()
    {
        return $this->hasOne(Prescription::class, 'opd_visit_id');
    }

    protected $appends = [
        'visit_id',
        'token_no',
        'token_number',
        'patient_name',
        'uhid',
        'age',
        'gender',
        'dob',
        'patient_mobile',
        'abha_address',
        'department_name',
        'doctor_name',
        'visit_reason',
        'check_in_time',
        'has_vitals',
    ];

    public function getVisitIdAttribute()
    {
        return $this->id;
    }

    public function getTokenNoAttribute()
    {
        return $this->queue_token !== null ? (string)$this->queue_token : ($this->opd_number ?? '');
    }

    public function getTokenNumberAttribute()
    {
        return $this->queue_token;
    }

    public function getPatientNameAttribute()
    {
        return $this->patient?->name;
    }

    public function getUhidAttribute()
    {
        return $this->patient?->uhid;
    }

    public function getAgeAttribute()
    {
        return $this->patient?->age;
    }

    public function getGenderAttribute()
    {
        return $this->patient?->gender;
    }

    public function getDobAttribute()
    {
        return $this->patient?->dob?->format('Y-m-d');
    }

    public function getPatientMobileAttribute()
    {
        return $this->patient?->mobile;
    }

    public function getAbhaAddressAttribute()
    {
        return $this->patient?->abha_address;
    }

    public function getDepartmentNameAttribute()
    {
        return $this->department?->name;
    }

    public function getDoctorNameAttribute()
    {
        return $this->doctor?->name;
    }

    public function getVisitReasonAttribute()
    {
        return $this->chief_complaint;
    }

    public function getCheckInTimeAttribute()
    {
        return $this->created_at ? $this->created_at->toISOString() : null;
    }

    public function getHasVitalsAttribute()
    {
        return $this->latestVital !== null;
    }
}
