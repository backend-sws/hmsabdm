<?php

namespace App\Services\BloodBank;

use App\Models\BloodDonor;
use App\Models\DonorScreening;
use App\Models\BloodUnit;
use App\Models\BloodTtiTest;
use App\Models\BloodRequisition;
use App\Models\BloodCrossmatch;
use App\Models\BloodTransfusionReaction;
use App\Models\BloodCamp;
use App\Models\HospitalSetting;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class BloodBankService implements BloodBankServiceInterface
{
    /**
     * Get real-time Blood Bank dashboard metrics, 8-group matrix and alerts.
     */
    public function getDashboardKpis(int $hospitalId): array
    {
        $allGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        $now = Carbon::now();
        $in48Hours = Carbon::now()->addHours(48);

        // Fetch all non-discarded units for matrix
        $units = BloodUnit::where('hospital_id', $hospitalId)
            ->whereIn('status', ['available', 'reserved', 'quarantine'])
            ->get();

        $matrix = [];
        foreach ($allGroups as $bg) {
            $groupUnits = $units->where('blood_group', $bg);
            $available = $groupUnits->where('status', 'available');

            $matrix[$bg] = [
                'blood_group'      => $bg,
                'total_available'  => $available->count(),
                'prbc_units'       => $available->where('component_type', 'prbc')->count(),
                'ffp_units'        => $available->where('component_type', 'ffp')->count(),
                'platelet_units'   => $available->whereIn('component_type', ['platelets', 'sdp'])->count(),
                'whole_blood'      => $available->where('component_type', 'whole_blood')->count(),
                'cryo_units'       => $available->where('component_type', 'cryo')->count(),
                'quarantine_units' => $groupUnits->where('status', 'quarantine')->count(),
                'reserved_units'   => $groupUnits->where('status', 'reserved')->count(),
                'is_critical_low'  => $available->where('component_type', 'prbc')->count() < 2,
            ];
        }

        // Key stats
        $totalAvailable = $units->where('status', 'available')->count();
        $totalQuarantine = $units->where('status', 'quarantine')->count();
        $totalReserved = $units->where('status', 'reserved')->count();

        // Expiring in 48 hours (especially critical for platelets which last 5 days)
        $expiringSoon = BloodUnit::where('hospital_id', $hospitalId)
            ->where('status', 'available')
            ->whereBetween('expiry_date', [$now, $in48Hours])
            ->count();

        // Today's collections and issues
        $todayStart = Carbon::today()->startOfDay();
        $collectionsToday = BloodUnit::where('hospital_id', $hospitalId)
            ->where('collection_date', '>=', $todayStart)
            ->count();

        $issuesToday = BloodCrossmatch::where('hospital_id', $hospitalId)
            ->where('is_issued', true)
            ->where('issued_at', '>=', $todayStart)
            ->count();

        $pendingRequisitions = BloodRequisition::where('hospital_id', $hospitalId)
            ->whereIn('status', ['pending', 'sample_received'])
            ->count();

        $activeReactions = BloodTransfusionReaction::where('hospital_id', $hospitalId)
            ->where('investigation_status', '!=', 'resolved')
            ->count();

        return [
            'matrix' => array_values($matrix),
            'summary' => [
                'total_available'      => $totalAvailable,
                'total_quarantine'     => $totalQuarantine,
                'total_reserved'       => $totalReserved,
                'expiring_soon_48h'    => $expiringSoon,
                'collections_today'    => $collectionsToday,
                'issues_today'         => $issuesToday,
                'pending_requisitions' => $pendingRequisitions,
                'active_reactions'     => $activeReactions,
                'generated_at'         => $now->toIso8601String(),
            ],
        ];
    }

    /**
     * List donors with search and filters.
     */
    public function getDonors(int $hospitalId, array $filters = []): LengthAwarePaginator
    {
        $query = BloodDonor::where('hospital_id', $hospitalId)
            ->with(['patient']);

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', $search)
                  ->orWhere('mobile', 'LIKE', $search)
                  ->orWhere('donor_number', 'LIKE', $search)
                  ->orWhere('abha_number', 'LIKE', $search);
            });
        }

        if (!empty($filters['blood_group']) && $filters['blood_group'] !== 'all') {
            $query->where('blood_group', $filters['blood_group']);
        }

        if (!empty($filters['donor_type']) && $filters['donor_type'] !== 'all') {
            $query->where('donor_type', $filters['donor_type']);
        }

        if (!empty($filters['deferral_status']) && $filters['deferral_status'] !== 'all') {
            $query->where('deferral_status', $filters['deferral_status']);
        }

        return $query->orderByDesc('id')->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Register a new blood donor.
     */
    public function registerDonor(int $hospitalId, array $data): BloodDonor
    {
        $data['hospital_id'] = $hospitalId;
        $data['total_donations'] = $data['total_donations'] ?? 0;
        $data['deferral_status'] = 'eligible';

        return BloodDonor::create($data);
    }

    /**
     * Perform pre-donation medical screening, vitals check, and phlebotomy unit creation.
     */
    public function screenDonor(int $hospitalId, int $donorId, array $data, ?int $userId = null): array
    {
        $donor = BloodDonor::where('hospital_id', $hospitalId)->findOrFail($donorId);

        $weight = (float) ($data['weight_kg'] ?? 0);
        $hb = (float) ($data['hemoglobin_g_dl'] ?? 0);
        $bpSystolic = (int) ($data['bp_systolic'] ?? 120);
        $bpDiastolic = (int) ($data['bp_diastolic'] ?? 80);
        $pulse = (int) ($data['pulse'] ?? 72);
        $temp = (float) ($data['temperature'] ?? 37.0);
        $medicalAnswers = $data['medical_history_answers'] ?? [];

        // Load Hospital-Configured Screening Protocol & Vital Thresholds
        $config = $this->getScreeningConfig($hospitalId);
        $vitalRules = $config['vital_rules'] ?? [];
        $questions = $config['questions'] ?? [];

        $minHb = (float) ($vitalRules['min_hemoglobin_g_dl'] ?? 12.5);
        $minWeight = (float) ($vitalRules['min_weight_kg'] ?? 45.0);
        $minSys = (int) ($vitalRules['min_bp_systolic'] ?? 100);
        $maxSys = (int) ($vitalRules['max_bp_systolic'] ?? 140);
        $minDia = (int) ($vitalRules['min_bp_diastolic'] ?? 60);
        $maxDia = (int) ($vitalRules['max_bp_diastolic'] ?? 90);
        $minPulse = (int) ($vitalRules['min_pulse'] ?? 60);
        $maxPulse = (int) ($vitalRules['max_pulse'] ?? 100);
        $maxTemp = (float) ($vitalRules['max_temperature'] ?? 37.5);

        // Clinical Evaluation
        $isEligible = true;
        $rejectionReasons = [];
        $isPermanentDeferral = false;
        $maxDeferralDays = 90;

        if ($hb < $minHb) {
            $isEligible = false;
            $rejectionReasons[] = "Hemoglobin is {$hb} g/dL (Minimum {$minHb} required)";
            $maxDeferralDays = max($maxDeferralDays, 90);
        }

        if ($weight < $minWeight) {
            $isEligible = false;
            $rejectionReasons[] = "Weight is {$weight} kg (Minimum {$minWeight} kg required)";
            $maxDeferralDays = max($maxDeferralDays, 30);
        }

        if ($bpSystolic < $minSys || $bpSystolic > $maxSys || $bpDiastolic < $minDia || $bpDiastolic > $maxDia) {
            $isEligible = false;
            $rejectionReasons[] = "Blood Pressure {$bpSystolic}/{$bpDiastolic} mmHg is outside acceptable range ({$minSys}-{$maxSys}/{$minDia}-{$maxDia})";
            $maxDeferralDays = max($maxDeferralDays, 14);
        }

        if ($pulse < $minPulse || $pulse > $maxPulse) {
            $isEligible = false;
            $rejectionReasons[] = "Pulse rate {$pulse} bpm is outside acceptable range ({$minPulse}-{$maxPulse})";
            $maxDeferralDays = max($maxDeferralDays, 7);
        }

        if ($temp > $maxTemp) {
            $isEligible = false;
            $rejectionReasons[] = "Body temperature {$temp}°C exceeds maximum threshold ({$maxTemp}°C)";
            $maxDeferralDays = max($maxDeferralDays, 14);
        }

        // Evaluate all active configured questions (standard + custom)
        foreach ($questions as $q) {
            if (!($q['is_active'] ?? true)) {
                continue;
            }
            $qId = $q['id'];
            if (!empty($medicalAnswers[$qId]) && ($medicalAnswers[$qId] === true || $medicalAnswers[$qId] === 'yes' || $medicalAnswers[$qId] === 1 || $medicalAnswers[$qId] === '1')) {
                $isEligible = false;
                $rejectionReasons[] = $q['label'];

                if (($q['deferral_type'] ?? 'temporary') === 'permanent') {
                    $isPermanentDeferral = true;
                } else {
                    $days = (int) ($q['deferral_days'] ?? 90);
                    $maxDeferralDays = max($maxDeferralDays, $days);
                }
            }
        }

        $rejectionReasonStr = !empty($rejectionReasons) ? implode('; ', $rejectionReasons) : null;

        return DB::transaction(function () use (
            $hospitalId,
            $donor,
            $weight,
            $hb,
            $bpSystolic,
            $bpDiastolic,
            $pulse,
            $temp,
            $medicalAnswers,
            $isEligible,
            $isPermanentDeferral,
            $maxDeferralDays,
            $rejectionReasonStr,
            $data,
            $userId
        ) {
            $screening = DonorScreening::create([
                'hospital_id'             => $hospitalId,
                'donor_id'                => $donor->id,
                'weight_kg'               => $weight,
                'hemoglobin_g_dl'         => $hb,
                'bp_systolic'             => $bpSystolic,
                'bp_diastolic'            => $bpDiastolic,
                'pulse'                   => $pulse,
                'temperature'             => $temp,
                'medical_history_answers' => $medicalAnswers,
                'is_eligible'             => $isEligible,
                'rejection_reason'        => $rejectionReasonStr,
                'donor_signature_data'    => $data['donor_signature_data'] ?? null,
                'examined_by_user_id'     => $userId,
            ]);

            $bloodUnit = null;

            if ($isEligible) {
                // Update Donor records
                $donor->update([
                    'total_donations' => $donor->total_donations + 1,
                    'last_donated_at' => Carbon::now()->toDateString(),
                    'deferral_status' => 'eligible',
                    'deferral_reason' => null,
                    'deferred_until'  => null,
                ]);

                // Create initial Phlebotomy Unit in Quarantine
                $componentType = $data['component_type'] ?? 'whole_blood';
                $volume = (int) ($data['volume_ml'] ?? 350);

                // Default expiry: Whole Blood 35 days in CPDA-1
                $expiryDays = ($componentType === 'sdp' || $componentType === 'platelets') ? 5 : 35;

                $bloodUnit = BloodUnit::create([
                    'hospital_id'       => $hospitalId,
                    'donor_id'          => $donor->id,
                    'screening_id'      => $screening->id,
                    'camp_id'           => $data['camp_id'] ?? null,
                    'blood_group'       => $donor->blood_group,
                    'component_type'    => $componentType,
                    'volume_ml'         => $volume,
                    'bag_type'          => $data['bag_type'] ?? 'triple',
                    'collection_date'   => Carbon::now(),
                    'expiry_date'       => Carbon::now()->addDays($expiryDays),
                    'storage_equipment' => ($componentType === 'platelets' || $componentType === 'sdp') ? 'platelet_agitator' : 'refrigerator',
                    'storage_location'  => $data['storage_location'] ?? 'Quarantine Fridge Q-1',
                    'tti_status'        => 'quarantine',
                    'status'            => 'quarantine',
                ]);
            } else {
                // Mark donor as deferred
                $deferralStatus = $isPermanentDeferral ? 'permanent_deferred' : 'temporary_deferred';
                $deferredUntil = $isPermanentDeferral ? null : Carbon::now()->addDays($maxDeferralDays)->toDateString();
                $donor->update([
                    'deferral_status' => $deferralStatus,
                    'deferral_reason' => $rejectionReasonStr,
                    'deferred_until'  => $deferredUntil,
                ]);
            }

            return [
                'eligible'         => $isEligible,
                'rejection_reason' => $rejectionReasonStr,
                'screening'        => $screening,
                'blood_unit'       => $bloodUnit,
                'donor'            => $donor->fresh(),
            ];
        });
    }

    /**
     * List blood units in inventory with status and component filters.
     */
    public function getBloodUnits(int $hospitalId, array $filters = []): LengthAwarePaginator
    {
        $query = BloodUnit::where('hospital_id', $hospitalId)
            ->with(['donor', 'ttiTest']);

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('unit_barcode', 'LIKE', $search)
                  ->orWhere('storage_location', 'LIKE', $search);
            });
        }

        if (!empty($filters['blood_group']) && $filters['blood_group'] !== 'all') {
            $query->where('blood_group', $filters['blood_group']);
        }

        if (!empty($filters['component_type']) && $filters['component_type'] !== 'all') {
            $query->where('component_type', $filters['component_type']);
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['tti_status']) && $filters['tti_status'] !== 'all') {
            $query->where('tti_status', $filters['tti_status']);
        }

        return $query->orderByDesc('id')->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Record TTI testing results and release unit to available stock or discard.
     */
    public function recordTtiTest(int $hospitalId, int $unitId, array $data, ?int $userId = null): BloodTtiTest
    {
        $unit = BloodUnit::where('hospital_id', $hospitalId)->findOrFail($unitId);

        $hiv = $data['hiv_result'] ?? 'non_reactive';
        $hbv = $data['hbv_result'] ?? 'non_reactive';
        $hcv = $data['hcv_result'] ?? 'non_reactive';
        $syphilis = $data['syphilis_result'] ?? 'non_reactive';
        $malaria = $data['malaria_result'] ?? 'non_reactive';
        $bloodGroupConfirmed = $data['blood_group_confirmed'] ?? $unit->blood_group;

        $passed = ($hiv === 'non_reactive' && $hbv === 'non_reactive' && $hcv === 'non_reactive' && $syphilis === 'non_reactive' && $malaria === 'non_reactive');

        return DB::transaction(function () use (
            $hospitalId,
            $unit,
            $hiv,
            $hbv,
            $hcv,
            $syphilis,
            $malaria,
            $bloodGroupConfirmed,
            $passed,
            $data,
            $userId
        ) {
            $ttiTest = BloodTtiTest::updateOrCreate(
                ['blood_unit_id' => $unit->id],
                [
                    'hospital_id'                 => $hospitalId,
                    'hiv_result'                  => $hiv,
                    'hbv_result'                  => $hbv,
                    'hcv_result'                  => $hcv,
                    'syphilis_result'             => $syphilis,
                    'malaria_result'              => $malaria,
                    'blood_group_confirmed'       => $bloodGroupConfirmed,
                    'overall_status'              => $passed ? 'passed' : 'failed',
                    'remarks'                     => $data['remarks'] ?? null,
                    'tested_by_user_id'           => $userId,
                    'authorized_by_pathologist_id'=> $data['authorized_by_pathologist_id'] ?? $userId,
                    'tested_at'                   => Carbon::now(),
                ]
            );

            if ($passed) {
                // Unit is safe for patient transfusion
                $unit->update([
                    'blood_group'       => $bloodGroupConfirmed,
                    'tti_status'        => 'tested_safe',
                    'status'            => 'available',
                    'storage_location'  => $data['storage_location'] ?? 'Main Storage Refrigerator A',
                ]);
            } else {
                // Biohazard Discard
                $reactiveDiseases = [];
                if ($hiv === 'reactive') $reactiveDiseases[] = 'HIV';
                if ($hbv === 'reactive') $reactiveDiseases[] = 'Hepatitis B';
                if ($hcv === 'reactive') $reactiveDiseases[] = 'Hepatitis C';
                if ($syphilis === 'reactive') $reactiveDiseases[] = 'Syphilis';
                if ($malaria === 'reactive') $reactiveDiseases[] = 'Malaria';

                $reason = 'TTI Reactive: ' . implode(', ', $reactiveDiseases);

                $unit->update([
                    'tti_status'           => 'reactive_discarded',
                    'status'               => 'discarded',
                    'discard_reason'       => $reason,
                    'discard_date'         => Carbon::now(),
                    'discarded_by_user_id' => $userId,
                ]);

                // Permanently defer the donor
                if ($unit->donor_id) {
                    BloodDonor::where('id', $unit->donor_id)->update([
                        'deferral_status' => 'permanent_deferred',
                        'deferral_reason' => $reason,
                    ]);
                }
            }

            return $ttiTest;
        });
    }

    /**
     * Separate whole blood unit into therapeutic components (PRBC, FFP, Platelets).
     */
    public function separateComponents(int $hospitalId, int $unitId, array $components, ?int $userId = null): array
    {
        $parentUnit = BloodUnit::where('hospital_id', $hospitalId)
            ->where('component_type', 'whole_blood')
            ->findOrFail($unitId);

        if ($parentUnit->status === 'discarded' || $parentUnit->tti_status === 'reactive_discarded') {
            throw new \Exception("Cannot separate components from a reactive or discarded blood unit.");
        }

        return DB::transaction(function () use ($hospitalId, $parentUnit, $components, $userId) {
            $createdComponents = [];

            // 1. Packed Red Blood Cells (PRBC)
            if (!empty($components['prbc'])) {
                $createdComponents[] = BloodUnit::create([
                    'hospital_id'       => $hospitalId,
                    'donor_id'          => $parentUnit->donor_id,
                    'screening_id'      => $parentUnit->screening_id,
                    'parent_unit_id'    => $parentUnit->id,
                    'blood_group'       => $parentUnit->blood_group,
                    'component_type'    => 'prbc',
                    'volume_ml'         => $components['prbc_volume'] ?? 240,
                    'bag_type'          => 'triple',
                    'collection_date'   => $parentUnit->collection_date,
                    'expiry_date'       => Carbon::parse($parentUnit->collection_date)->addDays(42),
                    'storage_equipment' => 'refrigerator',
                    'storage_location'  => 'PRBC Fridge #1',
                    'tti_status'        => $parentUnit->tti_status,
                    'is_leukodepleted'  => !empty($components['is_leukodepleted']),
                    'status'            => $parentUnit->tti_status === 'tested_safe' ? 'available' : 'quarantine',
                ]);
            }

            // 2. Fresh Frozen Plasma (FFP)
            if (!empty($components['ffp'])) {
                $createdComponents[] = BloodUnit::create([
                    'hospital_id'       => $hospitalId,
                    'donor_id'          => $parentUnit->donor_id,
                    'screening_id'      => $parentUnit->screening_id,
                    'parent_unit_id'    => $parentUnit->id,
                    'blood_group'       => $parentUnit->blood_group,
                    'component_type'    => 'ffp',
                    'volume_ml'         => $components['ffp_volume'] ?? 180,
                    'bag_type'          => 'triple',
                    'collection_date'   => $parentUnit->collection_date,
                    'expiry_date'       => Carbon::parse($parentUnit->collection_date)->addDays(365), // 1 year
                    'storage_equipment' => 'deep_freezer',
                    'storage_location'  => 'Plasma Deep Freezer (-30C)',
                    'tti_status'        => $parentUnit->tti_status,
                    'status'            => $parentUnit->tti_status === 'tested_safe' ? 'available' : 'quarantine',
                ]);
            }

            // 3. Random Donor Platelet Concentrate (RDP)
            if (!empty($components['platelets'])) {
                $createdComponents[] = BloodUnit::create([
                    'hospital_id'       => $hospitalId,
                    'donor_id'          => $parentUnit->donor_id,
                    'screening_id'      => $parentUnit->screening_id,
                    'parent_unit_id'    => $parentUnit->id,
                    'blood_group'       => $parentUnit->blood_group,
                    'component_type'    => 'platelets',
                    'volume_ml'         => $components['platelet_volume'] ?? 55,
                    'bag_type'          => 'triple',
                    'collection_date'   => $parentUnit->collection_date,
                    'expiry_date'       => Carbon::parse($parentUnit->collection_date)->addDays(5), // 5 days max
                    'storage_equipment' => 'platelet_agitator',
                    'storage_location'  => 'Agitator #1 (22C)',
                    'tti_status'        => $parentUnit->tti_status,
                    'status'            => $parentUnit->tti_status === 'tested_safe' ? 'available' : 'quarantine',
                ]);
            }

            // Mark parent whole blood unit as processed
            $parentUnit->update([
                'status' => 'issued',
                'storage_location' => 'Processed into Components',
            ]);

            return [
                'parent_unit' => $parentUnit,
                'components'  => $createdComponents,
            ];
        });
    }

    /**
     * Create inpatient / OT / emergency blood requisition.
     */
    public function createRequisition(int $hospitalId, array $data): BloodRequisition
    {
        $data['hospital_id'] = $hospitalId;
        $data['units_requested'] = (int) ($data['units_requested'] ?? 1);
        $data['units_crossmatched'] = 0;
        $data['units_issued'] = 0;
        $data['status'] = 'pending';

        return BloodRequisition::create($data);
    }

    /**
     * List blood requisitions with status and urgency filters.
     */
    public function getRequisitions(int $hospitalId, array $filters = []): LengthAwarePaginator
    {
        $query = BloodRequisition::where('hospital_id', $hospitalId)
            ->with(['patient', 'doctor', 'admission.ward', 'crossmatches.bloodUnit']);

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('requisition_number', 'LIKE', $search)
                  ->orWhereHas('patient', function ($pq) use ($search) {
                      $pq->where('name', 'LIKE', $search)
                         ->orWhere('uhid', 'LIKE', $search);
                  });
            });
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['urgency']) && $filters['urgency'] !== 'all') {
            $query->where('urgency', $filters['urgency']);
        }

        return $query->orderByDesc('id')->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Perform major/minor cross-match and reserve unit for patient.
     */
    public function performCrossmatch(int $hospitalId, int $requisitionId, array $data, ?int $userId = null): BloodCrossmatch
    {
        $req = BloodRequisition::where('hospital_id', $hospitalId)->findOrFail($requisitionId);
        $unitId = (int) $data['blood_unit_id'];

        $unit = BloodUnit::where('hospital_id', $hospitalId)->findOrFail($unitId);

        if ($unit->status !== 'available') {
            throw new \Exception("Blood unit {$unit->unit_barcode} is not in available stock (Current status: {$unit->status}).");
        }

        if ($unit->tti_status !== 'tested_safe') {
            throw new \Exception("Blood unit {$unit->unit_barcode} has not passed mandatory TTI clearance.");
        }

        $compatibility = $data['compatibility'] ?? 'compatible';
        $reservationHours = (int) ($data['reservation_hours'] ?? 48);

        return DB::transaction(function () use ($hospitalId, $req, $unit, $compatibility, $reservationHours, $data, $userId) {
            $crossmatch = BloodCrossmatch::create([
                'hospital_id'             => $hospitalId,
                'requisition_id'          => $req->id,
                'blood_unit_id'           => $unit->id,
                'patient_id'              => $req->patient_id,
                'method'                  => $data['method'] ?? 'gel_card',
                'compatibility'           => $compatibility,
                'crossmatched_by_user_id' => $userId,
                'crossmatched_at'         => Carbon::now(),
                'reservation_valid_until' => Carbon::now()->addHours($reservationHours),
                'service_charge'          => (float) ($data['service_charge'] ?? 1200.00),
            ]);

            if ($compatibility === 'compatible') {
                $unit->update(['status' => 'reserved']);
                $req->increment('units_crossmatched');
                $req->update(['status' => 'crossmatched']);
            }

            return $crossmatch->load(['bloodUnit', 'patient', 'crossmatchedByUser']);
        });
    }

    /**
     * Issue cross-matched blood unit with cold-chain verification and compatibility tag.
     */
    public function issueBlood(int $hospitalId, int $crossmatchId, array $data, ?int $userId = null): array
    {
        $crossmatch = BloodCrossmatch::where('hospital_id', $hospitalId)
            ->with(['requisition', 'bloodUnit.donor', 'patient'])
            ->findOrFail($crossmatchId);

        if ($crossmatch->is_issued) {
            throw new \Exception("This blood unit has already been issued on {$crossmatch->issued_at}.");
        }

        if ($crossmatch->compatibility !== 'compatible') {
            throw new \Exception("Cannot issue blood unit because cross-match result is '{$crossmatch->compatibility}'.");
        }

        $now = Carbon::now();
        $staffName = $data['issued_to_staff_name'] ?? 'Ward Nurse In-Charge';
        $coldBoxTemp = (float) ($data['cold_box_temperature'] ?? 4.0);

        return DB::transaction(function () use ($hospitalId, $crossmatch, $now, $staffName, $coldBoxTemp, $userId) {
            $crossmatch->update([
                'is_issued'            => true,
                'issued_at'            => $now,
                'issued_to_staff_name' => $staffName,
                'cold_box_temperature' => $coldBoxTemp,
            ]);

            // Update blood unit status to issued
            $crossmatch->bloodUnit->update([
                'status' => 'issued',
            ]);

            // Increment requisition issued units
            $req = $crossmatch->requisition;
            $req->increment('units_issued');

            if ($req->units_issued >= $req->units_requested) {
                $req->update(['status' => 'issued']);
            } else {
                $req->update(['status' => 'partially_issued']);
            }

            return [
                'crossmatch_id'       => $crossmatch->id,
                'unit_barcode'        => $crossmatch->bloodUnit->unit_barcode,
                'blood_group'         => $crossmatch->bloodUnit->blood_group,
                'component_type'      => strtoupper($crossmatch->bloodUnit->component_type),
                'volume_ml'           => $crossmatch->bloodUnit->volume_ml,
                'patient_name'        => $crossmatch->patient->name,
                'uhid'                => $crossmatch->patient->uhid,
                'requisition_number'  => $req->requisition_number,
                'compatibility'       => $crossmatch->compatibility,
                'method'              => $crossmatch->method,
                'issued_at'           => $now->toIso8601String(),
                'issued_to_staff'     => $staffName,
                'cold_box_temperature'=> $coldBoxTemp,
                'service_charge'      => $crossmatch->service_charge,
            ];
        });
    }

    /**
     * Record HvPI Adverse Transfusion Reaction and auto-quarantine companion units.
     */
    public function recordReaction(int $hospitalId, array $data, ?int $userId = null): BloodTransfusionReaction
    {
        $unitId = (int) $data['blood_unit_id'];
        $unit = BloodUnit::where('hospital_id', $hospitalId)->findOrFail($unitId);

        return DB::transaction(function () use ($hospitalId, $unit, $data, $userId) {
            $reaction = BloodTransfusionReaction::create([
                'hospital_id'            => $hospitalId,
                'blood_unit_id'          => $unit->id,
                'patient_id'             => $data['patient_id'],
                'admission_id'           => $data['admission_id'] ?? null,
                'requisition_id'         => $data['requisition_id'] ?? null,
                'transfusion_started_at' => $data['transfusion_started_at'] ?? Carbon::now()->subMinutes(30),
                'reaction_occurred_at'   => $data['reaction_occurred_at'] ?? Carbon::now(),
                'volume_transfused_ml'   => (int) ($data['volume_transfused_ml'] ?? 50),
                'reaction_type'          => $data['reaction_type'] ?? 'febrile_non_hemolytic',
                'severity'               => $data['severity'] ?? 'moderate',
                'clinical_symptoms'      => $data['clinical_symptoms'] ?? 'Chills, fever, rash',
                'action_taken'           => $data['action_taken'] ?? 'Transfusion stopped immediately, IV access maintained with normal saline.',
                'remnant_bag_returned'   => !empty($data['remnant_bag_returned']),
                'investigation_status'   => 'under_investigation',
                'reported_by_user_id'    => $userId,
            ]);

            // Auto-quarantine any remaining companion units from the same donor
            if ($unit->donor_id) {
                BloodUnit::where('hospital_id', $hospitalId)
                    ->where('donor_id', $unit->donor_id)
                    ->where('id', '!=', $unit->id)
                    ->where('status', 'available')
                    ->update([
                        'status'           => 'quarantine',
                        'storage_location' => 'QUARANTINED - Transfusion Reaction Investigation',
                    ]);
            }

            return $reaction->load(['bloodUnit', 'patient']);
        });
    }

    /**
     * List outdoor blood camps.
     */
    public function getCamps(int $hospitalId, array $filters = []): LengthAwarePaginator
    {
        $query = BloodCamp::where('hospital_id', $hospitalId);

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('camp_name', 'LIKE', $search)
                  ->orWhere('organizer_name', 'LIKE', $search)
                  ->orWhere('location', 'LIKE', $search);
            });
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        return $query->orderByDesc('camp_date')->paginate($filters['per_page'] ?? 10);
    }

    /**
     * Create outdoor blood donation camp.
     */
    public function createCamp(int $hospitalId, array $data): BloodCamp
    {
        $data['hospital_id'] = $hospitalId;
        $data['units_collected'] = 0;
        $data['status'] = $data['status'] ?? 'scheduled';

        return BloodCamp::create($data);
    }

    /**
     * Default Drugs & Cosmetics Act and DGHS statutory pre-donation screening standard.
     */
    public function getDefaultScreeningConfig(): array
    {
        return [
            'vital_rules' => [
                'min_weight_kg'       => 45.0,
                'min_hemoglobin_g_dl' => 12.5,
                'min_bp_systolic'     => 100,
                'max_bp_systolic'     => 140,
                'min_bp_diastolic'    => 60,
                'max_bp_diastolic'    => 90,
                'min_pulse'           => 60,
                'max_pulse'           => 100,
                'max_temperature'     => 37.5,
            ],
            'questions' => [
                [
                    'id'            => 'jaundice_hepatitis',
                    'label'         => 'History of Jaundice, Hepatitis B or Hepatitis C',
                    'category'      => 'Infectious Disease',
                    'deferral_type' => 'permanent',
                    'deferral_days' => null,
                    'is_active'     => true,
                    'is_custom'     => false,
                    'display_order' => 1,
                ],
                [
                    'id'            => 'hiv_risk',
                    'label'         => 'High risk exposure or history of HIV/AIDS',
                    'category'      => 'Infectious Disease',
                    'deferral_type' => 'permanent',
                    'deferral_days' => null,
                    'is_active'     => true,
                    'is_custom'     => false,
                    'display_order' => 2,
                ],
                [
                    'id'            => 'cardiac_disease',
                    'label'         => 'Heart disease, chest pain, or cardiac surgery',
                    'category'      => 'Cardiovascular',
                    'deferral_type' => 'permanent',
                    'deferral_days' => null,
                    'is_active'     => true,
                    'is_custom'     => false,
                    'display_order' => 3,
                ],
                [
                    'id'            => 'insulin_diabetes',
                    'label'         => 'Diabetes Mellitus requiring daily insulin injections',
                    'category'      => 'Metabolic',
                    'deferral_type' => 'permanent',
                    'deferral_days' => null,
                    'is_active'     => true,
                    'is_custom'     => false,
                    'display_order' => 4,
                ],
                [
                    'id'            => 'cancer_history',
                    'label'         => 'History of Malignancy, Cancer, or Blood disorder',
                    'category'      => 'Oncology',
                    'deferral_type' => 'permanent',
                    'deferral_days' => null,
                    'is_active'     => true,
                    'is_custom'     => false,
                    'display_order' => 5,
                ],
                [
                    'id'            => 'recent_malaria_3m',
                    'label'         => 'Malaria, Dengue, or unexplained fever in last 3 months',
                    'category'      => 'Vector-Borne / Fever',
                    'deferral_type' => 'temporary',
                    'deferral_days' => 90,
                    'is_active'     => true,
                    'is_custom'     => false,
                    'display_order' => 6,
                ],
                [
                    'id'            => 'tattoo_piercing_12m',
                    'label'         => 'Tattoo, body piercing, or acupuncture in last 12 months',
                    'category'      => 'High-Risk Exposure',
                    'deferral_type' => 'temporary',
                    'deferral_days' => 365,
                    'is_active'     => true,
                    'is_custom'     => false,
                    'display_order' => 7,
                ],
                [
                    'id'            => 'surgery_6m',
                    'label'         => 'Major dental or surgical operation in last 6 months',
                    'category'      => 'Surgical / Dental',
                    'deferral_type' => 'temporary',
                    'deferral_days' => 180,
                    'is_active'     => true,
                    'is_custom'     => false,
                    'display_order' => 8,
                ],
                [
                    'id'            => 'alcohol_24h',
                    'label'         => 'Alcohol consumption within the last 24 hours',
                    'category'      => 'Lifestyle',
                    'deferral_type' => 'temporary',
                    'deferral_days' => 1,
                    'is_active'     => true,
                    'is_custom'     => false,
                    'display_order' => 9,
                ],
                [
                    'id'            => 'antibiotics_14d',
                    'label'         => 'Antibiotics or immunosuppressant intake in last 14 days',
                    'category'      => 'Medication',
                    'deferral_type' => 'temporary',
                    'deferral_days' => 14,
                    'is_active'     => true,
                    'is_custom'     => false,
                    'display_order' => 10,
                ],
                [
                    'id'            => 'pregnancy_lactation',
                    'label'         => 'Pregnancy, abortion in 6 months, or active lactation',
                    'category'      => 'Obstetric / Gynec',
                    'deferral_type' => 'temporary',
                    'deferral_days' => 180,
                    'is_active'     => true,
                    'is_custom'     => false,
                    'display_order' => 11,
                ],
            ],
        ];
    }

    /**
     * Get customizable donor screening questions and vital thresholds.
     */
    public function getScreeningConfig(int $hospitalId): array
    {
        $saved = HospitalSetting::get($hospitalId, 'blood_bank_screening_config');
        if (!is_array($saved) || empty($saved)) {
            return $this->getDefaultScreeningConfig();
        }

        $defaults = $this->getDefaultScreeningConfig();
        return [
            'vital_rules' => array_merge($defaults['vital_rules'], $saved['vital_rules'] ?? []),
            'questions'   => !empty($saved['questions']) ? $saved['questions'] : $defaults['questions'],
        ];
    }

    /**
     * Update customizable donor screening questions and vital thresholds.
     */
    public function updateScreeningConfig(int $hospitalId, array $config): array
    {
        $defaults = $this->getDefaultScreeningConfig();
        $vitalRules = array_merge($defaults['vital_rules'], $config['vital_rules'] ?? []);
        $questions = $config['questions'] ?? $defaults['questions'];

        $clean = [
            'vital_rules' => $vitalRules,
            'questions'   => array_values($questions),
        ];

        HospitalSetting::set($hospitalId, 'blood_bank_screening_config', $clean, 'blood_bank', 'json');

        return $clean;
    }

    /**
     * Reset screening questions and vital thresholds to national standards.
     */
    public function resetScreeningConfig(int $hospitalId): array
    {
        $defaults = $this->getDefaultScreeningConfig();
        HospitalSetting::set($hospitalId, 'blood_bank_screening_config', $defaults, 'blood_bank', 'json');
        return $defaults;
    }
}
