<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class VitalFieldConfig extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'field_key',
        'label',
        'category',
        'unit',
        'input_type',
        'options',
        'min_value',
        'max_value',
        'is_required',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'options'     => 'array',
        'min_value'   => 'float',
        'max_value'   => 'float',
        'is_required' => 'boolean',
        'is_active'   => 'boolean',
        'sort_order'  => 'integer',
    ];

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }
}
