<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class LabOutsourceManifest extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'lab_outsource_manifests';

    protected $fillable = [
        'hospital_id',
        'vendor_id',
        'manifest_number',
        'status',
        'temperature_condition',
        'courier_name',
        'courier_phone',
        'courier_tracking_no',
        'total_samples',
        'dispatched_at',
        'dispatched_by_user_id',
        'received_at_vendor_at',
        'notes',
    ];

    protected $casts = [
        'total_samples'         => 'integer',
        'dispatched_at'         => 'datetime',
        'received_at_vendor_at' => 'datetime',
    ];

    public function vendor()
    {
        return $this->belongsTo(LabExternalVendor::class, 'vendor_id');
    }

    public function dispatchedBy()
    {
        return $this->belongsTo(User::class, 'dispatched_by_user_id');
    }

    public function orderItems()
    {
        return $this->hasMany(LabOrderItem::class, 'outsource_manifest_id');
    }
}
