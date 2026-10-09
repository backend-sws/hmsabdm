<?php

namespace App\Services\Prescription;

use App\Models\MedicineMaster;
use App\Models\Icd10Code;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionDiagnosis;
use App\Models\PrescriptionInvestigation;
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
            'brand_name as name',
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
            'short_description as name',
            'short_description as description',
            'is_billable',
        ]);
    }

    public function searchInvestigations(string $query, ?string $category = null, int $limit = 25)
    {
        $term = trim($query);

        // 1. Standard Clinical Diagnostic Catalog
        $standardCatalog = [
            // Pathology
            ['code' => 'LAB-CBC', 'name' => 'Complete Blood Count (CBC) with ESR', 'category' => 'Pathology'],
            ['code' => 'LAB-HB', 'name' => 'Hemoglobin (Hb)', 'category' => 'Pathology'],
            ['code' => 'LAB-TLC', 'name' => 'Total & Differential Leukocyte Count (TLC / DLC)', 'category' => 'Pathology'],
            ['code' => 'LAB-PLT', 'name' => 'Platelet Count', 'category' => 'Pathology'],
            ['code' => 'LAB-LFT', 'name' => 'Liver Function Test (LFT Panel)', 'category' => 'Pathology'],
            ['code' => 'LAB-KFT', 'name' => 'Kidney Function Test / Renal Profile (KFT / RFT)', 'category' => 'Pathology'],
            ['code' => 'LAB-CREAT', 'name' => 'Serum Creatinine', 'category' => 'Pathology'],
            ['code' => 'LAB-UREA', 'name' => 'Blood Urea Nitrogen (BUN)', 'category' => 'Pathology'],
            ['code' => 'LAB-URIC', 'name' => 'Serum Uric Acid', 'category' => 'Pathology'],
            ['code' => 'LAB-BSF', 'name' => 'Fasting Blood Sugar (FBS)', 'category' => 'Pathology'],
            ['code' => 'LAB-BSPP', 'name' => 'Postprandial Blood Sugar (PPBS)', 'category' => 'Pathology'],
            ['code' => 'LAB-RBS', 'name' => 'Random Blood Sugar (RBS)', 'category' => 'Pathology'],
            ['code' => 'LAB-HBA1C', 'name' => 'Glycated Hemoglobin (HbA1c)', 'category' => 'Pathology'],
            ['code' => 'LAB-LIPID', 'name' => 'Lipid Profile (Cholesterol, TG, HDL, LDL, VLDL)', 'category' => 'Pathology'],
            ['code' => 'LAB-THYROID', 'name' => 'Thyroid Profile (Total T3, Total T4, TSH)', 'category' => 'Pathology'],
            ['code' => 'LAB-TSH', 'name' => 'Thyroid Stimulating Hormone (TSH Ultrasensitive)', 'category' => 'Pathology'],
            ['code' => 'LAB-URINE-RE', 'name' => 'Urine Routine & Microscopic Examination (R/M)', 'category' => 'Pathology'],
            ['code' => 'LAB-URINE-CS', 'name' => 'Urine Culture & Sensitivity', 'category' => 'Pathology'],
            ['code' => 'LAB-STOOL-RE', 'name' => 'Stool Routine & Occult Blood', 'category' => 'Pathology'],
            ['code' => 'LAB-CRP', 'name' => 'C-Reactive Protein (CRP Quantitative)', 'category' => 'Pathology'],
            ['code' => 'LAB-HS-CRP', 'name' => 'High Sensitivity CRP (hs-CRP)', 'category' => 'Pathology'],
            ['code' => 'LAB-WIDAL', 'name' => 'Widal Test (Enteric Fever Slide Agglutination)', 'category' => 'Pathology'],
            ['code' => 'LAB-DENGUE', 'name' => 'Dengue NS1 Antigen & IgM/IgG Antibody Combo', 'category' => 'Pathology'],
            ['code' => 'LAB-MALARIA', 'name' => 'Malaria Rapid Card & Smear for MP', 'category' => 'Pathology'],
            ['code' => 'LAB-ELECTRO', 'name' => 'Serum Electrolytes (Na+, K+, Cl-, HCO3-)', 'category' => 'Pathology'],
            ['code' => 'LAB-CALCIUM', 'name' => 'Serum Calcium (Total & Ionic)', 'category' => 'Pathology'],
            ['code' => 'LAB-VIT-D', 'name' => 'Vitamin D3 (25-Hydroxycholecalciferol)', 'category' => 'Pathology'],
            ['code' => 'LAB-VIT-B12', 'name' => 'Vitamin B12 (Cyanocobalamin)', 'category' => 'Pathology'],
            ['code' => 'LAB-PT-INR', 'name' => 'Prothrombin Time with INR (PT-INR)', 'category' => 'Pathology'],
            ['code' => 'LAB-APTT', 'name' => 'Activated Partial Thromboplastin Time (aPTT)', 'category' => 'Pathology'],
            ['code' => 'LAB-D-DIMER', 'name' => 'D-Dimer Quantitative Assay', 'category' => 'Pathology'],
            ['code' => 'LAB-TROPONIN-I', 'name' => 'Troponin-I High Sensitivity (hs-cTnI)', 'category' => 'Pathology'],
            ['code' => 'LAB-AMYLASE', 'name' => 'Serum Amylase & Lipase', 'category' => 'Pathology'],
            ['code' => 'LAB-HIV', 'name' => 'HIV 1 & 2 Rapid Screening Antibody', 'category' => 'Pathology'],
            ['code' => 'LAB-HBSAG', 'name' => 'HBsAg (Hepatitis B Surface Antigen)', 'category' => 'Pathology'],
            ['code' => 'LAB-HCV', 'name' => 'Anti-HCV Antibody Screening', 'category' => 'Pathology'],
            ['code' => 'LAB-BLOOD-GRP', 'name' => 'ABO Blood Grouping & Rh Factor', 'category' => 'Pathology'],
            ['code' => 'LAB-BLOOD-CS', 'name' => 'Blood Culture & Sensitivity', 'category' => 'Pathology'],

            // Radiology
            ['code' => 'RAD-XRAY-CHEST-PA', 'name' => 'Chest X-Ray (PA View)', 'category' => 'Radiology'],
            ['code' => 'RAD-XRAY-CHEST-AP', 'name' => 'Chest X-Ray (AP Bedside View)', 'category' => 'Radiology'],
            ['code' => 'RAD-XRAY-ABDOMEN', 'name' => 'X-Ray Abdomen (Erect / KUB View)', 'category' => 'Radiology'],
            ['code' => 'RAD-XRAY-PNS', 'name' => 'X-Ray Para-Nasal Sinuses (PNS - Water\'s View)', 'category' => 'Radiology'],
            ['code' => 'RAD-XRAY-CERVICAL', 'name' => 'X-Ray Cervical Spine (AP & Lateral View)', 'category' => 'Radiology'],
            ['code' => 'RAD-XRAY-LUMBAR', 'name' => 'X-Ray Lumbo-Sacral (LS) Spine (AP & Lateral)', 'category' => 'Radiology'],
            ['code' => 'RAD-XRAY-KNEE', 'name' => 'X-Ray B/L Knee Joints (Standing AP & Lateral)', 'category' => 'Radiology'],
            ['code' => 'RAD-USG-WHOLE-ABD', 'name' => 'USG Whole Abdomen & Pelvis', 'category' => 'Radiology'],
            ['code' => 'RAD-USG-KUB', 'name' => 'USG Kidney, Ureter, Bladder (KUB & Prostate)', 'category' => 'Radiology'],
            ['code' => 'RAD-USG-OBS', 'name' => 'Obstetric Ultrasound (Anomaly / Growth Scan)', 'category' => 'Radiology'],
            ['code' => 'RAD-USG-NECK', 'name' => 'USG Neck & Thyroid Gland', 'category' => 'Radiology'],
            ['code' => 'RAD-USG-DOPPLER', 'name' => 'Color Doppler (Venous / Arterial Lower Limb)', 'category' => 'Radiology'],
            ['code' => 'RAD-CT-BRAIN', 'name' => 'NCCT Head / Brain (Non-Contrast CT)', 'category' => 'Radiology'],
            ['code' => 'RAD-CT-CHEST-HRCT', 'name' => 'HRCT Chest (High Resolution CT)', 'category' => 'Radiology'],
            ['code' => 'RAD-CT-ABDOMEN', 'name' => 'CECT Whole Abdomen with Oral/IV Contrast', 'category' => 'Radiology'],
            ['code' => 'RAD-MRI-BRAIN', 'name' => 'MRI Brain with MR Angiography', 'category' => 'Radiology'],
            ['code' => 'RAD-MRI-SPINE', 'name' => 'MRI Lumbar Spine with Screening', 'category' => 'Radiology'],

            // Cardiology
            ['code' => 'CARDIO-ECG-12', 'name' => '12-Lead Electrocardiogram (ECG with rhythm strip)', 'category' => 'Cardiology'],
            ['code' => 'CARDIO-ECHO-2D', 'name' => '2D Echocardiography with Color Doppler', 'category' => 'Cardiology'],
            ['code' => 'CARDIO-TMT', 'name' => 'Treadmill Stress Test (TMT / Exercise ECG)', 'category' => 'Cardiology'],
            ['code' => 'CARDIO-HOLTER', 'name' => '24-Hour Ambulatory Holter ECG Monitoring', 'category' => 'Cardiology'],
            ['code' => 'CARDIO-PFT', 'name' => 'Pulmonary Function Test (PFT / Spirometry)', 'category' => 'Cardiology'],
        ];

        // 2. Database search in charges_master
        $dbMatches = [];
        try {
            $dbCharges = \App\Models\ChargeMaster::where(function ($q) use ($term) {
                $q->where('name', 'ilike', "%{$term}%")
                  ->orWhere('code', 'ilike', "%{$term}%")
                  ->orWhere('description', 'ilike', "%{$term}%");
            })
            ->where(function ($q) {
                $q->where('category_id', 6)
                  ->orWhereHas('category', function ($cq) {
                      $cq->where('name', 'investigation_charges');
                  });
            })
            ->limit($limit)
            ->get(['id', 'code', 'name', 'standard_rate']);

            foreach ($dbCharges as $c) {
                $dbMatches[] = [
                    'id'            => $c->id,
                    'code'          => $c->code,
                    'name'          => $c->name,
                    'category'      => 'Pathology',
                    'standard_rate' => $c->standard_rate,
                    'source'        => 'tariff_master',
                ];
            }
        } catch (\Exception) {}

        // Filter standard catalog
        $catalogMatches = [];
        foreach ($standardCatalog as $idx => $item) {
            if ($category && strcasecmp($item['category'], $category) !== 0) {
                continue;
            }
            if ($term === '' ||
                stripos($item['name'], $term) !== false ||
                stripos($item['code'], $term) !== false ||
                stripos($item['category'], $term) !== false) {
                $catalogMatches[] = [
                    'id'            => 10000 + $idx,
                    'code'          => $item['code'],
                    'name'          => $item['name'],
                    'category'      => $item['category'],
                    'standard_rate' => null,
                    'source'        => 'clinical_catalog',
                ];
            }
        }

        $all = array_merge($dbMatches, $catalogMatches);

        // Deduplicate by name
        $seen = [];
        $unique = [];
        foreach ($all as $item) {
            $key = strtolower(trim($item['name']));
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $item;
            }
        }

        return array_slice($unique, 0, $limit);
    }

    public function createPrescription(int $hospitalId, int $doctorId, array $data)
    {
        return DB::transaction(function () use ($hospitalId, $doctorId, $data) {
            // If a prescription already exists for this OPD visit, update it instead of creating duplicates
            if (!empty($data['opd_visit_id'])) {
                $existing = Prescription::where('hospital_id', $hospitalId)
                    ->where('opd_visit_id', $data['opd_visit_id'])
                    ->first();
                if ($existing) {
                    return $this->updatePrescription($hospitalId, $existing->id, $data);
                }
            }

            $status = $data['status'] ?? 'active';

            // 1. Create main Prescription
            $prescription = Prescription::create([
                'hospital_id'      => $hospitalId,
                'patient_id'       => $data['patient_id'],
                'doctor_id'        => $doctorId,
                'opd_visit_id'     => $data['opd_visit_id'] ?? null,
                'ipd_admission_id' => $data['ipd_admission_id'] ?? null,
                'encounter_type'   => $data['encounter_type'] ?? 'opd',
                'chief_complaints' => is_array($data['chief_complaints'] ?? null)
                    ? array_values(array_filter($data['chief_complaints']))
                    : (!empty($data['chief_complaints']) ? [$data['chief_complaints']] : null),
                'clinical_notes'   => $data['clinical_notes'] ?? null,
                'diet_advice'      => $data['diet_advice'] ?? null,
                'general_advice'   => $data['general_advice'] ?? null,
                'follow_up_date'   => $data['follow_up_date'] ?? null,
                'disposition'      => $data['disposition'] ?? 'home',
                'disposition_notes'=> $data['disposition_notes'] ?? null,
                'admit_priority'   => $data['admit_priority'] ?? null,
                'recommended_ward' => $data['recommended_ward'] ?? null,
                'status'           => $status,
            ]);

            // 2. Attach Medicines (Items)
            if (!empty($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $item) {
                    if (empty($item['medicine_name'])) continue;
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
                    $name = trim($diag['diagnosis_name'] ?? $diag['name'] ?? '');
                    if (empty($name)) continue;
                    $d = PrescriptionDiagnosis::create([
                        'prescription_id' => $prescription->id,
                        'icd10_id'        => $diag['icd10_id'] ?? null,
                        'icd_code'        => $diag['icd_code'] ?? null,
                        'diagnosis_name'  => $name,
                        'diagnosis_type'  => $diag['diagnosis_type'] ?? 'provisional',
                        'notes'           => $diag['notes'] ?? null,
                    ]);

                    if (!$primaryDiagnosis) {
                        $primaryDiagnosis = $d->diagnosis_name;
                    }
                }
            }

            // 4. Attach Advised Diagnostic Investigations (Pathology, Radiology, Cardiology)
            if (!empty($data['investigations']) && is_array($data['investigations'])) {
                foreach ($data['investigations'] as $inv) {
                    $testName = trim($inv['test_name'] ?? $inv['name'] ?? '');
                    if (empty($testName)) continue;
                    PrescriptionInvestigation::create([
                        'hospital_id'         => $hospitalId,
                        'prescription_id'     => $prescription->id,
                        'patient_id'          => $prescription->patient_id,
                        'test_name'           => $testName,
                        'test_code'           => $inv['test_code'] ?? $inv['code'] ?? null,
                        'category'            => $inv['category'] ?? 'Pathology',
                        'urgency'             => strtolower($inv['urgency'] ?? 'routine'),
                        'standard_rate'       => isset($inv['standard_rate']) && $inv['standard_rate'] !== '' ? (float)$inv['standard_rate'] : null,
                        'clinical_indication' => $inv['clinical_indication'] ?? $inv['indication'] ?? null,
                        'status'              => 'ordered',
                    ]);
                }
            }

            // 4. If linked to an OPD Visit:
            // Only finalize visit if status is 'active' (signed). If 'draft', keep visit in consultation.
            if (!empty($data['opd_visit_id'])) {
                $visit = OpdVisit::where('hospital_id', $hospitalId)
                    ->where('id', $data['opd_visit_id'])
                    ->first();

                if ($visit) {
                    if ($status === 'active') {
                        $visit->update([
                            'status'       => 'done',
                            'diagnosis'    => $primaryDiagnosis ?? $visit->diagnosis,
                            'notes'        => $data['clinical_notes'] ?? $visit->notes,
                            'completed_at' => $visit->completed_at ?? now(),
                        ]);
                    } else {
                        // Draft mode: ensure visit is marked in_consultation so doctor can keep working
                        if ($visit->status !== 'done') {
                            $visit->update([
                                'status'    => 'in_consultation',
                                'diagnosis' => $primaryDiagnosis ?? $visit->diagnosis,
                                'notes'     => $data['clinical_notes'] ?? $visit->notes,
                            ]);
                        }
                    }
                }
            }

            return $this->getPrescription($hospitalId, $prescription->id);
        });
    }

    public function updatePrescription(int $hospitalId, int $id, array $data)
    {
        return DB::transaction(function () use ($hospitalId, $id, $data) {
            $prescription = Prescription::where('hospital_id', $hospitalId)->findOrFail($id);

            $status = $data['status'] ?? $prescription->status ?? 'active';

            $updatePayload = [
                'status' => $status,
            ];

            if (array_key_exists('chief_complaints', $data)) {
                $updatePayload['chief_complaints'] = is_array($data['chief_complaints'])
                    ? array_values(array_filter($data['chief_complaints']))
                    : (!empty($data['chief_complaints']) ? [$data['chief_complaints']] : null);
            }
            if (array_key_exists('clinical_notes', $data)) {
                $updatePayload['clinical_notes'] = $data['clinical_notes'];
            }
            if (array_key_exists('diet_advice', $data)) {
                $updatePayload['diet_advice'] = $data['diet_advice'];
            }
            if (array_key_exists('general_advice', $data)) {
                $updatePayload['general_advice'] = $data['general_advice'];
            }
            if (array_key_exists('follow_up_date', $data)) {
                $updatePayload['follow_up_date'] = $data['follow_up_date'];
            }
            foreach (['disposition', 'disposition_notes', 'admit_priority', 'recommended_ward'] as $field) {
                if (array_key_exists($field, $data)) {
                    $updatePayload[$field] = $data[$field];
                }
            }

            $prescription->update($updatePayload);

            // Re-sync Medicines (Items)
            if (isset($data['items']) && is_array($data['items'])) {
                PrescriptionItem::where('prescription_id', $prescription->id)->delete();
                foreach ($data['items'] as $item) {
                    if (empty($item['medicine_name'])) continue;
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

            // Re-sync ICD-10 Diagnoses
            $primaryDiagnosis = null;
            if (isset($data['diagnoses']) && is_array($data['diagnoses'])) {
                PrescriptionDiagnosis::where('prescription_id', $prescription->id)->delete();
                foreach ($data['diagnoses'] as $diag) {
                    $name = trim($diag['diagnosis_name'] ?? $diag['name'] ?? '');
                    if (empty($name)) continue;
                    $d = PrescriptionDiagnosis::create([
                        'prescription_id' => $prescription->id,
                        'icd10_id'        => $diag['icd10_id'] ?? null,
                        'icd_code'        => $diag['icd_code'] ?? null,
                        'diagnosis_name'  => $name,
                        'diagnosis_type'  => $diag['diagnosis_type'] ?? 'provisional',
                        'notes'           => $diag['notes'] ?? null,
                    ]);
                    if (!$primaryDiagnosis) {
                        $primaryDiagnosis = $d->diagnosis_name;
                    }
                }
            }

            // Re-sync Advised Diagnostic Investigations
            if (isset($data['investigations']) && is_array($data['investigations'])) {
                // Delete unbilled investigations for this prescription
                PrescriptionInvestigation::where('prescription_id', $prescription->id)
                    ->whereNull('billed_invoice_id')
                    ->where('status', 'ordered')
                    ->delete();

                foreach ($data['investigations'] as $inv) {
                    $testName = trim($inv['test_name'] ?? $inv['name'] ?? '');
                    if (empty($testName)) continue;

                    // Avoid duplicate if already billed
                    $alreadyBilled = PrescriptionInvestigation::where('prescription_id', $prescription->id)
                        ->where('test_name', $testName)
                        ->whereNotNull('billed_invoice_id')
                        ->exists();
                    if ($alreadyBilled) continue;

                    PrescriptionInvestigation::create([
                        'hospital_id'         => $hospitalId,
                        'prescription_id'     => $prescription->id,
                        'patient_id'          => $prescription->patient_id,
                        'test_name'           => $testName,
                        'test_code'           => $inv['test_code'] ?? $inv['code'] ?? null,
                        'category'            => $inv['category'] ?? 'Pathology',
                        'urgency'             => strtolower($inv['urgency'] ?? 'routine'),
                        'standard_rate'       => isset($inv['standard_rate']) && $inv['standard_rate'] !== '' ? (float)$inv['standard_rate'] : null,
                        'clinical_indication' => $inv['clinical_indication'] ?? $inv['indication'] ?? null,
                        'status'              => 'ordered',
                    ]);
                }
            }

            // OPD Visit Status Sync
            if (!empty($prescription->opd_visit_id)) {
                $visit = OpdVisit::where('hospital_id', $hospitalId)->find($prescription->opd_visit_id);
                if ($visit) {
                    if ($status === 'active') {
                        $visit->update([
                            'status'       => 'done',
                            'diagnosis'    => $primaryDiagnosis ?? $visit->diagnosis,
                            'notes'        => $data['clinical_notes'] ?? $visit->notes,
                            'completed_at' => $visit->completed_at ?? now(),
                        ]);
                    } elseif ($status === 'draft') {
                        if ($visit->status !== 'done') {
                            $visit->update([
                                'status'    => 'in_consultation',
                                'diagnosis' => $primaryDiagnosis ?? $visit->diagnosis,
                                'notes'     => $data['clinical_notes'] ?? $visit->notes,
                            ]);
                        }
                    }
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
                'investigations',
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
                'investigations',
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
                'investigations',
            ])
            ->first();
    }
}
