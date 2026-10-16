<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class OperationTheatre extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'name',
        'code',
        'floor',
        'status',
        'equipment_notes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function schedules()
    {
        return $this->hasMany(OtSchedule::class);
    }

    public function todaySchedules()
    {
        return $this->hasMany(OtSchedule::class)->whereDate('surgery_date', now()->toDateString());
    }
}
