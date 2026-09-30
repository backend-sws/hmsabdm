<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class IpdDoctorRound extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'ipd_doctor_rounds';

    protected $fillable = [
        'hospital_id',
        'ipd_admission_id',
        'patient_id',
        'doctor_id',
        'round_date',
        'round_time',
        'round_type',
        'subjective',
        'objective',
        'assessment',
        'plan',
        'diet_advice',
        'clinical_condition',
        'is_discharge_planned',
        'planned_discharge_date',
        'fee_charged',
        'billing_ledger_item_id',
        'created_by_user_id',
    ];

    protected $casts = [
        'round_date'             => 'date',
        'is_discharge_planned'   => 'boolean',
        'planned_discharge_date' => 'date',
        'fee_charged'            => 'float',
    ];

    public function admission()
    {
        return $this->belongsTo(IpdAdmission::class, 'ipd_admission_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }

    public function ledgerItem()
    {
        return $this->belongsTo(BillingLedgerItem::class, 'billing_ledger_item_id');
    }

    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
