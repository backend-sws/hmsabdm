<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LabRateListItem extends Model
{
    use HasFactory;

    protected $table = 'lab_rate_list_items';

    protected $fillable = [
        'rate_list_id',
        'test_template_id',
        'patient_price',
        'b2b_cost',
    ];

    protected $casts = [
        'patient_price' => 'float',
        'b2b_cost'      => 'float',
    ];

    public function rateList()
    {
        return $this->belongsTo(LabRateList::class, 'rate_list_id');
    }

    public function testTemplate()
    {
        return $this->belongsTo(LabTestTemplate::class, 'test_template_id');
    }
}
