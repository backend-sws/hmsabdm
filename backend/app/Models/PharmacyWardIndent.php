<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class PharmacyWardIndent extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'pharmacy_ward_indents';

    protected $fillable = [
        'hospital_id',
        'indent_number',
        'ipd_admission_id',
        'patient_id',
        'ward_name',
        'bed_number',
        'priority',
        'status',
        'requested_by_user_id',
        'dispensed_by_user_id',
        'dispensed_at',
        'notes',
        'rejection_reason',
        'total_taxable',
        'total_tax',
        'total_amount',
    ];

    protected $casts = [
        'dispensed_at'  => 'datetime',
        'total_taxable' => 'float',
        'total_tax'     => 'float',
        'total_amount'  => 'float',
    ];

    public function ipdAdmission()
    {
        return $this->belongsTo(IpdAdmission::class, 'ipd_admission_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function items()
    {
        return $this->hasMany(PharmacyWardIndentItem::class, 'ward_indent_id');
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function dispensedBy()
    {
        return $this->belongsTo(User::class, 'dispensed_by_user_id');
    }
}
