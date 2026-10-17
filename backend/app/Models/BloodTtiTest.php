<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BloodTtiTest extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'blood_tti_tests';

    protected $fillable = [
        'hospital_id',
        'blood_unit_id',
        'hiv_result',
        'hbv_result',
        'hcv_result',
        'syphilis_result',
        'malaria_result',
        'blood_group_confirmed',
        'overall_status',
        'remarks',
        'tested_by_user_id',
        'authorized_by_pathologist_id',
        'tested_at',
    ];

    protected $casts = [
        'tested_at' => 'datetime',
    ];

    public function bloodUnit(): BelongsTo
    {
        return $this->belongsTo(BloodUnit::class, 'blood_unit_id');
    }

    public function testedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tested_by_user_id');
    }

    public function authorizedByPathologist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorized_by_pathologist_id');
    }
}
