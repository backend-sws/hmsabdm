<?php

namespace App\Services\HospitalSetting;

use App\Models\Hospital;
use App\Models\HospitalSetting;

class HospitalSettingService implements HospitalSettingServiceInterface
{
    public function getUhidConfig(int $hospitalId): array
    {
        $hospital = Hospital::findOrFail($hospitalId);

        $prefix = HospitalSetting::get($hospitalId, 'uhid_prefix', 'UHID');
        $format = HospitalSetting::get($hospitalId, 'uhid_format', '{PREFIX}-{YEAR}-{SEQ}');
        $padding = HospitalSetting::get($hospitalId, 'uhid_padding', 5);
        $reset = HospitalSetting::get($hospitalId, 'uhid_sequence_reset', 'yearly');
        $nextSeq = HospitalSetting::get($hospitalId, 'uhid_next_sequence', 1);

        return [
            'uhid_prefix'          => $prefix,
            'uhid_format'          => $format,
            'uhid_padding'         => $padding,
            'uhid_sequence_reset'  => $reset,
            'uhid_next_sequence'   => $nextSeq,
            'preview_sample'       => $hospital->previewUhid(),
            'available_formats'    => [
                [
                    'label'  => 'Prefix - Year - Sequence (Standard)',
                    'format' => '{PREFIX}-{YEAR}-{SEQ}',
                    'sample' => $hospital->previewUhid('{PREFIX}-{YEAR}-{SEQ}'),
                ],
                [
                    'label'  => 'Prefix - YearMonth - Sequence',
                    'format' => '{PREFIX}-{YEAR}{MONTH}-{SEQ}',
                    'sample' => $hospital->previewUhid('{PREFIX}-{YEAR}{MONTH}-{SEQ}'),
                ],
                [
                    'label'  => 'Hospital Code - Year - Sequence',
                    'format' => '{CODE}-{YEAR}-{SEQ}',
                    'sample' => $hospital->previewUhid('{CODE}-{YEAR}-{SEQ}'),
                ],
                [
                    'label'  => 'Prefix - Sequence (Continuous)',
                    'format' => '{PREFIX}-{SEQ}',
                    'sample' => $hospital->previewUhid('{PREFIX}-{SEQ}'),
                ],
                [
                    'label'  => 'Short Year - Sequence',
                    'format' => '{PREFIX}-{YY}-{SEQ}',
                    'sample' => $hospital->previewUhid('{PREFIX}-{YY}-{SEQ}'),
                ],
                [
                    'label'  => 'Prefix / Year / Sequence (Slash format)',
                    'format' => '{PREFIX}/{YEAR}/{SEQ}',
                    'sample' => $hospital->previewUhid('{PREFIX}/{YEAR}/{SEQ}'),
                ],
            ],
            'available_resets'     => [
                ['value' => 'yearly',  'label' => 'Reset to 1 every year (e.g., 2026 -> 2027)'],
                ['value' => 'monthly', 'label' => 'Reset to 1 every month'],
                ['value' => 'never',   'label' => 'Never reset (continuous forever)'],
            ],
            'available_placeholders' => [
                '{PREFIX}' => 'Configured Prefix (e.g. UHID, HOSP, AIIMS)',
                '{CODE}'   => 'Hospital Short Code (e.g. ' . ($hospital->code ?: 'H01') . ')',
                '{YEAR}'   => '4-digit Year (' . date('Y') . ')',
                '{YY}'     => '2-digit Year (' . date('y') . ')',
                '{MONTH}'  => '2-digit Month (' . date('m') . ')',
                '{DAY}'    => '2-digit Day (' . date('d') . ')',
                '{SEQ}'    => 'Auto-increment sequence number (e.g. 00001)',
            ]
        ];
    }

    public function updateUhidConfig(int $hospitalId, array $data): array
    {
        $hospital = Hospital::findOrFail($hospitalId);

        if (isset($data['uhid_prefix'])) {
            HospitalSetting::set($hospitalId, 'uhid_prefix', $data['uhid_prefix'], 'uhid', 'string');
        }
        if (isset($data['uhid_format'])) {
            HospitalSetting::set($hospitalId, 'uhid_format', $data['uhid_format'], 'uhid', 'string');
        }
        if (isset($data['uhid_padding'])) {
            HospitalSetting::set($hospitalId, 'uhid_padding', (int) $data['uhid_padding'], 'uhid', 'integer');
        }
        if (isset($data['uhid_sequence_reset'])) {
            HospitalSetting::set($hospitalId, 'uhid_sequence_reset', $data['uhid_sequence_reset'], 'uhid', 'string');
        }
        if (isset($data['uhid_next_sequence'])) {
            HospitalSetting::set($hospitalId, 'uhid_next_sequence', (int) $data['uhid_next_sequence'], 'uhid', 'integer');
        }

        return [
            'settings'       => HospitalSetting::getGroup($hospitalId, 'uhid'),
            'preview_sample' => $hospital->previewUhid(),
        ];
    }

    public function getOpdConfig(int $hospitalId): array
    {
        $hospital = Hospital::findOrFail($hospitalId);

        $prefix = HospitalSetting::get($hospitalId, 'opd_prefix', 'OPD');
        $format = HospitalSetting::get($hospitalId, 'opd_format', '{PREFIX}-{YEAR}-{SEQ}');
        $padding = HospitalSetting::get($hospitalId, 'opd_padding', 5);
        $reset = HospitalSetting::get($hospitalId, 'opd_sequence_reset', 'yearly');
        $nextSeq = HospitalSetting::get($hospitalId, 'opd_next_sequence', 1);

        return [
            'opd_prefix'          => $prefix,
            'opd_format'          => $format,
            'opd_padding'         => $padding,
            'opd_sequence_reset'  => $reset,
            'opd_next_sequence'   => $nextSeq,
            'preview_sample'      => $hospital->previewOpdNumber(),
            'available_formats'   => [
                [
                    'label'  => 'Prefix - Year - Sequence (Standard)',
                    'format' => '{PREFIX}-{YEAR}-{SEQ}',
                    'sample' => $hospital->previewOpdNumber('{PREFIX}-{YEAR}-{SEQ}'),
                ],
                [
                    'label'  => 'Prefix - YearMonth - Sequence',
                    'format' => '{PREFIX}-{YEAR}{MONTH}-{SEQ}',
                    'sample' => $hospital->previewOpdNumber('{PREFIX}-{YEAR}{MONTH}-{SEQ}'),
                ],
                [
                    'label'  => 'Prefix - Full Date - Sequence',
                    'format' => '{PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ}',
                    'sample' => $hospital->previewOpdNumber('{PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ}'),
                ],
                [
                    'label'  => 'Hospital Code - OPD - Year - Sequence',
                    'format' => '{CODE}-OPD-{YEAR}-{SEQ}',
                    'sample' => $hospital->previewOpdNumber('{CODE}-OPD-{YEAR}-{SEQ}'),
                ],
                [
                    'label'  => 'Prefix / Year / Sequence (Slash format)',
                    'format' => '{PREFIX}/{YEAR}/{SEQ}',
                    'sample' => $hospital->previewOpdNumber('{PREFIX}/{YEAR}/{SEQ}'),
                ],
            ],
            'available_resets'    => [
                ['value' => 'daily',   'label' => 'Reset to 1 every day (daily sequence)'],
                ['value' => 'monthly', 'label' => 'Reset to 1 every month'],
                ['value' => 'yearly',  'label' => 'Reset to 1 every year (e.g., 2026 -> 2027)'],
                ['value' => 'never',   'label' => 'Never reset (continuous sequence)'],
            ],
            'available_placeholders' => [
                '{PREFIX}' => 'Configured Prefix (e.g. OPD, CLINIC)',
                '{CODE}'   => 'Hospital Short Code (e.g. ' . ($hospital->code ?: 'H01') . ')',
                '{YEAR}'   => '4-digit Year (' . date('Y') . ')',
                '{YY}'     => '2-digit Year (' . date('y') . ')',
                '{MONTH}'  => '2-digit Month (' . date('m') . ')',
                '{DAY}'    => '2-digit Day (' . date('d') . ')',
                '{SEQ}'    => 'Auto-increment sequence number (e.g. 00001)',
            ]
        ];
    }

    public function updateOpdConfig(int $hospitalId, array $data): array
    {
        $hospital = Hospital::findOrFail($hospitalId);

        if (isset($data['opd_prefix'])) {
            HospitalSetting::set($hospitalId, 'opd_prefix', $data['opd_prefix'], 'opd_number', 'string');
        }
        if (isset($data['opd_format'])) {
            HospitalSetting::set($hospitalId, 'opd_format', $data['opd_format'], 'opd_number', 'string');
        }
        if (isset($data['opd_padding'])) {
            HospitalSetting::set($hospitalId, 'opd_padding', (int) $data['opd_padding'], 'opd_number', 'integer');
        }
        if (isset($data['opd_sequence_reset'])) {
            HospitalSetting::set($hospitalId, 'opd_sequence_reset', $data['opd_sequence_reset'], 'opd_number', 'string');
        }
        if (isset($data['opd_next_sequence'])) {
            HospitalSetting::set($hospitalId, 'opd_next_sequence', (int) $data['opd_next_sequence'], 'opd_number', 'integer');
        }

        return [
            'settings'       => HospitalSetting::getGroup($hospitalId, 'opd_number'),
            'preview_sample' => $hospital->previewOpdNumber(),
        ];
    }

    public function getIpdConfig(int $hospitalId): array
    {
        $hospital = Hospital::findOrFail($hospitalId);

        $prefix = HospitalSetting::get($hospitalId, 'ipd_prefix', 'IPD');
        $format = HospitalSetting::get($hospitalId, 'ipd_format', '{PREFIX}-{YEAR}-{SEQ}');
        $padding = HospitalSetting::get($hospitalId, 'ipd_padding', 5);
        $reset = HospitalSetting::get($hospitalId, 'ipd_sequence_reset', 'yearly');
        $nextSeq = HospitalSetting::get($hospitalId, 'ipd_next_sequence', 1);

        return [
            'ipd_prefix'          => $prefix,
            'ipd_format'          => $format,
            'ipd_padding'         => $padding,
            'ipd_sequence_reset'  => $reset,
            'ipd_next_sequence'   => $nextSeq,
            'preview_sample'      => $hospital->previewIpdNumber(),
            'available_formats'   => [
                [
                    'label'  => 'Prefix - Year - Sequence (Standard)',
                    'format' => '{PREFIX}-{YEAR}-{SEQ}',
                    'sample' => $hospital->previewIpdNumber('{PREFIX}-{YEAR}-{SEQ}'),
                ],
                [
                    'label'  => 'Prefix - YearMonth - Sequence',
                    'format' => '{PREFIX}-{YEAR}{MONTH}-{SEQ}',
                    'sample' => $hospital->previewIpdNumber('{PREFIX}-{YEAR}{MONTH}-{SEQ}'),
                ],
                [
                    'label'  => 'Hospital Code - IPD - Year - Sequence',
                    'format' => '{CODE}-IPD-{YEAR}-{SEQ}',
                    'sample' => $hospital->previewIpdNumber('{CODE}-IPD-{YEAR}-{SEQ}'),
                ],
                [
                    'label'  => 'Prefix / Year / Sequence (Slash format)',
                    'format' => '{PREFIX}/{YEAR}/{SEQ}',
                    'sample' => $hospital->previewIpdNumber('{PREFIX}/{YEAR}/{SEQ}'),
                ],
            ],
            'available_resets'    => [
                ['value' => 'monthly', 'label' => 'Reset to 1 every month'],
                ['value' => 'yearly',  'label' => 'Reset to 1 every year (e.g., 2026 -> 2027)'],
                ['value' => 'never',   'label' => 'Never reset (continuous sequence)'],
            ],
            'available_placeholders' => [
                '{PREFIX}' => 'Configured Prefix (e.g. IPD, ADM)',
                '{CODE}'   => 'Hospital Short Code (e.g. ' . ($hospital->code ?: 'H01') . ')',
                '{YEAR}'   => '4-digit Year (' . date('Y') . ')',
                '{YY}'     => '2-digit Year (' . date('y') . ')',
                '{MONTH}'  => '2-digit Month (' . date('m') . ')',
                '{DAY}'    => '2-digit Day (' . date('d') . ')',
                '{SEQ}'    => 'Auto-increment sequence number (e.g. 00001)',
            ]
        ];
    }

    public function updateIpdConfig(int $hospitalId, array $data): array
    {
        $hospital = Hospital::findOrFail($hospitalId);

        if (isset($data['ipd_prefix'])) {
            HospitalSetting::set($hospitalId, 'ipd_prefix', $data['ipd_prefix'], 'ipd_number', 'string');
        }
        if (isset($data['ipd_format'])) {
            HospitalSetting::set($hospitalId, 'ipd_format', $data['ipd_format'], 'ipd_number', 'string');
        }
        if (isset($data['ipd_padding'])) {
            HospitalSetting::set($hospitalId, 'ipd_padding', (int) $data['ipd_padding'], 'ipd_number', 'integer');
        }
        if (isset($data['ipd_sequence_reset'])) {
            HospitalSetting::set($hospitalId, 'ipd_sequence_reset', $data['ipd_sequence_reset'], 'ipd_number', 'string');
        }
        if (isset($data['ipd_next_sequence'])) {
            HospitalSetting::set($hospitalId, 'ipd_next_sequence', (int) $data['ipd_next_sequence'], 'ipd_number', 'integer');
        }

        return [
            'settings'       => HospitalSetting::getGroup($hospitalId, 'ipd_number'),
            'preview_sample' => $hospital->previewIpdNumber(),
        ];
    }

    public function getNumberingOverview(int $hospitalId): array
    {
        return [
            'uhid' => $this->getUhidConfig($hospitalId),
            'opd'  => $this->getOpdConfig($hospitalId),
            'ipd'  => $this->getIpdConfig($hospitalId),
        ];
    }

    public function getSettings(int $hospitalId, ?string $group = null): array
    {
        if ($group) {
            return HospitalSetting::getGroup($hospitalId, $group);
        }

        $all = HospitalSetting::where('hospital_id', $hospitalId)->get();
        $settings = [];
        foreach ($all as $item) {
            $settings[$item->group][$item->key] = match ($item->type) {
                'integer' => (int) $item->value,
                'float'   => (float) $item->value,
                'boolean' => filter_var($item->value, FILTER_VALIDATE_BOOLEAN),
                'json'    => json_decode($item->value, true),
                default   => $item->value,
            };
        }

        return $settings;
    }

    public function saveSettings(int $hospitalId, string $group, array $settings): array
    {
        HospitalSetting::setMany($hospitalId, $settings, $group);
        return HospitalSetting::getGroup($hospitalId, $group);
    }

    public function getSetting(int $hospitalId, string $key, mixed $default = null): mixed
    {
        return HospitalSetting::get($hospitalId, $key, $default);
    }

    public function setSetting(int $hospitalId, string $key, mixed $value, string $group = 'general', ?string $type = null): void
    {
        HospitalSetting::set($hospitalId, $key, $value, $group, $type);
    }
}
