<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class OtChecklistRecord extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'ot_schedule_id',
        'sign_in_completed',
        'sign_in_completed_at',
        'sign_in_nurse_name',
        'sign_in_anesthetist_name',
        'sign_in_checks',
        'time_out_completed',
        'time_out_completed_at',
        'time_out_checks',
        'sign_out_completed',
        'sign_out_completed_at',
        'sign_out_nurse_name',
        'sign_out_checks',
    ];

    protected $casts = [
        'sign_in_completed'     => 'boolean',
        'sign_in_completed_at'  => 'datetime',
        'sign_in_checks'        => 'array',
        'time_out_completed'    => 'boolean',
        'time_out_completed_at' => 'datetime',
        'time_out_checks'       => 'array',
        'sign_out_completed'    => 'boolean',
        'sign_out_completed_at' => 'datetime',
        'sign_out_checks'       => 'array',
    ];

    public function otSchedule()
    {
        return $this->belongsTo(OtSchedule::class, 'ot_schedule_id');
    }
}
