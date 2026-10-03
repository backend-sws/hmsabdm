<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class Invoice extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'invoices';

    protected $fillable = [
        'hospital_id',
        'patient_id',
        'encounter_type',
        'encounter_id',
        'invoice_number',
        'invoice_date',
        'gross_amount',
        'discount_amount',
        'discount_reason',
        'tax_amount',
        'net_amount',
        'advance_adjusted',
        'insurance_approved_amount',
        'tpa_claim_number',
        'insurance_company_name',
        'amount_paid',
        'balance_due',
        'payment_method',
        'payment_breakdown',
        'payment_status',
        'status',
        'gate_pass_number',
        'gate_pass_issued_at',
        'created_by_user_id',
        'notes',
    ];

    protected $casts = [
        'invoice_date'              => 'datetime',
        'gross_amount'              => 'float',
        'discount_amount'           => 'float',
        'tax_amount'                => 'float',
        'net_amount'                => 'float',
        'advance_adjusted'          => 'float',
        'insurance_approved_amount' => 'float',
        'amount_paid'               => 'float',
        'balance_due'               => 'float',
        'payment_breakdown'         => 'array',
        'gate_pass_issued_at'       => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function (Invoice $inv) {
            if (empty($inv->invoice_number)) {
                $year = date('Y');
                $random = strtoupper(substr(uniqid(), -5));
                $inv->invoice_number = "INV-{$year}-{$random}";
            }
            if (empty($inv->invoice_date)) {
                $inv->invoice_date = now();
            }
        });
    }

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function admission()
    {
        return $this->belongsTo(IpdAdmission::class, 'encounter_id');
    }

    public function ledgerItems()
    {
        return $this->hasMany(BillingLedgerItem::class, 'invoice_id');
    }

    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
