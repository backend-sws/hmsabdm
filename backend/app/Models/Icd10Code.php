<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Icd10Code extends Model
{
    use HasFactory;

    protected $table = 'icd10_codes';

    protected $fillable = [
        'code',
        'code_with_separator',
        'short_description',
        'long_description',
        'is_billable',
        'is_header',
        'category_code',
    ];

    protected $casts = [
        'is_billable' => 'boolean',
        'is_header'   => 'boolean',
    ];

    public function prescriptionDiagnoses()
    {
        return $this->hasMany(PrescriptionDiagnosis::class, 'icd10_id');
    }
}
