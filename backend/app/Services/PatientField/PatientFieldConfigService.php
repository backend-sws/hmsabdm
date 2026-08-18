<?php

namespace App\Services\PatientField;

use App\Models\PatientFieldConfig;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class PatientFieldConfigService implements PatientFieldConfigServiceInterface
{
    public function getFieldConfigs(int $hospitalId, bool $activeOnly = true): Collection
    {
        $count = PatientFieldConfig::where('hospital_id', $hospitalId)->count();
        if ($count === 0) {
            $this->seedDefaultFieldConfigs($hospitalId);
        }

        $query = PatientFieldConfig::where('hospital_id', $hospitalId)
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc');

        if ($activeOnly) {
            $query->where('is_active', true);
        }

        return $query->get();
    }

    public function createFieldConfig(int $hospitalId, array $data): PatientFieldConfig
    {
        $data['hospital_id'] = $hospitalId;
        
        if (empty($data['field_key'])) {
            $data['field_key'] = Str::snake($data['label']);
        } else {
            $data['field_key'] = Str::snake($data['field_key']);
        }

        if (isset($data['options']) && is_string($data['options'])) {
            $data['options'] = array_map('trim', explode(',', $data['options']));
        }

        return PatientFieldConfig::create($data);
    }

    public function updateFieldConfig(int $hospitalId, int $configId, array $data): PatientFieldConfig
    {
        $config = PatientFieldConfig::where('hospital_id', $hospitalId)->findOrFail($configId);

        if (isset($data['field_key'])) {
            $data['field_key'] = Str::snake($data['field_key']);
        }

        if (isset($data['options']) && is_string($data['options'])) {
            $data['options'] = array_map('trim', explode(',', $data['options']));
        }

        $config->update($data);

        return $config->fresh();
    }

    public function deleteFieldConfig(int $hospitalId, int $configId): bool
    {
        $config = PatientFieldConfig::where('hospital_id', $hospitalId)->findOrFail($configId);
        return $config->delete();
    }

    public function seedDefaultFieldConfigs(int $hospitalId): void
    {
        $defaults = [
            [
                'field_key'   => 'marital_status',
                'label'       => 'Marital Status',
                'category'    => 'demographic',
                'input_type'  => 'select',
                'options'     => ['Single', 'Married', 'Divorced', 'Widowed', 'Other'],
                'placeholder' => 'Select marital status',
                'is_required' => false,
                'is_active'   => true,
                'sort_order'  => 1,
            ],
            [
                'field_key'   => 'occupation',
                'label'       => 'Occupation / Profession',
                'category'    => 'demographic',
                'input_type'  => 'text',
                'options'     => null,
                'placeholder' => 'e.g. Teacher, Engineer, Farmer, Business',
                'is_required' => false,
                'is_active'   => true,
                'sort_order'  => 2,
            ],
            [
                'field_key'   => 'religion',
                'label'       => 'Religion',
                'category'    => 'demographic',
                'input_type'  => 'select',
                'options'     => ['Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Buddhism', 'Jainism', 'Other'],
                'placeholder' => 'Select religion',
                'is_required' => false,
                'is_active'   => true,
                'sort_order'  => 3,
            ],
            [
                'field_key'   => 'emergency_contact_name',
                'label'       => 'Emergency Contact Name',
                'category'    => 'emergency',
                'input_type'  => 'text',
                'options'     => null,
                'placeholder' => 'Name of emergency contact person',
                'is_required' => false,
                'is_active'   => true,
                'sort_order'  => 4,
            ],
            [
                'field_key'   => 'emergency_contact_phone',
                'label'       => 'Emergency Contact Phone',
                'category'    => 'emergency',
                'input_type'  => 'text',
                'options'     => null,
                'placeholder' => '10-digit mobile number',
                'is_required' => false,
                'is_active'   => true,
                'sort_order'  => 5,
            ],
            [
                'field_key'   => 'id_proof_type',
                'label'       => 'Government ID Proof Type',
                'category'    => 'identification',
                'input_type'  => 'select',
                'options'     => ['Aadhaar', 'PAN Card', 'Voter ID', 'Driving License', 'Passport', 'Ration Card', 'Other'],
                'placeholder' => 'Select ID proof',
                'is_required' => false,
                'is_active'   => true,
                'sort_order'  => 6,
            ],
            [
                'field_key'   => 'id_proof_number',
                'label'       => 'ID Proof Number',
                'category'    => 'identification',
                'input_type'  => 'text',
                'options'     => null,
                'placeholder' => 'Enter ID card number',
                'is_required' => false,
                'is_active'   => true,
                'sort_order'  => 7,
            ],
            [
                'field_key'   => 'insurance_provider',
                'label'       => 'Insurance / TPA Company',
                'category'    => 'insurance',
                'input_type'  => 'text',
                'options'     => null,
                'placeholder' => 'e.g. Star Health, PM-JAY / Ayushman, Medi Assist',
                'is_required' => false,
                'is_active'   => true,
                'sort_order'  => 8,
            ],
            [
                'field_key'   => 'insurance_policy_number',
                'label'       => 'Insurance Policy / Card Number',
                'category'    => 'insurance',
                'input_type'  => 'text',
                'options'     => null,
                'placeholder' => 'Enter policy / PMJAY ID',
                'is_required' => false,
                'is_active'   => true,
                'sort_order'  => 9,
            ],
        ];

        foreach ($defaults as $field) {
            $field['hospital_id'] = $hospitalId;
            PatientFieldConfig::firstOrCreate(
                ['hospital_id' => $hospitalId, 'field_key' => $field['field_key']],
                $field
            );
        }
    }
}
