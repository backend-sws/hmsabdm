<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;


class DoctorSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_id', 'day_of_week', 'start_time', 'end_time', 'max_patients', 'opd_fee', 'is_active'
    ];

    protected $hidden = [
        'created_at', 'updated_at'
    ];

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }
}
