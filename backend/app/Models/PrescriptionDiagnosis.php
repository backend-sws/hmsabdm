<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PrescriptionDiagnosis extends Model
{
    use HasFactory;

    protected $fillable = [
        'prescription_id',
        'icd10_id',
        'icd_code',
        'diagnosis_name',
        'diagnosis_type',
        'notes',
    ];

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }

    public function icd10()
    {
        return $this->belongsTo(Icd10Code::class, 'icd10_id');
    }
}
