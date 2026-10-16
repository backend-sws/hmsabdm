<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class CounterQueue extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id', 'patient_id', 'link_token', 'counter_code', 'status', 'expires_at'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    protected $appends = [
        'token_no',
        'patient_name',
        'abha_address',
        'abha_number',
        'gender',
        'age',
    ];

    public function getTokenNoAttribute(): ?string
    {
        return $this->link_token;
    }

    public function getPatientNameAttribute(): ?string
    {
        return $this->patient?->name;
    }

    public function getAbhaAddressAttribute(): ?string
    {
        return $this->patient?->abha_address;
    }

    public function getAbhaNumberAttribute(): ?string
    {
        return $this->patient?->abha_number;
    }

    public function getGenderAttribute(): ?string
    {
        return $this->patient?->gender;
    }

    public function getAgeAttribute(): ?int
    {
        return $this->patient?->dob ? \Carbon\Carbon::parse($this->patient->dob)->age : null;
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
