<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LabParameterReferenceRange extends Model
{
    use HasFactory;

    protected $fillable = [
        'parameter_id',
        'gender',
        'age_min',
        'age_max',
        'age_unit',
        'min_val',
        'max_val',
        'panic_min',
        'panic_max',
        'normal_value',
        'display_range',
        'interpretation_notes',
    ];

    protected $casts = [
        'age_min'   => 'integer',
        'age_max'   => 'integer',
        'min_val'   => 'float',
        'max_val'   => 'float',
        'panic_min' => 'float',
        'panic_max' => 'float',
    ];

    public function parameter()
    {
        return $this->belongsTo(LabParameter::class, 'parameter_id');
    }
}
