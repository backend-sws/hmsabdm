<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class PrescriptionInvestigation extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'prescription_id',
        'patient_id',
        'test_name',
        'test_code',
        'category',
        'urgency',
        'standard_rate',
        'clinical_indication',
        'status',
        'billed_invoice_id',
    ];

    protected $casts = [
        'standard_rate' => 'float',
    ];

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function billedInvoice()
    {
        return $this->belongsTo(Invoice::class, 'billed_invoice_id');
    }
}
