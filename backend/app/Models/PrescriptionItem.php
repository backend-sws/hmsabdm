<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PrescriptionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'prescription_id',
        'medicine_id',
        'medicine_name',
        'generic_name',
        'dosage_form',
        'dosage',
        'frequency',
        'duration_days',
        'timing',
        'instructions',
        'is_dispensed',
    ];

    protected $casts = [
        'duration_days' => 'integer',
        'is_dispensed'  => 'boolean',
    ];

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }

    public function medicine()
    {
        return $this->belongsTo(MedicineMaster::class, 'medicine_id');
    }
}
