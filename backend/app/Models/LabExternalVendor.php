<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class LabExternalVendor extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'lab_external_vendors';

    protected $fillable = [
        'hospital_id',
        'vendor_code',
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'pickup_schedule',
        'default_courier',
        'account_number',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function manifests()
    {
        return $this->hasMany(LabOutsourceManifest::class, 'vendor_id');
    }

    public function orderItems()
    {
        return $this->hasMany(LabOrderItem::class, 'external_vendor_id');
    }

    public function testTemplates()
    {
        return $this->hasMany(LabTestTemplate::class, 'default_vendor_id');
    }
}
