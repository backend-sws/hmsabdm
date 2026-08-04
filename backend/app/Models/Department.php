<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class Department extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id', 'name', 'code', 'description', 'is_active'
    ];

    protected $hidden = [
        'created_at', 'updated_at'
    ];

    public function doctors()
    {
        return $this->hasMany(Doctor::class);
    }
}
