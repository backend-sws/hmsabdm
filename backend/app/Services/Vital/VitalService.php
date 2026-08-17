<?php

namespace App\Services\Vital;

use App\Models\Vital;
use App\Models\VitalFieldConfig;
use App\Http\Traits\CanFilterAndPaginate;
use Illuminate\Support\Collection;

class VitalService implements VitalServiceInterface
{
    use CanFilterAndPaginate;

    public function recordVitals(int $hospitalId, int $userId, array $data): Vital
    {
        // Auto-calculate BMI if weight (kg) and height (cm) are provided
        if (!empty($data['weight']) && !empty($data['height']) && $data['height'] > 0) {
            $heightInMeters = $data['height'] / 100;
            $data['bmi'] = round($data['weight'] / ($heightInMeters * $heightInMeters), 2);
        }

        $data['hospital_id'] = $hospitalId;
        $data['recorded_by'] = $userId;
        $data['recorded_at'] = $data['recorded_at'] ?? now();
        $data['temperature_unit'] = $data['temperature_unit'] ?? 'F';

        // Auto-assign encounter_type if not provided
        if (empty($data['encounter_type'])) {
            $data['encounter_type'] = !empty($data['ipd_admission_id']) ? 'ipd' : 'opd';
        }

        // Ensure custom_vitals is cleanly formatted array if provided
        if (isset($data['custom_vitals']) && is_array($data['custom_vitals'])) {
            $data['custom_vitals'] = array_filter($data['custom_vitals'], fn($v) => $v !== null && $v !== '');
        }

        $vital = Vital::create($data);
        
        return $vital->load([
            'recordedByUser:id,name,username',
            'patient:id,name,mobile,dob,gender',
            'opdVisit:id,queue_token,status',
            'ipdAdmission'
        ]);
    }

    public function getVitals(int $hospitalId, $request = null)
    {
        $req = $request ?? request();

        $query = Vital::where('hospital_id', $hospitalId)
            ->with([
                'recordedByUser:id,name,username',
                'patient:id,name,mobile,dob,gender',
                'opdVisit:id,queue_token,status',
                'ipdAdmission'
            ])
            ->orderBy('recorded_at', 'desc');

        if ($req && $req->filled('patient_id')) {
            $query->where('patient_id', $req->patient_id);
        }

        if ($req && $req->filled('opd_visit_id')) {
            $query->where('opd_visit_id', $req->opd_visit_id);
        }

        if ($req && $req->filled('ipd_admission_id')) {
            $query->where('ipd_admission_id', $req->ipd_admission_id);
        }

        if ($req && $req->filled('encounter_type')) {
            $query->where('encounter_type', $req->encounter_type);
        }

        if ($req && $req->filled('date')) {
            $query->whereDate('recorded_at', $req->date);
        }

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->whereHas('patient', function ($pq) use ($search) {
                $pq->where('name', 'like', "%{$search}%")
                   ->orWhere('mobile', 'like', "%{$search}%")
                   ->orWhere('abha_number', 'like', "%{$search}%");
            });
        }

        return $this->applyPaginationOrAll($query, $req);
    }

    public function getVitalById(int $hospitalId, int $id): Vital
    {
        return Vital::where('hospital_id', $hospitalId)
            ->with([
                'recordedByUser:id,name,username',
                'patient',
                'opdVisit',
                'ipdAdmission'
            ])
            ->findOrFail($id);
    }

    public function getPatientVitals(int $hospitalId, int $patientId): Collection
    {
        return Vital::where('hospital_id', $hospitalId)
            ->where('patient_id', $patientId)
            ->with([
                'recordedByUser:id,name,username',
                'opdVisit:id,queue_token,status',
                'ipdAdmission'
            ])
            ->orderBy('recorded_at', 'desc')
            ->get();
    }

    public function getVisitVitals(int $hospitalId, int $visitId): Collection
    {
        return Vital::where('hospital_id', $hospitalId)
            ->where('opd_visit_id', $visitId)
            ->with([
                'recordedByUser:id,name,username',
                'patient:id,name,mobile,dob,gender'
            ])
            ->orderBy('recorded_at', 'desc')
            ->get();
    }

    public function getIpdAdmissionVitals(int $hospitalId, int $ipdAdmissionId): Collection
    {
        return Vital::where('hospital_id', $hospitalId)
            ->where('ipd_admission_id', $ipdAdmissionId)
            ->with([
                'recordedByUser:id,name,username',
                'patient:id,name,mobile,dob,gender'
            ])
            ->orderBy('recorded_at', 'asc') // Chronological rounding chart
            ->get();
    }

    public function deleteVital(int $hospitalId, int $id): bool
    {
        $vital = Vital::where('hospital_id', $hospitalId)->findOrFail($id);
        return $vital->delete();
    }

    public function getFieldConfigs(int $hospitalId, bool $activeOnly = true): Collection
    {
        $count = VitalFieldConfig::where('hospital_id', $hospitalId)->count();
        if ($count === 0) {
            $this->seedDefaultFieldConfigs($hospitalId);
        }

        $query = VitalFieldConfig::where('hospital_id', $hospitalId);

        if ($activeOnly) {
            $query->where('is_active', true);
        }

        return $query->orderBy('sort_order', 'asc')->orderBy('id', 'asc')->get();
    }

    public function createFieldConfig(int $hospitalId, array $data): VitalFieldConfig
    {
        $data['hospital_id'] = $hospitalId;
        $data['field_key'] = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $data['field_key']));

        return VitalFieldConfig::create($data);
    }

    public function updateFieldConfig(int $hospitalId, int $configId, array $data): VitalFieldConfig
    {
        $config = VitalFieldConfig::where('hospital_id', $hospitalId)->findOrFail($configId);

        if (isset($data['field_key'])) {
            $data['field_key'] = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $data['field_key']));
        }

        $config->update($data);
        return $config->fresh();
    }

    public function deleteFieldConfig(int $hospitalId, int $configId): bool
    {
        $config = VitalFieldConfig::where('hospital_id', $hospitalId)->findOrFail($configId);
        return $config->delete();
    }

    public function seedDefaultFieldConfigs(int $hospitalId): void
    {
        $defaults = [
            [
                'field_key' => 'blood_pressure',
                'label' => 'Blood Pressure (Sys / Dia)',
                'category' => 'Cardiovascular',
                'unit' => 'mmHg',
                'input_type' => 'number',
                'min_value' => 40,
                'max_value' => 300,
                'is_required' => false,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'field_key' => 'pulse_rate',
                'label' => 'Pulse / Heart Rate',
                'category' => 'Cardiovascular',
                'unit' => 'bpm',
                'input_type' => 'number',
                'min_value' => 30,
                'max_value' => 250,
                'is_required' => false,
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'field_key' => 'temperature',
                'label' => 'Body Temperature',
                'category' => 'General',
                'unit' => '°F',
                'input_type' => 'number',
                'min_value' => 70,
                'max_value' => 115,
                'is_required' => false,
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'field_key' => 'oxygen_saturation',
                'label' => 'SpO2 Oxygen Saturation',
                'category' => 'Respiratory',
                'unit' => '%',
                'input_type' => 'number',
                'min_value' => 50,
                'max_value' => 100,
                'is_required' => false,
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'field_key' => 'respiratory_rate',
                'label' => 'Respiratory Rate',
                'category' => 'Respiratory',
                'unit' => 'breaths/min',
                'input_type' => 'number',
                'min_value' => 5,
                'max_value' => 100,
                'is_required' => false,
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'field_key' => 'weight',
                'label' => 'Body Weight',
                'category' => 'Anthropometry',
                'unit' => 'kg',
                'input_type' => 'number',
                'min_value' => 0.5,
                'max_value' => 500,
                'is_required' => false,
                'is_active' => true,
                'sort_order' => 6,
            ],
            [
                'field_key' => 'height',
                'label' => 'Height',
                'category' => 'Anthropometry',
                'unit' => 'cm',
                'input_type' => 'number',
                'min_value' => 20,
                'max_value' => 300,
                'is_required' => false,
                'is_active' => true,
                'sort_order' => 7,
            ],
            [
                'field_key' => 'blood_glucose',
                'label' => 'Blood Glucose (Sugar)',
                'category' => 'Diabetic',
                'unit' => 'mg/dL',
                'input_type' => 'number',
                'min_value' => 10,
                'max_value' => 1000,
                'is_required' => false,
                'is_active' => true,
                'sort_order' => 8,
            ],
            [
                'field_key' => 'pain_score',
                'label' => 'Pain Scale (1 - 10)',
                'category' => 'General',
                'unit' => 'scale',
                'input_type' => 'number',
                'min_value' => 1,
                'max_value' => 10,
                'is_required' => false,
                'is_active' => true,
                'sort_order' => 9,
            ],
            [
                'field_key' => 'waist_circumference',
                'label' => 'Waist Circumference',
                'category' => 'Anthropometry',
                'unit' => 'cm',
                'input_type' => 'number',
                'min_value' => 20,
                'max_value' => 250,
                'is_required' => false,
                'is_active' => false,
                'sort_order' => 10,
            ],
        ];

        foreach ($defaults as $default) {
            VitalFieldConfig::firstOrCreate(
                ['hospital_id' => $hospitalId, 'field_key' => $default['field_key']],
                $default
            );
        }
    }
}
