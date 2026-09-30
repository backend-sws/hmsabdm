<?php

namespace App\Services\Billing;

use App\Models\ChargeCategory;
use App\Models\ChargeMaster;
use App\Models\BillingLedgerItem;
use App\Models\HospitalSetting;
use App\Http\Traits\CanFilterAndPaginate;
use Illuminate\Support\Facades\DB;

class ChargeService implements ChargeServiceInterface
{
    use CanFilterAndPaginate;

    public function getCategories(int $hospitalId)
    {
        return ChargeCategory::where('hospital_id', $hospitalId)
            ->where('is_active', true)
            ->withCount('charges')
            ->orderBy('id', 'asc')
            ->get();
    }

    public function createCategory(int $hospitalId, array $data)
    {
        return ChargeCategory::create([
            'hospital_id'  => $hospitalId,
            'name'         => $data['name'],
            'display_name' => $data['display_name'],
            'description'  => $data['description'] ?? null,
            'is_active'    => true,
        ]);
    }

    public function getCharges(int $hospitalId, $request = null)
    {
        $req = $request ?? request();

        $query = ChargeMaster::where('hospital_id', $hospitalId)
            ->with(['category', 'ward', 'doctor', 'department']);

        if ($req && $req->filled('category_id')) {
            $query->where('category_id', $req->category_id);
        }

        if ($req && $req->filled('category')) {
            $query->whereHas('category', function ($q) use ($req) {
                $q->where('name', $req->category);
            });
        }

        if ($req && $req->filled('billing_type')) {
            $query->where('billing_type', $req->billing_type);
        }

        if ($req && $req->filled('ward_id')) {
            $query->where('ward_id', $req->ward_id);
        }

        if ($req && $req->filled('search')) {
            $search = $req->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('code', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $query->orderBy('name', 'asc');

        return $this->applyPaginationOrAll($query, $req);
    }

    public function createCharge(int $hospitalId, array $data)
    {
        return ChargeMaster::create([
            'hospital_id'    => $hospitalId,
            'category_id'    => $data['category_id'],
            'code'           => strtoupper(trim($data['code'])),
            'name'           => trim($data['name']),
            'description'    => $data['description'] ?? null,
            'billing_type'   => $data['billing_type'] ?? 'fixed',
            'standard_rate'  => (float) $data['standard_rate'],
            'tax_percentage' => (float) ($data['tax_percentage'] ?? 0.0),
            'department_id'  => $data['department_id'] ?? null,
            'doctor_id'      => $data['doctor_id'] ?? null,
            'ward_id'        => $data['ward_id'] ?? null,
            'is_active'      => true,
            'is_system'      => false,
        ]);
    }

    public function updateCharge(int $hospitalId, int $chargeId, array $data)
    {
        $charge = ChargeMaster::where('hospital_id', $hospitalId)->findOrFail($chargeId);

        $charge->update([
            'name'           => $data['name'] ?? $charge->name,
            'description'    => array_key_exists('description', $data) ? $data['description'] : $charge->description,
            'billing_type'   => $data['billing_type'] ?? $charge->billing_type,
            'standard_rate'  => isset($data['standard_rate']) ? (float) $data['standard_rate'] : $charge->standard_rate,
            'tax_percentage' => isset($data['tax_percentage']) ? (float) $data['tax_percentage'] : $charge->tax_percentage,
            'department_id'  => array_key_exists('department_id', $data) ? $data['department_id'] : $charge->department_id,
            'doctor_id'      => array_key_exists('doctor_id', $data) ? $data['doctor_id'] : $charge->doctor_id,
            'ward_id'        => array_key_exists('ward_id', $data) ? $data['ward_id'] : $charge->ward_id,
            'is_active'      => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : $charge->is_active,
        ]);

        return $charge->refresh()->load(['category', 'ward', 'doctor']);
    }

    public function deleteCharge(int $hospitalId, int $chargeId)
    {
        $charge = ChargeMaster::where('hospital_id', $hospitalId)->findOrFail($chargeId);

        if ($charge->is_system) {
            // Soft-deactivate system charges so they don't break historic ledgers
            $charge->update(['is_active' => false]);
            return true;
        }

        $charge->delete();
        return true;
    }

    public function postLedgerCharge(int $hospitalId, int $userId, array $data)
    {
        $unitPrice = (float) $data['unit_price'];
        $quantity = (float) ($data['quantity'] ?? 1.0);
        $taxAmount = (float) ($data['tax_amount'] ?? 0.0);
        $discountAmount = (float) ($data['discount_amount'] ?? 0.0);
        $totalAmount = round(($unitPrice * $quantity) + $taxAmount - $discountAmount, 2);

        return BillingLedgerItem::create([
            'hospital_id'        => $hospitalId,
            'patient_id'         => $data['patient_id'],
            'encounter_type'     => $data['encounter_type'],
            'encounter_id'       => $data['encounter_id'],
            'charge_id'          => $data['charge_id'] ?? null,
            'category'           => $data['category'] ?? 'other',
            'item_name'          => $data['item_name'],
            'unit_price'         => $unitPrice,
            'quantity'           => $quantity,
            'tax_amount'         => $taxAmount,
            'discount_amount'    => $discountAmount,
            'total_amount'       => $totalAmount,
            'charged_at'         => $data['charged_at'] ?? now(),
            'charged_by_user_id' => $userId,
            'auto_generated'     => $data['auto_generated'] ?? false,
            'notes'              => $data['notes'] ?? null,
            'status'             => 'unbilled',
        ]);
    }

    public function getPatientLedger(int $hospitalId, int $patientId, $request = null)
    {
        $req = $request ?? request();

        $query = BillingLedgerItem::where('hospital_id', $hospitalId)
            ->where('patient_id', $patientId)
            ->with(['charge', 'chargedBy:id,name,username'])
            ->orderBy('charged_at', 'desc');

        if ($req && $req->filled('encounter_type')) {
            $query->where('encounter_type', $req->encounter_type);
        }

        if ($req && $req->filled('encounter_id')) {
            $query->where('encounter_id', $req->encounter_id);
        }

        if ($req && $req->filled('status')) {
            $query->where('status', $req->status);
        }

        $items = $query->get();

        // Calculate running ledger totals
        $grossTotal = $items->where('status', '!=', 'cancelled')->sum(fn($i) => $i->unit_price * $i->quantity);
        $totalTax = $items->where('status', '!=', 'cancelled')->sum('tax_amount');
        $totalDiscount = $items->where('status', '!=', 'cancelled')->sum('discount_amount');
        $netTotal = $items->where('status', '!=', 'cancelled')->sum('total_amount');

        // Category breakdown
        $byCategory = $items->where('status', '!=', 'cancelled')->groupBy('category')->map(function ($group) {
            return [
                'count' => $group->count(),
                'total' => round($group->sum('total_amount'), 2),
            ];
        });

        return [
            'patient_id'    => $patientId,
            'gross_total'   => round($grossTotal, 2),
            'tax_total'     => round($totalTax, 2),
            'discount_total'=> round($totalDiscount, 2),
            'net_total'     => round($netTotal, 2),
            'by_category'   => $byCategory,
            'item_count'    => $items->count(),
            'items'         => $items,
        ];
    }

    public function cancelLedgerItem(int $hospitalId, int $itemId, string $reason)
    {
        $item = BillingLedgerItem::where('hospital_id', $hospitalId)->findOrFail($itemId);

        if ($item->status === 'billed') {
            throw new \Exception('Cannot cancel an item that has already been billed in a final invoice.');
        }

        $item->update([
            'status' => 'cancelled',
            'notes'  => trim(($item->notes ? $item->notes . ' | ' : '') . 'Cancelled: ' . $reason),
        ]);

        return $item->refresh();
    }

    // ===============================================
    // ⚙️ BED BILLING CUSTOMIZABLE SETTINGS
    // ===============================================

    public function getBedBillingConfig(int $hospitalId): array
    {
        $defaults = [
            'bed_billing_cycle'            => 'admission_24h', // 'admission_24h', 'midnight', 'custom_cutoff', 'hourly'
            'bed_cutoff_time'             => '00:00',
            'bed_grace_period_minutes'    => 120,
            'same_day_discharge_rule'     => 'half_day',      // 'full_day', 'half_day', 'hourly', 'free_if_under_grace'
            'auto_apply_nursing_with_bed' => true,
        ];

        $settings = HospitalSetting::where('hospital_id', $hospitalId)
            ->where('group', 'bed_billing')
            ->pluck('value', 'key')
            ->toArray();

        return [
            'bed_billing_cycle'            => $settings['bed_billing_cycle'] ?? $defaults['bed_billing_cycle'],
            'bed_cutoff_time'             => $settings['bed_cutoff_time'] ?? $defaults['bed_cutoff_time'],
            'bed_grace_period_minutes'    => (int) ($settings['bed_grace_period_minutes'] ?? $defaults['bed_grace_period_minutes']),
            'same_day_discharge_rule'     => $settings['same_day_discharge_rule'] ?? $defaults['same_day_discharge_rule'],
            'auto_apply_nursing_with_bed' => filter_var($settings['auto_apply_nursing_with_bed'] ?? $defaults['auto_apply_nursing_with_bed'], FILTER_VALIDATE_BOOLEAN),
        ];
    }

    public function updateBedBillingConfig(int $hospitalId, array $data): array
    {
        $keys = [
            'bed_billing_cycle'            => 'string',
            'bed_cutoff_time'             => 'string',
            'bed_grace_period_minutes'    => 'integer',
            'same_day_discharge_rule'     => 'string',
            'auto_apply_nursing_with_bed' => 'boolean',
        ];

        foreach ($keys as $key => $type) {
            if (array_key_exists($key, $data)) {
                $val = $type === 'boolean' ? ($data[$key] ? '1' : '0') : (string) $data[$key];

                HospitalSetting::updateOrCreate(
                    ['hospital_id' => $hospitalId, 'key' => $key],
                    ['group' => 'bed_billing', 'value' => $val, 'type' => $type]
                );
            }
        }

        return $this->getBedBillingConfig($hospitalId);
    }
}
