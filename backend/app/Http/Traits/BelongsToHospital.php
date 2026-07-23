<?php

namespace App\Http\Traits;

use App\Models\Hospital;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

trait BelongsToHospital
{
    /**
     * Boot the trait to apply the global scope anonymously.
     */
    protected static function bootBelongsToHospital(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            if (Auth::hasUser()) {
                $user = Auth::user();
                if ($user->hospital_id) {
                    $builder->where($builder->getModel()->getTable() . '.hospital_id', $user->hospital_id);
                }
            }
        });
    }

    /**
     * Relationship to the Hospital model.
     */
    public function hospital(): BelongsTo
    {
        return $this->belongsTo(Hospital::class);
    }
}
