<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class IpdNursingProcedure extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'ipd_nursing_procedures';

    protected $fillable = [
        'hospital_id',
        'ipd_admission_id',
        'patient_id',
        'procedure_name',
        'procedure_code',
        'performed_at',
        'performed_by_user_id',
        'performed_by_name',
        'notes',
        'charge_amount',
        'billing_ledger_item_id',
    ];

    protected $casts = [
        'performed_at'  => 'datetime',
        'charge_amount' => 'float',
    ];

    public function admission()
    {
        return $this->belongsTo(IpdAdmission::class, 'ipd_admission_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function performedByUser()
    {
        return $this->belongsTo(User::class, 'performed_by_user_id');
    }

    public function ledgerItem()
    {
        return $this->belongsTo(BillingLedgerItem::class, 'billing_ledger_item_id');
    }
}
