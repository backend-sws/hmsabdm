<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BloodUnit extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'blood_units';

    protected $fillable = [
        'hospital_id',
        'donor_id',
        'screening_id',
        'camp_id',
        'parent_unit_id',
        'unit_barcode',
        'blood_group',
        'component_type',
        'volume_ml',
        'bag_type',
        'collection_date',
        'expiry_date',
        'storage_equipment',
        'storage_location',
        'tti_status',
        'is_leukodepleted',
        'is_irradiated',
        'status',
        'discard_reason',
        'discard_date',
        'discarded_by_user_id',
    ];

    protected $casts = [
        'collection_date'  => 'datetime',
        'expiry_date'      => 'datetime',
        'discard_date'     => 'datetime',
        'volume_ml'        => 'integer',
        'is_leukodepleted' => 'boolean',
        'is_irradiated'    => 'boolean',
    ];

    protected static function booted()
    {
        static::creating(function (BloodUnit $unit) {
            if (empty($unit->unit_barcode)) {
                $year = date('Y');
                $count = static::where('hospital_id', $unit->hospital_id ?? 1)->count() + 1;
                $unit->unit_barcode = sprintf('BAG-%s-%05d', $year, $count);
            }
        });
    }

    public function donor(): BelongsTo
    {
        return $this->belongsTo(BloodDonor::class, 'donor_id');
    }

    public function screening(): BelongsTo
    {
        return $this->belongsTo(DonorScreening::class, 'screening_id');
    }

    public function camp(): BelongsTo
    {
        return $this->belongsTo(BloodCamp::class, 'camp_id');
    }

    public function parentUnit(): BelongsTo
    {
        return $this->belongsTo(BloodUnit::class, 'parent_unit_id');
    }

    public function subUnits(): HasMany
    {
        return $this->hasMany(BloodUnit::class, 'parent_unit_id');
    }

    public function ttiTest(): HasOne
    {
        return $this->hasOne(BloodTtiTest::class, 'blood_unit_id');
    }

    public function crossmatches(): HasMany
    {
        return $this->hasMany(BloodCrossmatch::class, 'blood_unit_id');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(BloodTransfusionReaction::class, 'blood_unit_id');
    }
}
