<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class LabAuditLog extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'order_id',
        'order_item_id',
        'user_id',
        'action',
        'description',
        'previous_values',
        'new_values',
        'ip_address',
    ];

    protected $casts = [
        'previous_values' => 'array',
        'new_values'      => 'array',
        'created_at'      => 'datetime',
        'updated_at'      => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(LabOrder::class, 'order_id');
    }

    public function orderItem()
    {
        return $this->belongsTo(LabOrderItem::class, 'order_item_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
