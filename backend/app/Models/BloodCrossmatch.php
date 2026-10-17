<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BloodCrossmatch extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'blood_crossmatches';

    protected $fillable = [
        'hospital_id',
        'requisition_id',
        'blood_unit_id',
        'patient_id',
        'method',
        'compatibility',
        'crossmatched_by_user_id',
        'crossmatched_at',
        'reservation_valid_until',
        'is_issued',
        'issued_at',
        'issued_to_staff_name',
        'cold_box_temperature',
        'service_charge',
        'invoice_id',
    ];

    protected $casts = [
        'crossmatched_at'         => 'datetime',
        'reservation_valid_until' => 'datetime',
        'issued_at'               => 'datetime',
        'is_issued'               => 'boolean',
        'cold_box_temperature'    => 'float',
        'service_charge'          => 'float',
    ];

    public function requisition(): BelongsTo
    {
        return $this->belongsTo(BloodRequisition::class, 'requisition_id');
    }

    public function bloodUnit(): BelongsTo
    {
        return $this->belongsTo(BloodUnit::class, 'blood_unit_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function crossmatchedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'crossmatched_by_user_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }
}
