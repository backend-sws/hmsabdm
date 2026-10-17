<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LabTestTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'hospital_id',
        'department_id',
        'category',
        'test_code',
        'test_name',
        'description',
        'interpretation',
        'sample_type',
        'container_color',
        'method',
        'tat_hours',
        'standard_price',
        'loinc_code',
        'is_panel',
        'is_active',
        'sort_order',
        'fulfillment_type',
        'default_vendor_id',
        'b2b_cost',
        'reagent_cost',
    ];

    protected $casts = [
        'standard_price' => 'float',
        'b2b_cost'       => 'float',
        'reagent_cost'   => 'float',
        'tat_hours'      => 'integer',
        'is_panel'       => 'boolean',
        'is_active'      => 'boolean',
        'sort_order'     => 'integer',
    ];

    public function department()
    {
        return $this->belongsTo(LabDepartment::class, 'department_id');
    }

    public function defaultVendor()
    {
        return $this->belongsTo(LabExternalVendor::class, 'default_vendor_id');
    }

    public function parameters()
    {
        return $this->hasMany(LabParameter::class, 'test_template_id')->orderBy('display_order');
    }
}
