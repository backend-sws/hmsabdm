<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class PharmacySale extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'pharmacy_sales';

    protected $fillable = [
        'hospital_id',
        'invoice_number',
        'sale_type',
        'patient_id',
        'opd_visit_id',
        'ipd_admission_id',
        'prescription_id',
        'customer_name',
        'customer_phone',
        'doctor_name',
        'doctor_reg_no',
        'subtotal_amount',
        'discount_amount',
        'taxable_amount',
        'cgst_amount',
        'sgst_amount',
        'round_off',
        'net_amount',
        'payment_mode',
        'payment_details',
        'payment_status',
        'notes',
        'billed_by_user_id',
    ];

    protected $casts = [
        'subtotal_amount' => 'float',
        'discount_amount' => 'float',
        'taxable_amount'  => 'float',
        'cgst_amount'     => 'float',
        'sgst_amount'     => 'float',
        'round_off'       => 'float',
        'net_amount'      => 'float',
        'payment_details' => 'array',
    ];

    protected static function booted()
    {
        static::creating(function (PharmacySale $sale) {
            if (empty($sale->invoice_number)) {
                $year = date('Y');
                $random = strtoupper(substr(uniqid(), -5));
                $sale->invoice_number = "INV-PHARM-{$year}-{$random}";
            }
        });
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function opdVisit()
    {
        return $this->belongsTo(OpdVisit::class, 'opd_visit_id');
    }

    public function ipdAdmission()
    {
        return $this->belongsTo(IpdAdmission::class, 'ipd_admission_id');
    }

    public function prescription()
    {
        return $this->belongsTo(Prescription::class, 'prescription_id');
    }

    public function items()
    {
        return $this->hasMany(PharmacySaleItem::class, 'sale_id');
    }

    public function returns()
    {
        return $this->hasMany(PharmacyReturn::class, 'sale_id');
    }

    public function billedByUser()
    {
        return $this->belongsTo(User::class, 'billed_by_user_id');
    }
}
