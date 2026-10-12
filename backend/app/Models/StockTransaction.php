<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class StockTransaction extends Model
{
    use HasFactory, BelongsToHospital;

    protected $table = 'stock_transactions';

    protected $fillable = [
        'hospital_id',
        'hospital_medicine_id',
        'batch_id',
        'transaction_type',
        'quantity_in',
        'quantity_out',
        'balance_after',
        'reference_id',
        'notes',
        'performed_by_user_id',
    ];

    protected $casts = [
        'quantity_in'   => 'integer',
        'quantity_out'  => 'integer',
        'balance_after' => 'integer',
    ];

    public function medicine()
    {
        return $this->belongsTo(HospitalMedicine::class, 'hospital_medicine_id');
    }

    public function batch()
    {
        return $this->belongsTo(PharmacyBatch::class, 'batch_id');
    }

    public function performedByUser()
    {
        return $this->belongsTo(User::class, 'performed_by_user_id');
    }
}
