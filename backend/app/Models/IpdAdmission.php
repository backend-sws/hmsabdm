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
        'ipd_number',
        'status',
        'admission_date',
        'discharge_date',
    ];

    protected $attributes = [
        'status' => 'admitted',
    ];

    protected $casts = [
        'admission_date' => 'datetime',
        'discharge_date' => 'datetime',
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

    public function vitals()
    {
        return $this->hasMany(Vital::class);
    }

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }
}
