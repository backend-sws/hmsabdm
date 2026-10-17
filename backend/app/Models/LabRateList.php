<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class LabRateList extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'lab_rate_lists';

    protected $fillable = [
        'hospital_id',
        'name',
        'code',
        'description',
        'is_default',
        'is_active',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active'  => 'boolean',
    ];

    public function items()
    {
        return $this->hasMany(LabRateListItem::class, 'rate_list_id');
    }
}
