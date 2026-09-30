<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Hospital;
use App\Models\Patient;
use App\Models\ChargeCategory;
use App\Models\ChargeMaster;
use App\Models\BillingLedgerItem;
use App\Models\Ward;
use App\Models\Bed;
use App\Models\IpdAdmission;
use Database\Seeders\ChargeMasterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class ChargeBillingApiTest extends TestCase
{
    use RefreshDatabase;

    protected Hospital $hospital;
    protected User $user;
    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hospital = Hospital::firstOrCreate(
            ['abdm_hip_id' => 'HIP-TEST-BILLING'],
            ['name' => 'City Care Hospital', 'code' => 'CCH']
        );

        ChargeMasterSeeder::seedHospitalCharges($this->hospital->id);

        $this->user = User::firstOrCreate(
            ['email' => 'admin@billingtest.com'],
            ['name' => 'Billing Admin', 'password' => bcrypt('password'), 'hospital_id' => $this->hospital->id]
        );

        $this->patient = Patient::firstOrCreate(
            ['mobile' => '9998887776', 'hospital_id' => $this->hospital->id],
            ['name' => 'Ramesh Kumar', 'gender' => 'M', 'dob' => '1985-05-15']
        );

        Sanctum::actingAs($this->user);
    }

    public function test_can_fetch_charge_categories()
    {
        $response = $this->getJson('/api/v1/billing/charges/categories');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'display_name', 'charges_count']
                ]
            ]);
    }

    public function test_can_create_and_update_service_charge()
    {
        $category = ChargeCategory::where('hospital_id', $this->hospital->id)->first();

        // 1. Create Charge
        $createResponse = $this->postJson('/api/v1/billing/charges', [
            'category_id'   => $category->id,
            'code'          => 'TEST-PROC-01',
            'name'          => 'Bedside Dialysis Procedure',
            'billing_type'  => 'fixed',
            'standard_rate' => 2500.00,
            'tax_percentage'=> 0.00,
            'description'   => 'Test dialysis procedure description'
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'TEST-PROC-01')
            ->assertJsonPath('data.standard_rate', 2500);

        $chargeId = $createResponse->json('data.id');

        // 2. Update Charge
        $updateResponse = $this->putJson("/api/v1/billing/charges/{$chargeId}", [
            'standard_rate' => 2800.00,
            'name'          => 'Bedside Hemodialysis Extended',
        ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.standard_rate', 2800)
            ->assertJsonPath('data.name', 'Bedside Hemodialysis Extended');
    }

    public function test_can_get_and_update_customizable_bed_billing_settings()
    {
        // 1. Get Settings
        $getResponse = $this->getJson('/api/v1/hospital/settings/bed-billing');

        $getResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'bed_billing_cycle',
                    'bed_cutoff_time',
                    'bed_grace_period_minutes',
                    'same_day_discharge_rule',
                    'auto_apply_nursing_with_bed',
                ]
            ]);

        // 2. Update to Custom 24-Hour Cycle
        $putResponse = $this->putJson('/api/v1/hospital/settings/bed-billing', [
            'bed_billing_cycle'        => 'admission_24h',
            'bed_grace_period_minutes'=> 60,
            'same_day_discharge_rule' => 'hourly',
            'auto_apply_nursing_with_bed' => true,
        ]);

        $putResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.bed_billing_cycle', 'admission_24h')
            ->assertJsonPath('data.bed_grace_period_minutes', 60)
            ->assertJsonPath('data.same_day_discharge_rule', 'hourly');
    }

    public function test_can_post_charge_to_patient_ledger_and_view_summary()
    {
        // Post a bedside dressing charge
        $postResponse = $this->postJson('/api/v1/billing/ledger/charge', [
            'patient_id'     => $this->patient->id,
            'encounter_type' => 'ipd',
            'encounter_id'   => 1,
            'category'       => 'nursing_charges',
            'item_name'      => 'Bedside Wound Dressing (Major)',
            'unit_price'     => 500.00,
            'quantity'       => 2.0,
            'discount_amount'=> 50.00,
            'notes'          => 'Post-op dressing done at 10 AM'
        ]);

        $postResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_amount', 950); // (500 * 2) - 50 = 950

        $itemId = $postResponse->json('data.id');

        // View running ledger
        $ledgerResponse = $this->getJson("/api/v1/billing/ledger/patient/{$this->patient->id}");

        $ledgerResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.gross_total', 1000)
            ->assertJsonPath('data.discount_total', 50)
            ->assertJsonPath('data.net_total', 950);

        // Cancel the item
        $cancelResponse = $this->postJson("/api/v1/billing/ledger/{$itemId}/cancel", [
            'reason' => 'Doctor cancelled procedure'
        ]);

        $cancelResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_automated_bed_charge_engine_calculates_and_posts_charges()
    {
        // 1. Create a Ward and Bed
        $ward = Ward::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Special ICU Ward'],
            ['floor' => '2nd Floor', 'type' => 'icu', 'is_active' => true]
        );

        $bed = Bed::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'bed_number' => 'ICU-B-99'],
            ['ward_id' => $ward->id, 'status' => 'occupied', 'daily_rate' => 5000.00]
        );

        // 2. Create an Admission admitted 25 hours ago
        $admission = IpdAdmission::create([
            'hospital_id'    => $this->hospital->id,
            'ipd_number'     => 'IPD-TEST-99',
            'patient_id'     => $this->patient->id,
            'ward_id'        => $ward->id,
            'bed_id'         => $bed->id,
            'status'         => 'admitted',
            'admission_type' => 'planned',
            'admission_date' => now()->subHours(25),
        ]);

        // 3. Trigger Bed Billing Engine
        $response = $this->postJson('/api/v1/billing/charges/apply-bed-charges');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        // 4. Verify charges were posted in ledger
        $this->assertDatabaseHas('billing_ledger_items', [
            'hospital_id'    => $this->hospital->id,
            'patient_id'     => $this->patient->id,
            'encounter_type' => 'ipd',
            'encounter_id'   => $admission->id,
            'category'       => 'bed_charges',
            'auto_generated' => true,
        ]);
    }
}
