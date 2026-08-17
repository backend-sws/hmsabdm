<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Http\Traits\BelongsToHospital;

class HospitalSetting extends Model
{
    use HasFactory, BelongsToHospital;

    protected $fillable = [
        'hospital_id',
        'group',
        'key',
        'value',
        'type',
    ];

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }

    /**
     * Get a setting value cast to its appropriate PHP type.
     */
    public static function get(int $hospitalId, string $key, mixed $default = null): mixed
    {
        $setting = static::where('hospital_id', $hospitalId)
            ->where('key', $key)
            ->first();

        if (!$setting || $setting->value === null) {
            return $default;
        }

        return match ($setting->type) {
            'integer' => (int) $setting->value,
            'float'   => (float) $setting->value,
            'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
            'json'    => json_decode($setting->value, true),
            default   => $setting->value,
        };
    }

    /**
     * Store or update a key-value setting for a hospital.
     */
    public static function set(int $hospitalId, string $key, mixed $value, string $group = 'general', ?string $type = null): self
    {
        if ($type === null) {
            $type = match (true) {
                is_bool($value) => 'boolean',
                is_int($value)  => 'integer',
                is_float($value)=> 'float',
                is_array($value)=> 'json',
                default         => 'string',
            };
        }

        $stringValue = match ($type) {
            'boolean' => $value ? '1' : '0',
            'json'    => json_encode($value),
            default   => (string) $value,
        };

        return static::updateOrCreate(
            ['hospital_id' => $hospitalId, 'key' => $key],
            [
                'group' => $group,
                'value' => $stringValue,
                'type'  => $type,
            ]
        );
    }

    /**
     * Get all settings under a specific group as an associative array [key => typed_value].
     */
    public static function getGroup(int $hospitalId, string $group): array
    {
        $settings = static::where('hospital_id', $hospitalId)
            ->where('group', $group)
            ->get();

        $result = [];
        foreach ($settings as $setting) {
            $result[$setting->key] = match ($setting->type) {
                'integer' => (int) $setting->value,
                'float'   => (float) $setting->value,
                'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
                'json'    => json_decode($setting->value, true),
                default   => $setting->value,
            };
        }

        return $result;
    }

    /**
     * Store multiple key-value settings under a group.
     */
    public static function setMany(int $hospitalId, array $settings, string $group = 'general'): void
    {
        foreach ($settings as $key => $value) {
            if ($value !== null) {
                static::set($hospitalId, $key, $value, $group);
            }
        }
    }
}
