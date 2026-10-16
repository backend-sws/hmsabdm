<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LabParameter extends Model
{
    use HasFactory;

    protected $fillable = [
        'hospital_id',
        'test_template_id',
        'name',
        'short_code',
        'unit',
        'input_type',
        'method',
        'options',
        'is_calculated',
        'formula',
        'range_type',
        'display_order',
        'is_mandatory',
        'is_active',
    ];

    protected $casts = [
        'options'       => 'array',
        'is_calculated' => 'boolean',
        'is_mandatory'  => 'boolean',
        'is_active'     => 'boolean',
        'display_order' => 'integer',
    ];

    public function testTemplate()
    {
        return $this->belongsTo(LabTestTemplate::class, 'test_template_id');
    }

    public function referenceRanges()
    {
        return $this->hasMany(LabParameterReferenceRange::class, 'parameter_id');
    }
}
