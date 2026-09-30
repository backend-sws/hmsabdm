<?php

namespace App\Services\Prescription;

use App\Models\MedicineMaster;
use App\Models\Icd10Code;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionDiagnosis;
use App\Models\OpdVisit;
use Illuminate\Support\Facades\DB;

class PrescriptionService implements PrescriptionServiceInterface
{
    public function searchMedicines(string $query, int $limit = 20)
    {
        $term = trim($query);
        if (strlen($term) < 2) {
            return [];
        }

        $isPgsql = DB::getDriverName() === 'pgsql';

        $q = MedicineMaster::query();

        if ($isPgsql) {
            $q->where(function ($sub) use ($term) {
                $sub->where('brand_name', 'ilike', "%{$term}%")
                    ->orWhere('generic_name', 'ilike', "%{$term}%")
                    ->orWhere('salt_composition', 'ilike', "%{$term}%");
            });
            // Prioritize exact/prefix brand matches first
            $q->orderByRaw("CASE WHEN brand_name ILIKE ? THEN 1 WHEN brand_name ILIKE ? THEN 2 ELSE 3 END", ["{$term}", "{$term}%"]);
        } else {
            $q->where(function ($sub) use ($term) {
                $sub->where('brand_name', 'like', "%{$term}%")
                    ->orWhere('generic_name', 'like', "%{$term}%")
                    ->orWhere('salt_composition', 'like', "%{$term}%");
            });
        }

        return $q->limit($limit)->get([
            'id',
            'brand_name',
            'generic_name',
            'salt_composition',
            'dosage_form',
            'manufacturer',
            'mrp',
            'is_generic',
            'prescription_type',
        ]);
    }

    public function searchDiagnoses(string $query, int $limit = 20)
    {
        $term = trim($query);
        if (strlen($term) < 2) {
            return [];
        }

        $isPgsql = DB::getDriverName() === 'pgsql';

        $q = Icd10Code::query();

        if ($isPgsql) {
            $q->where(function ($sub) use ($term) {
                $sub->where('code', 'ilike', "%{$term}%")
                    ->orWhere('code_with_separator', 'ilike', "%{$term}%")
                    ->orWhere('short_description', 'ilike', "%{$term}%");
            });
            $q->orderByRaw("CASE WHEN code ILIKE ? THEN 1 WHEN code_with_separator ILIKE ? THEN 2 ELSE 3 END", ["{$term}%", "{$term}%"]);
        } else {
            $q->where(function ($sub) use ($term) {
                $sub->where('code', 'like', "%{$term}%")
                    ->orWhere('code_with_separator', 'like', "%{$term}%")
                    ->orWhere('short_description', 'like', "%{$term}%");
            });
        }

        return $q->limit($limit)->get([
            'id',
            'code',
            'code_with_separator',
            'short_description',
            'is_billable',
        ]);
    }

    public function createPrescription(int $hospitalId, int $doctorId, array $data)
    {
        return DB::transaction(function () use ($hospitalId, $doctorId, $data) {
            // 1. Create main Prescription
            $prescription = Prescription::create([
                'hospital_id'      => $hospitalId,
                'patient_id'       => $data['patient_id'],
                'doctor_id'        => $doctorId,
                'opd_visit_id'     => $data['opd_visit_id'] ?? null,
                'ipd_admission_id' => $data['ipd_admission_id'] ?? null,
                'encounter_type'   => $data['encounter_type'] ?? 'opd',
                'chief_complaints' => $data['chief_complaints'] ?? null,
                'clinical_notes'   => $data['clinical_notes'] ?? null,
                'diet_advice'      => $data['diet_advice'] ?? null,
                'general_advice'   => $data['general_advice'] ?? null,
                'follow_up_date'   => $data['follow_up_date'] ?? null,
                'status'           => 'active',
            ]);

            // 2. Attach Medicines (Items)
            if (!empty($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $item) {
                    PrescriptionItem::create([
                        'prescription_id' => $prescription->id,
                        'medicine_id'     => $item['medicine_id'] ?? null,
                        'medicine_name'   => trim($item['medicine_name']),
                        'generic_name'    => $item['generic_name'] ?? null,
                        'dosage_form'     => $item['dosage_form'] ?? 'Tablet',
                        'dosage'          => $item['dosage'] ?? null,
                        'frequency'       => $item['frequency'] ?? '1-0-1',
                        'duration_days'   => (int) ($item['duration_days'] ?? 1),
                        'timing'          => $item['timing'] ?? 'After Food',
                        'instructions'    => $item['instructions'] ?? null,
                    ]);
                }
            }

            // 3. Attach ICD-10 Diagnoses
            $primaryDiagnosis = null;
            if (!empty($data['diagnoses']) && is_array($data['diagnoses'])) {
                foreach ($data['diagnoses'] as $diag) {
                    $d = PrescriptionDiagnosis::create([
                        'prescription_id' => $prescription->id,
                        'icd10_id'        => $diag['icd10_id'] ?? null,
                        'icd_code'        => $diag['icd_code'] ?? null,
                        'diagnosis_name'  => trim($diag['diagnosis_name']),
                        'diagnosis_type'  => $diag['diagnosis_type'] ?? 'provisional',
                        'notes'           => $diag['notes'] ?? null,
                    ]);

                    if (!$primaryDiagnosis) {
                        $primaryDiagnosis = $d->diagnosis_name;
                    }
                }
            }

            // 4. If linked to an OPD Visit, automatically complete the consultation
            if (!empty($data['opd_visit_id'])) {
                $visit = OpdVisit::where('hospital_id', $hospitalId)
                    ->where('id', $data['opd_visit_id'])
                    ->first();

                if ($visit) {
                    $visit->update([
                        'status'       => 'done',
                        'diagnosis'    => $primaryDiagnosis ?? $visit->diagnosis,
                        'notes'        => $data['clinical_notes'] ?? $visit->notes,
                        'completed_at' => now(),
                    ]);
                }
            }

            return $this->getPrescription($hospitalId, $prescription->id);
        });
    }

    public function getPrescription(int $hospitalId, int $id)
    {
        return Prescription::where('hospital_id', $hospitalId)
            ->with([
                'patient',
                'doctor.department',
                'items.medicine',
                'diagnoses.icd10',
                'opdVisit',
            ])
            ->findOrFail($id);
    }

    public function getPatientPrescriptions(int $hospitalId, int $patientId)
    {
        return Prescription::where('hospital_id', $hospitalId)
            ->where('patient_id', $patientId)
            ->with([
                'doctor:id,name,qualification',
                'items',
                'diagnoses',
            ])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getVisitPrescription(int $hospitalId, int $visitId)
    {
        return Prescription::where('hospital_id', $hospitalId)
            ->where('opd_visit_id', $visitId)
            ->with([
                'patient',
                'doctor.department',
                'items.medicine',
                'diagnoses.icd10',
            ])
            ->first();
    }
}
