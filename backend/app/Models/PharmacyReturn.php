<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class PharmacyReturn extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'pharmacy_returns';

    protected $fillable = [
        'hospital_id',
        'credit_note_number',
        'sale_id',
        'customer_name',
        'customer_phone',
        'return_reason',
        'refund_amount',
        'refund_mode',
        'processed_by_user_id',
    ];

    protected $casts = [
        'refund_amount' => 'float',
    ];

    protected static function booted()
    {
        static::creating(function (PharmacyReturn $ret) {
            if (empty($ret->credit_note_number)) {
                $year = date('Y');
                $random = strtoupper(substr(uniqid(), -5));
                $ret->credit_note_number = "CR-PHARM-{$year}-{$random}";
            }
        });
    }

    public function sale()
    {
        return $this->belongsTo(PharmacySale::class, 'sale_id');
    }

    public function items()
    {
        return $this->hasMany(PharmacyReturnItem::class, 'return_id');
    }

    public function processedByUser()
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }
}
