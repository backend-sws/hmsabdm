<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class Doctor extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id', 'department_id', 'user_id', 'name', 'specialization',
        'qualification', 'phone', 'email', 'hpr_id', 'consultation_time', 'is_active'
    ];

    protected $hidden = [
        'created_at', 'updated_at', 'user_id', 'hpr_id'
    ];

    protected $appends = ['username'];

    public function getUsernameAttribute()
    {
        return $this->user?->username;
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function schedules()
    {
        return $this->hasMany(DoctorSchedule::class);
    }

    public function opdVisits()
    {
        return $this->hasMany(OpdVisit::class);
    }
}
