<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class IpdIntakeOutput extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'ipd_intake_outputs';

    protected $fillable = [
        'hospital_id',
        'ipd_admission_id',
        'patient_id',
        'entry_type',
        'category',
        'item_name',
        'quantity_ml',
        'route',
        'recorded_at',
        'recorded_by_user_id',
        'recorded_by_name',
        'remarks',
    ];

    protected $casts = [
        'quantity_ml' => 'float',
        'recorded_at' => 'datetime',
    ];

    public function admission()
    {
        return $this->belongsTo(IpdAdmission::class, 'ipd_admission_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function recordedByUser()
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }
}
