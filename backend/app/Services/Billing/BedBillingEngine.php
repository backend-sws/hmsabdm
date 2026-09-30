<?php

namespace App\Services\Billing;

use App\Models\Hospital;
use App\Models\IpdAdmission;
use App\Models\ChargeMaster;
use App\Models\BillingLedgerItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class BedBillingEngine
{
    public function __construct(
        protected ChargeServiceInterface $chargeService
    ) {}

    /**
     * Process bed charges for all hospitals or a specific hospital.
     */
    public function run(?int $hospitalId = null, ?Carbon $now = null): array
    {
        $currentTime = $now ?? Carbon::now();
        $query = Hospital::query();

        if ($hospitalId) {
            $query->where('id', $hospitalId);
        }

        $hospitals = $query->get();
        $results = [];

        foreach ($hospitals as $hosp) {
            $results[$hosp->id] = $this->processHospitalBedCharges($hosp->id, $currentTime);
        }

        return $results;
    }

    /**
     * Process bed charges for a single hospital based on its custom billing rules.
     */
    public function processHospitalBedCharges(int $hospitalId, Carbon $now): array
    {
        $config = $this->chargeService->getBedBillingConfig($hospitalId);
        $cycleType = $config['bed_billing_cycle']; // 'admission_24h', 'midnight', 'custom_cutoff', 'hourly'
        $graceMinutes = (int) ($config['bed_grace_period_minutes'] ?? $config['grace_period_minutes'] ?? 120);
        $autoNursing = (bool) ($config['auto_apply_nursing_with_bed'] ?? true);

        // Get all currently admitted patients
        $admissions = IpdAdmission::where('hospital_id', $hospitalId)
            ->where('status', 'admitted')
            ->whereNotNull('bed_id')
            ->with(['bed', 'ward', 'patient'])
            ->get();

        $processedCount = 0;
        $chargesPostedCount = 0;
        $totalAmount = 0.0;

        foreach ($admissions as $admission) {
            $processedCount++;
            $admittedAt = Carbon::parse($admission->admission_date ?? $admission->admitted_at ?? $admission->created_at);

            // Skip if admitted within grace period minutes
            if (abs($now->diffInMinutes($admittedAt)) < $graceMinutes) {
                continue;
            }

            // Calculate cycles due based on configured policy
            $cyclesDue = $this->calculateCyclesDue($cycleType, $admittedAt, $now, $config);

            // Count existing cycles charged
            $cyclesCharged = BillingLedgerItem::where('hospital_id', $hospitalId)
                ->where('encounter_type', 'ipd')
                ->where('encounter_id', $admission->id)
                ->where('category', 'bed_charges')
                ->where('status', '!=', 'cancelled')
                ->count();

            $pendingCycles = $cyclesDue - $cyclesCharged;

            if ($pendingCycles > 0) {
                // Find ward bed rate
                $bedCharge = $this->resolveBedCharge($hospitalId, $admission->ward_id);
                $rate = $bedCharge ? $bedCharge->standard_rate : 800.00;
                $chargeName = $bedCharge ? $bedCharge->name : ($admission->ward ? $admission->ward->name . ' Bed Rent' : 'Daily Bed Rent');

                // Find nursing rate if configured
                $nursingCharge = $autoNursing ? $this->resolveNursingCharge($hospitalId, $admission->ward_id) : null;

                for ($c = $cyclesCharged + 1; $c <= $cyclesDue; $c++) {
                    // 1. Post Bed Charge
                    $ledgerItem = BillingLedgerItem::create([
                        'hospital_id'        => $hospitalId,
                        'patient_id'         => $admission->patient_id,
                        'encounter_type'     => 'ipd',
                        'encounter_id'       => $admission->id,
                        'charge_id'          => $bedCharge?->id,
                        'category'           => 'bed_charges',
                        'item_name'          => $chargeName . " (Cycle #{$c})",
                        'unit_price'         => $rate,
                        'quantity'           => 1.0,
                        'tax_amount'         => 0.00,
                        'discount_amount'    => 0.00,
                        'total_amount'       => $rate,
                        'charged_at'         => $now,
                        'charged_by_user_id' => 0, // System Cron
                        'auto_generated'     => true,
                        'notes'              => "Auto-posted under {$cycleType} policy (Cycle #{$c})",
                        'status'             => 'unbilled',
                    ]);

                    $chargesPostedCount++;
                    $totalAmount += $rate;

                    // 2. Post Daily Nursing Care if enabled
                    if ($nursingCharge) {
                        $nursingRate = $nursingCharge->standard_rate;
                        BillingLedgerItem::create([
                            'hospital_id'        => $hospitalId,
                            'patient_id'         => $admission->patient_id,
                            'encounter_type'     => 'ipd',
                            'encounter_id'       => $admission->id,
                            'charge_id'          => $nursingCharge->id,
                            'category'           => 'nursing_charges',
                            'item_name'          => $nursingCharge->name . " (Cycle #{$c})",
                            'unit_price'         => $nursingRate,
                            'quantity'           => 1.0,
                            'tax_amount'         => 0.00,
                            'discount_amount'    => 0.00,
                            'total_amount'       => $nursingRate,
                            'charged_at'         => $now,
                            'charged_by_user_id' => 0,
                            'auto_generated'     => true,
                            'notes'              => "Auto nursing care with bed (Cycle #{$c})",
                            'status'             => 'unbilled',
                        ]);

                        $chargesPostedCount++;
                        $totalAmount += $nursingRate;
                    }
                }
            }
        }

        return [
            'hospital_id'          => $hospitalId,
            'policy'               => $cycleType,
            'admissions_checked'   => $processedCount,
            'charges_posted'       => $chargesPostedCount,
            'total_amount'         => round($totalAmount, 2),
        ];
    }

    /**
     * Calculate how many cycles are due according to the hospital's billing policy.
     */
    protected function calculateCyclesDue(string $cycleType, Carbon $admittedAt, Carbon $now, array $config): int
    {
        switch ($cycleType) {
            case 'admission_24h':
                // 24-hour cycle from exact bed allotment timestamp
                $diffHours = abs($now->diffInHours($admittedAt));
                // Cycle 1 is charged at admission (or after grace), cycle 2 at 24h, cycle 3 at 48h, etc.
                return (int) floor($diffHours / 24) + 1;

            case 'midnight':
                // Each midnight crossed represents 1 cycle + day of admission
                $startOfDayAdmission = $admittedAt->copy()->startOfDay();
                $startOfDayNow = $now->copy()->startOfDay();
                return max(1, abs($startOfDayAdmission->diffInDays($startOfDayNow)) + 1);

            case 'custom_cutoff':
                // Cutoff hour based (e.g. 12:00 PM cutoff)
                $cutoffStr = $config['bed_cutoff_time'] ?? '12:00';
                [$hour, $min] = explode(':', $cutoffStr);
                $cutoffToday = $now->copy()->setTime((int)$hour, (int)$min, 0);
                $days = abs($admittedAt->copy()->startOfDay()->diffInDays($now->copy()->startOfDay()));
                if ($now->greaterThanOrEqualTo($cutoffToday)) {
                    $days += 1;
                }
                return max(1, $days);

            case 'hourly':
                return max(1, (int) ceil(abs($now->diffInMinutes($admittedAt)) / 60));

            default:
                return (int) floor(abs($now->diffInHours($admittedAt)) / 24) + 1;
        }
    }

    /**
     * Find the best matching bed tariff for a ward.
     */
    protected function resolveBedCharge(int $hospitalId, ?int $wardId): ?ChargeMaster
    {
        if ($wardId) {
            $wardCharge = ChargeMaster::where('hospital_id', $hospitalId)
                ->where('category_id', function ($q) use ($hospitalId) {
                    $q->select('id')->from('charge_categories')->where('hospital_id', $hospitalId)->where('name', 'bed_charges');
                })
                ->where('ward_id', $wardId)
                ->where('is_active', true)
                ->first();

            if ($wardCharge) return $wardCharge;
        }

        // Fallback to default General Bed Rent
        return ChargeMaster::where('hospital_id', $hospitalId)
            ->where('code', 'BED-GEN')
            ->first();
    }

    /**
     * Find matching routine nursing charge.
     */
    protected function resolveNursingCharge(int $hospitalId, ?int $wardId): ?ChargeMaster
    {
        return ChargeMaster::where('hospital_id', $hospitalId)
            ->where('code', 'NURS-DAILY')
            ->first();
    }
}
