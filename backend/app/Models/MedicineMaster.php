<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicineMaster extends Model
{
    use HasFactory;

    protected $table = 'medicines_master';

    protected $fillable = [
        'brand_name',
        'generic_name',
        'salt_composition',
        'dosage_form',
        'manufacturer',
        'therapeutic_category',
        'prescription_type',
        'mrp',
        'is_generic',
        'is_active',
    ];

    protected $casts = [
        'mrp'        => 'float',
        'is_generic' => 'boolean',
        'is_active'  => 'boolean',
    ];

    public function prescriptionItems()
    {
        return $this->hasMany(PrescriptionItem::class, 'medicine_id');
    }
}
