<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class LabTestResult extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'order_item_id',
        'parameter_id',
        'parameter_name',
        'short_code',
        'unit',
        'method',
        'observed_value',
        'numeric_value',
        'flag',
        'reference_range_text',
        'is_calculated',
        'formula_used',
        'display_order',
    ];

    protected $casts = [
        'numeric_value' => 'float',
        'is_calculated' => 'boolean',
        'display_order' => 'integer',
    ];

    public function orderItem()
    {
        return $this->belongsTo(LabOrderItem::class, 'order_item_id');
    }

    public function parameter()
    {
        return $this->belongsTo(LabParameter::class, 'parameter_id');
    }
}
