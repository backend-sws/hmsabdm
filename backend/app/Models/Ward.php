<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class Ward extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'name',
        'code',
        'floor',
        'gender_type',
        'daily_charge',
        'is_active',
    ];

    protected $casts = [
        'daily_charge' => 'float',
        'is_active'    => 'boolean',
    ];

    public function beds()
    {
        return $this->hasMany(Bed::class);
    }

    public function availableBeds()
    {
        return $this->hasMany(Bed::class)->where('status', 'available')->where('is_active', true);
    }

    public function occupiedBeds()
    {
        return $this->hasMany(Bed::class)->where('status', 'occupied');
    }

    public function admissions()
    {
        return $this->hasMany(IpdAdmission::class);
    }
}
