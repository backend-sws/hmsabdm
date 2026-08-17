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
}
