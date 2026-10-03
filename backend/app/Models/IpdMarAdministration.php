<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class IpdMarAdministration extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'ipd_mar_administrations';

    protected $fillable = [
        'hospital_id',
        'ipd_admission_id',
        'patient_id',
        'prescription_item_id',
        'medicine_name',
        'dosage',
        'route',
        'scheduled_at',
        'administered_at',
        'administered_by_user_id',
        'administered_by_name',
        'status',
        'omission_reason',
        'batch_number',
        'notes',
        'billing_ledger_item_id',
    ];

    protected $casts = [
        'scheduled_at'    => 'datetime',
        'administered_at' => 'datetime',
    ];

    public function admission()
    {
        return $this->belongsTo(IpdAdmission::class, 'ipd_admission_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function prescriptionItem()
    {
        return $this->belongsTo(PrescriptionItem::class, 'prescription_item_id');
    }

    public function administeredByUser()
    {
        return $this->belongsTo(User::class, 'administered_by_user_id');
    }

    public function ledgerItem()
    {
        return $this->belongsTo(BillingLedgerItem::class, 'billing_ledger_item_id');
    }
}
