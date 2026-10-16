<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LabDepartment extends Model
{
    use HasFactory;

    protected $fillable = [
        'hospital_id',
        'name',
        'code',
        'is_system',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_system'  => 'boolean',
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    public function tests()
    {
        return $this->hasMany(LabTestTemplate::class, 'department_id');
    }
}
