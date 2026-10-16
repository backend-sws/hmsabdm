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

    protected $appends = [
        'username',
        'full_name',
        'today_waiting_count',
        'today_consulting_count',
        'today_total_count',
    ];

    public function getFullNameAttribute()
    {
        return $this->attributes['name'] ?? '';
    }

    public function getUsernameAttribute()
    {
        return $this->user?->username;
    }

    public function getTodayWaitingCountAttribute()
    {
        if (array_key_exists('today_waiting_count', $this->attributes)) {
            return (int) $this->attributes['today_waiting_count'];
        }
        return $this->relationLoaded('opdVisits')
            ? $this->opdVisits->filter(fn($v) => $v->visit_date?->isToday() && $v->status === 'waiting')->count()
            : $this->opdVisits()->whereDate('visit_date', today())->where('status', 'waiting')->count();
    }

    public function getTodayConsultingCountAttribute()
    {
        if (array_key_exists('today_consulting_count', $this->attributes)) {
            return (int) $this->attributes['today_consulting_count'];
        }
        return $this->relationLoaded('opdVisits')
            ? $this->opdVisits->filter(fn($v) => $v->visit_date?->isToday() && in_array($v->status, ['called', 'in_consultation']))->count()
            : $this->opdVisits()->whereDate('visit_date', today())->whereIn('status', ['called', 'in_consultation'])->count();
    }

    public function getTodayTotalCountAttribute()
    {
        if (array_key_exists('today_total_count', $this->attributes)) {
            return (int) $this->attributes['today_total_count'];
        }
        return $this->relationLoaded('opdVisits')
            ? $this->opdVisits->filter(fn($v) => $v->visit_date?->isToday())->count()
            : $this->opdVisits()->whereDate('visit_date', today())->count();
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

    public function todayVisits()
    {
        return $this->hasMany(OpdVisit::class)->whereDate('visit_date', today());
    }
}
