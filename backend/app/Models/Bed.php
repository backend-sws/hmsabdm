<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class Bed extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'ward_id',
        'bed_number',
        'status',
        'daily_charge',
        'current_admission_id',
        'is_active',
    ];

    protected $attributes = [
        'status'    => 'available',
        'is_active' => true,
    ];

    protected $casts = [
        'daily_charge' => 'float',
        'is_active'    => 'boolean',
    ];

    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }

    public function currentAdmission()
    {
        return $this->belongsTo(IpdAdmission::class, 'current_admission_id');
    }

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }
}
