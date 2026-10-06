<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class Patient extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'uhid',
        'name',
        'guardian_name',
        'guardian_relation',
        'guardian_phone',
        'id_proof_type',
        'id_proof_number',
        'mobile',
        'abha_number',
        'abha_address',
        'dob',
        'gender',
        'blood_group',
        'address',
        'city',
        'district',
        'state',
        'pincode',
        'photo',
        'kyc_verified',
        'custom_fields',
        'abha_card_pdf',
    ];

    protected $casts = [
        'dob'           => 'date',
        'kyc_verified'  => 'boolean',
        'custom_fields' => 'array',
    ];

    protected static function booted()
    {
        static::creating(function (Patient $patient) {
            if (empty($patient->uhid) && !empty($patient->hospital_id)) {
                $patient->uhid = Hospital::generateNextUhid($patient->hospital_id);
            }
        });
    }

    public function vitals()
    {
        return $this->hasMany(Vital::class);
    }

    public function latestVital()
    {
        return $this->hasOne(Vital::class)->latestOfMany();
    }

    public function opdVisits()
    {
        return $this->hasMany(OpdVisit::class);
    }

    public function ipdAdmissions()
    {
        return $this->hasMany(IpdAdmission::class);
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class);
    }

    public function billingLedgerItems()
    {
        return $this->hasMany(BillingLedgerItem::class);
    }

    public function latestOpdVisit()
    {
        return $this->hasOne(OpdVisit::class)->latestOfMany();
    }

    public function latestIpdAdmission()
    {
        return $this->hasOne(IpdAdmission::class)->latestOfMany();
    }

    public function latestPrescription()
    {
        return $this->hasOne(Prescription::class)->latestOfMany();
    }
}

