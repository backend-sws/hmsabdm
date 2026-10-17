<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BloodRequisition extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'blood_requisitions';

    protected $fillable = [
        'hospital_id',
        'requisition_number',
        'patient_id',
        'admission_id',
        'doctor_id',
        'department_id',
        'blood_group_needed',
        'component_needed',
        'units_requested',
        'units_crossmatched',
        'units_issued',
        'urgency',
        'clinical_indication',
        'hb_level',
        'date_needed',
        'emergency_consultant_waiver_signed',
        'status',
    ];

    protected $casts = [
        'units_requested'                    => 'integer',
        'units_crossmatched'                 => 'integer',
        'units_issued'                       => 'integer',
        'hb_level'                           => 'float',
        'date_needed'                        => 'datetime',
        'emergency_consultant_waiver_signed' => 'boolean',
    ];

    protected static function booted()
    {
        static::creating(function (BloodRequisition $req) {
            if (empty($req->requisition_number)) {
                $year = date('Y');
                $count = static::where('hospital_id', $req->hospital_id ?? 1)->count() + 1;
                $req->requisition_number = sprintf('REQ-BLD-%s-%05d', $year, $count);
            }
        });
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(IpdAdmission::class, 'admission_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function crossmatches(): HasMany
    {
        return $this->hasMany(BloodCrossmatch::class, 'requisition_id');
    }
}
