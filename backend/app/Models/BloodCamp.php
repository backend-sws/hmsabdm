<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BloodCamp extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'blood_camps';

    protected $fillable = [
        'hospital_id',
        'camp_name',
        'organizer_name',
        'location',
        'camp_date',
        'target_units',
        'units_collected',
        'coordinator_contact',
        'status',
    ];

    protected $casts = [
        'camp_date'       => 'date',
        'target_units'    => 'integer',
        'units_collected' => 'integer',
    ];

    public function bloodUnits(): HasMany
    {
        return $this->hasMany(BloodUnit::class, 'camp_id');
    }
}
