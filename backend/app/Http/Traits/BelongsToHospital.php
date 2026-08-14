<?php

namespace App\Http\Traits;

use App\Models\Hospital;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

trait BelongsToHospital
{
    /**
     * Initialize the trait to hide hospital_id in API responses.
     */
    public function initializeBelongsToHospital()
    {
        $this->hidden[] = 'hospital_id';
    }

    /**
     * Resolve the active hospital ID from auth user, request header, or request parameter.
     */
    public static function getActiveHospitalId(): ?int
    {
        if (Auth::hasUser()) {
            $user = Auth::user();
            if (!empty($user->hospital_id)) {
                return (int) $user->hospital_id;
            }
        }

        if (function_exists('request') && request()) {
            $reqHospitalId = request()->user()?->hospital_id 
                ?? request()->header('X-Hospital-ID')
                ?? request()->query('hospital_id')
                ?? request()->input('hospital_id');

            if (!empty($reqHospitalId)) {
                return (int) $reqHospitalId;
            }
        }

        return null;
    }

    /**
     * Boot the trait to apply the global scope and auto-inject hospital_id on creation.
     */
    protected static function bootBelongsToHospital(): void
    {
        // 1. Auto-inject hospital_id on model creation if not explicitly set
        static::creating(function ($model) {
            if (empty($model->hospital_id)) {
                $activeHospitalId = static::getActiveHospitalId();
                if ($activeHospitalId) {
                    $model->hospital_id = $activeHospitalId;
                }
            }
        });

        // 2. Apply multi-tenant global scope on queries
        static::addGlobalScope('tenant', function (Builder $builder) {
            $activeHospitalId = static::getActiveHospitalId();
            if ($activeHospitalId) {
                $builder->where($builder->getModel()->getTable() . '.hospital_id', $activeHospitalId);
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
