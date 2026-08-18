<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Hospital extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'address',
        'city',
        'state',
        'pincode',
        'abdm_hip_id',
    ];

    public function settings()
    {
        return $this->hasMany(HospitalSetting::class);
    }

    /**
     * Atomically generates the next unique UHID according to the hospital's key-value settings.
     */
    public static function generateNextUhid(int $hospitalId): string
    {
        return DB::transaction(function () use ($hospitalId) {
            $hospital = static::where('id', $hospitalId)->lockForUpdate()->first();
            
            $currentYear = (int) date('Y');
            $currentMonth = (int) date('n');

            $prefix = HospitalSetting::get($hospitalId, 'uhid_prefix', 'UHID');
            $format = HospitalSetting::get($hospitalId, 'uhid_format', '{PREFIX}-{YEAR}-{SEQ}');
            $padding = HospitalSetting::get($hospitalId, 'uhid_padding', 5);
            $reset = HospitalSetting::get($hospitalId, 'uhid_sequence_reset', 'yearly');
            $seq = HospitalSetting::get($hospitalId, 'uhid_next_sequence', 1);
            $lastYear = HospitalSetting::get($hospitalId, 'uhid_last_reset_year', $currentYear);
            $lastMonth = HospitalSetting::get($hospitalId, 'uhid_last_reset_month', $currentMonth);

            // Handle periodic sequence reset
            if ($reset === 'yearly' && $lastYear !== $currentYear) {
                $seq = 1;
                $lastYear = $currentYear;
            } elseif ($reset === 'monthly' && ($lastYear !== $currentYear || $lastMonth !== $currentMonth)) {
                $seq = 1;
                $lastYear = $currentYear;
                $lastMonth = $currentMonth;
            }

            $paddedSeq = str_pad((string) $seq, $padding, '0', STR_PAD_LEFT);

            $uhid = strtr($format, [
                '{PREFIX}' => $prefix,
                '{CODE}'   => $hospital?->code ?: 'H01',
                '{YEAR}'   => date('Y'),
                '{YY}'     => date('y'),
                '{MONTH}'  => date('m'),
                '{DAY}'    => date('d'),
                '{SEQ}'    => $paddedSeq,
            ]);

            // Save updated sequence and reset tracking back into hospital_settings
            HospitalSetting::set($hospitalId, 'uhid_next_sequence', $seq + 1, 'uhid', 'integer');
            HospitalSetting::set($hospitalId, 'uhid_last_reset_year', $currentYear, 'uhid', 'integer');
            HospitalSetting::set($hospitalId, 'uhid_last_reset_month', $currentMonth, 'uhid', 'integer');

            return $uhid;
        });
    }

    /**
     * Preview sample UHID string for settings UI without incrementing sequence
     */
    public function previewUhid(?string $format = null, ?string $prefix = null, ?int $padding = null, ?int $seq = null): string
    {
        $prefix = $prefix ?? HospitalSetting::get($this->id, 'uhid_prefix', 'UHID');
        $format = $format ?? HospitalSetting::get($this->id, 'uhid_format', '{PREFIX}-{YEAR}-{SEQ}');
        $padding = $padding ?? HospitalSetting::get($this->id, 'uhid_padding', 5);
        $seq = $seq ?? HospitalSetting::get($this->id, 'uhid_next_sequence', 1);
        $paddedSeq = str_pad((string) $seq, $padding, '0', STR_PAD_LEFT);

        return strtr($format, [
            '{PREFIX}' => $prefix,
            '{CODE}'   => $this->code ?: 'H01',
            '{YEAR}'   => date('Y'),
            '{YY}'     => date('y'),
            '{MONTH}'  => date('m'),
            '{DAY}'    => date('d'),
            '{SEQ}'    => $paddedSeq,
        ]);
    }

    /**
     * Atomically generates the next unique OPD Number according to the hospital's key-value settings.
     */
    public static function generateNextOpdNumber(int $hospitalId): string
    {
        return DB::transaction(function () use ($hospitalId) {
            $hospital = static::where('id', $hospitalId)->lockForUpdate()->first();
            
            $currentYear = (int) date('Y');
            $currentMonth = (int) date('n');
            $currentDay = (int) date('j');

            $prefix = HospitalSetting::get($hospitalId, 'opd_prefix', 'OPD');
            $format = HospitalSetting::get($hospitalId, 'opd_format', '{PREFIX}-{YEAR}-{SEQ}');
            $padding = HospitalSetting::get($hospitalId, 'opd_padding', 5);
            $reset = HospitalSetting::get($hospitalId, 'opd_sequence_reset', 'yearly');
            $seq = HospitalSetting::get($hospitalId, 'opd_next_sequence', 1);
            $lastYear = HospitalSetting::get($hospitalId, 'opd_last_reset_year', $currentYear);
            $lastMonth = HospitalSetting::get($hospitalId, 'opd_last_reset_month', $currentMonth);
            $lastDay = HospitalSetting::get($hospitalId, 'opd_last_reset_day', $currentDay);

            // Handle periodic sequence reset
            if ($reset === 'yearly' && $lastYear !== $currentYear) {
                $seq = 1;
                $lastYear = $currentYear;
            } elseif ($reset === 'monthly' && ($lastYear !== $currentYear || $lastMonth !== $currentMonth)) {
                $seq = 1;
                $lastYear = $currentYear;
                $lastMonth = $currentMonth;
            } elseif ($reset === 'daily' && ($lastYear !== $currentYear || $lastMonth !== $currentMonth || $lastDay !== $currentDay)) {
                $seq = 1;
                $lastYear = $currentYear;
                $lastMonth = $currentMonth;
                $lastDay = $currentDay;
            }

            $paddedSeq = str_pad((string) $seq, $padding, '0', STR_PAD_LEFT);

            $opdNumber = strtr($format, [
                '{PREFIX}' => $prefix,
                '{CODE}'   => $hospital?->code ?: 'H01',
                '{YEAR}'   => date('Y'),
                '{YY}'     => date('y'),
                '{MONTH}'  => date('m'),
                '{DAY}'    => date('d'),
                '{SEQ}'    => $paddedSeq,
            ]);

            // Save updated sequence and reset tracking back into hospital_settings
            HospitalSetting::set($hospitalId, 'opd_next_sequence', $seq + 1, 'opd_number', 'integer');
            HospitalSetting::set($hospitalId, 'opd_last_reset_year', $currentYear, 'opd_number', 'integer');
            HospitalSetting::set($hospitalId, 'opd_last_reset_month', $currentMonth, 'opd_number', 'integer');
            HospitalSetting::set($hospitalId, 'opd_last_reset_day', $currentDay, 'opd_number', 'integer');

            return $opdNumber;
        });
    }

    /**
     * Preview sample OPD Number string for settings UI without incrementing sequence
     */
    public function previewOpdNumber(?string $format = null, ?string $prefix = null, ?int $padding = null, ?int $seq = null): string
    {
        $prefix = $prefix ?? HospitalSetting::get($this->id, 'opd_prefix', 'OPD');
        $format = $format ?? HospitalSetting::get($this->id, 'opd_format', '{PREFIX}-{YEAR}-{SEQ}');
        $padding = $padding ?? HospitalSetting::get($this->id, 'opd_padding', 5);
        $seq = $seq ?? HospitalSetting::get($this->id, 'opd_next_sequence', 1);
        $paddedSeq = str_pad((string) $seq, $padding, '0', STR_PAD_LEFT);

        return strtr($format, [
            '{PREFIX}' => $prefix,
            '{CODE}'   => $this->code ?: 'H01',
            '{YEAR}'   => date('Y'),
            '{YY}'     => date('y'),
            '{MONTH}'  => date('m'),
            '{DAY}'    => date('d'),
            '{SEQ}'    => $paddedSeq,
        ]);
    }

    /**
     * Atomically generates the next unique IPD Number according to the hospital's key-value settings.
     */
    public static function generateNextIpdNumber(int $hospitalId): string
    {
        return DB::transaction(function () use ($hospitalId) {
            $hospital = static::where('id', $hospitalId)->lockForUpdate()->first();
            
            $currentYear = (int) date('Y');
            $currentMonth = (int) date('n');

            $prefix = HospitalSetting::get($hospitalId, 'ipd_prefix', 'IPD');
            $format = HospitalSetting::get($hospitalId, 'ipd_format', '{PREFIX}-{YEAR}-{SEQ}');
            $padding = HospitalSetting::get($hospitalId, 'ipd_padding', 5);
            $reset = HospitalSetting::get($hospitalId, 'ipd_sequence_reset', 'yearly');
            $seq = HospitalSetting::get($hospitalId, 'ipd_next_sequence', 1);
            $lastYear = HospitalSetting::get($hospitalId, 'ipd_last_reset_year', $currentYear);
            $lastMonth = HospitalSetting::get($hospitalId, 'ipd_last_reset_month', $currentMonth);

            // Handle periodic sequence reset
            if ($reset === 'yearly' && $lastYear !== $currentYear) {
                $seq = 1;
                $lastYear = $currentYear;
            } elseif ($reset === 'monthly' && ($lastYear !== $currentYear || $lastMonth !== $currentMonth)) {
                $seq = 1;
                $lastYear = $currentYear;
                $lastMonth = $currentMonth;
            }

            $paddedSeq = str_pad((string) $seq, $padding, '0', STR_PAD_LEFT);

            $ipdNumber = strtr($format, [
                '{PREFIX}' => $prefix,
                '{CODE}'   => $hospital?->code ?: 'H01',
                '{YEAR}'   => date('Y'),
                '{YY}'     => date('y'),
                '{MONTH}'  => date('m'),
                '{DAY}'    => date('d'),
                '{SEQ}'    => $paddedSeq,
            ]);

            // Save updated sequence and reset tracking back into hospital_settings
            HospitalSetting::set($hospitalId, 'ipd_next_sequence', $seq + 1, 'ipd_number', 'integer');
            HospitalSetting::set($hospitalId, 'ipd_last_reset_year', $currentYear, 'ipd_number', 'integer');
            HospitalSetting::set($hospitalId, 'ipd_last_reset_month', $currentMonth, 'ipd_number', 'integer');

            return $ipdNumber;
        });
    }

    /**
     * Preview sample IPD Number string for settings UI without incrementing sequence
     */
    public function previewIpdNumber(?string $format = null, ?string $prefix = null, ?int $padding = null, ?int $seq = null): string
    {
        $prefix = $prefix ?? HospitalSetting::get($this->id, 'ipd_prefix', 'IPD');
        $format = $format ?? HospitalSetting::get($this->id, 'ipd_format', '{PREFIX}-{YEAR}-{SEQ}');
        $padding = $padding ?? HospitalSetting::get($this->id, 'ipd_padding', 5);
        $seq = $seq ?? HospitalSetting::get($this->id, 'ipd_next_sequence', 1);
        $paddedSeq = str_pad((string) $seq, $padding, '0', STR_PAD_LEFT);

        return strtr($format, [
            '{PREFIX}' => $prefix,
            '{CODE}'   => $this->code ?: 'H01',
            '{YEAR}'   => date('Y'),
            '{YY}'     => date('y'),
            '{MONTH}'  => date('m'),
            '{DAY}'    => date('d'),
            '{SEQ}'    => $paddedSeq,
        ]);
    }
}
