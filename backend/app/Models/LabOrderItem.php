<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class LabOrderItem extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'order_id',
        'prescription_investigation_id',
        'test_template_id',
        'test_name',
        'test_code',
        'category',
        'rate',
        'status',
        'technician_remarks',
        'pathologist_remarks',
        'fulfillment_type',
        'outsource_status',
        'external_vendor_id',
        'outsource_manifest_id',
        'b2b_cost',
        'external_accession_no',
        'external_report_file',
        'outsourced_at',
        'outsource_received_at',
    ];

    protected $casts = [
        'rate'                  => 'float',
        'b2b_cost'              => 'float',
        'outsourced_at'         => 'datetime',
        'outsource_received_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(LabOrder::class, 'order_id');
    }

    public function externalVendor()
    {
        return $this->belongsTo(LabExternalVendor::class, 'external_vendor_id');
    }

    public function manifest()
    {
        return $this->belongsTo(LabOutsourceManifest::class, 'outsource_manifest_id');
    }

    public function testTemplate()
    {
        return $this->belongsTo(LabTestTemplate::class, 'test_template_id');
    }

    public function prescriptionInvestigation()
    {
        return $this->belongsTo(PrescriptionInvestigation::class, 'prescription_investigation_id');
    }

    public function results()
    {
        return $this->hasMany(LabTestResult::class, 'order_item_id')->orderBy('display_order');
    }
}
