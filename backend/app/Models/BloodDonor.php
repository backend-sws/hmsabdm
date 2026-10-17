<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BloodDonor extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'blood_donors';

    protected $fillable = [
        'hospital_id',
        'donor_number',
        'name',
        'mobile',
        'email',
        'gender',
        'dob',
        'age',
        'blood_group',
        'donor_type',
        'patient_id',
        'patient_uhid',
        'abha_number',
        'abha_address',
        'id_proof_type',
        'id_proof_number',
        'occupation',
        'address',
        'city',
        'total_donations',
        'last_donated_at',
        'deferral_status',
        'deferral_reason',
        'deferred_until',
    ];

    protected $casts = [
        'dob'             => 'date',
        'last_donated_at' => 'date',
        'deferred_until'  => 'date',
        'total_donations' => 'integer',
        'age'             => 'integer',
    ];

    protected static function booted()
    {
        static::creating(function (BloodDonor $donor) {
            if (empty($donor->donor_number)) {
                $year = date('Y');
                $count = static::where('hospital_id', $donor->hospital_id ?? 1)->count() + 1;
                $donor->donor_number = sprintf('DN-%s-%05d', $year, $count);
            }
        });
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function screenings(): HasMany
    {
        return $this->hasMany(DonorScreening::class, 'donor_id');
    }

    public function bloodUnits(): HasMany
    {
        return $this->hasMany(BloodUnit::class, 'donor_id');
    }
}
