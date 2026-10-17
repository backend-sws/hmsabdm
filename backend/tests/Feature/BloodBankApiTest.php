<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Hospital;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Department;
use App\Models\BloodDonor;
use App\Models\BloodUnit;
use App\Models\BloodRequisition;
use App\Models\BloodCrossmatch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class BloodBankApiTest extends TestCase
{
    use RefreshDatabase;

    protected Hospital $hospital;
    protected User $technician;
    protected Patient $patient;
    protected Doctor $doctor;
    protected Department $department;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hospital = Hospital::firstOrCreate(
            ['abdm_hip_id' => 'HIP-TEST-BLOOD-BANK'],
            ['name' => 'Metro Care Multispeciality Hospital', 'code' => 'MCMH']
        );

        $this->technician = User::firstOrCreate(
            ['email' => 'bloodbank.tech@metrocare.com'],
            ['name' => 'Sunil Blood Bank Officer', 'password' => bcrypt('password'), 'hospital_id' => $this->hospital->id]
        );

        $this->department = Department::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Transfusion Medicine'],
            ['code' => 'TMED', 'status' => 'active']
        );

        $this->doctor = Doctor::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Dr. Rakesh Pathologist'],
            ['department_id' => $this->department->id, 'specialization' => 'Pathology & Transfusion', 'status' => 'active']
        );

        $this->patient = Patient::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'uhid' => 'UHID-BLD-TEST-001'],
            [
                'name'        => 'Aakash Verma',
                'gender'      => 'M',
                'age'         => 32,
                'mobile'      => '9876543210',
                'blood_group' => 'B+',
            ]
        );
    }

    public function test_can_fetch_blood_bank_dashboard_matrix(): void
    {
        Sanctum::actingAs($this->technician);

        // Seed 1 available B+ unit
        BloodUnit::create([
            'hospital_id'       => $this->hospital->id,
            'blood_group'       => 'B+',
            'component_type'    => 'prbc',
            'volume_ml'         => 250,
            'collection_date'   => now(),
            'expiry_date'       => now()->addDays(42),
            'storage_equipment' => 'refrigerator',
            'storage_location'  => 'PRBC Fridge A',
            'tti_status'        => 'tested_safe',
            'status'            => 'available',
        ]);

        $response = $this->getJson('/api/v1/blood-bank/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'matrix',
                    'summary' => [
                        'total_available',
                        'total_quarantine',
                        'total_reserved',
                        'expiring_soon_48h',
                        'collections_today',
                        'issues_today',
                    ],
                ],
            ]);

        $data = $response->json('data');
        $this->assertCount(8, $data['matrix']); // 8 standard blood groups
        $bPos = collect($data['matrix'])->firstWhere('blood_group', 'B+');
        $this->assertEquals(1, $bPos['prbc_units']);
    }

    public function test_can_register_donor(): void
    {
        Sanctum::actingAs($this->technician);

        $payload = [
            'name'            => 'Vikram Singhania',
            'mobile'          => '9811223344',
            'gender'          => 'M',
            'age'             => 28,
            'blood_group'     => 'O+',
            'donor_type'      => 'voluntary',
            'abha_address'    => 'vikram@abdm',
            'id_proof_type'   => 'aadhaar',
            'id_proof_number' => 'XXXX-XXXX-1234',
            'city'            => 'New Delhi',
        ];

        $response = $this->postJson('/api/v1/blood-bank/donors', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Vikram Singhania')
            ->assertJsonPath('data.blood_group', 'O+');

        $this->assertDatabaseHas('blood_donors', [
            'hospital_id' => $this->hospital->id,
            'mobile'      => '9811223344',
            'blood_group' => 'O+',
        ]);
    }

    public function test_can_screen_donor_and_collect_phlebotomy_unit(): void
    {
        Sanctum::actingAs($this->technician);

        $donor = BloodDonor::create([
            'hospital_id'     => $this->hospital->id,
            'name'            => 'Rahul Sharma',
            'mobile'          => '9988776655',
            'gender'          => 'M',
            'age'             => 24,
            'blood_group'     => 'A+',
            'donor_type'      => 'voluntary',
            'total_donations' => 0,
            'deferral_status' => 'eligible',
        ]);

        $screeningPayload = [
            'weight_kg'               => 65.5,
            'hemoglobin_g_dl'         => 14.2, // Eligible (>= 12.5)
            'bp_systolic'             => 120,
            'bp_diastolic'            => 80,
            'pulse'                   => 74,
            'temperature'             => 37.0,
            'medical_history_answers' => [
                'jaundice_hepatitis' => false,
                'hiv_risk'           => false,
                'cardiac_disease'    => false,
                'tattoo_piercing_12m'=> false,
                'alcohol_24h'        => false,
            ],
            'donor_signature_data'    => 'data:image/png;base64,sample-signature-data',
            'component_type'          => 'whole_blood',
            'volume_ml'               => 350,
            'bag_type'                => 'triple',
            'storage_location'        => 'Quarantine Refrigerator Q-1',
        ];

        $response = $this->postJson("/api/v1/blood-bank/donors/{$donor->id}/screen", $screeningPayload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.eligible', true)
            ->assertJsonPath('data.blood_unit.status', 'quarantine')
            ->assertJsonPath('data.blood_unit.tti_status', 'quarantine');

        $this->assertDatabaseHas('blood_units', [
            'donor_id'    => $donor->id,
            'blood_group' => 'A+',
            'status'      => 'quarantine',
        ]);
    }

    public function test_donor_fails_screening_if_low_hemoglobin(): void
    {
        Sanctum::actingAs($this->technician);

        $donor = BloodDonor::create([
            'hospital_id'     => $this->hospital->id,
            'name'            => 'Anjali Gupta',
            'mobile'          => '9877001122',
            'gender'          => 'F',
            'age'             => 22,
            'blood_group'     => 'B-',
            'donor_type'      => 'voluntary',
            'total_donations' => 0,
            'deferral_status' => 'eligible',
        ]);

        $lowHbPayload = [
            'weight_kg'       => 50.0,
            'hemoglobin_g_dl' => 11.0, // Low (< 12.5)
            'bp_systolic'     => 110,
            'bp_diastolic'    => 70,
            'pulse'           => 76,
        ];

        $response = $this->postJson("/api/v1/blood-bank/donors/{$donor->id}/screen", $lowHbPayload);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.eligible', false);

        $this->assertDatabaseHas('blood_donors', [
            'id'              => $donor->id,
            'deferral_status' => 'temporary_deferred',
        ]);
    }

    public function test_can_record_tti_test_and_release_to_stock(): void
    {
        Sanctum::actingAs($this->technician);

        $unit = BloodUnit::create([
            'hospital_id'       => $this->hospital->id,
            'blood_group'       => 'O+',
            'component_type'    => 'whole_blood',
            'volume_ml'         => 350,
            'collection_date'   => now(),
            'expiry_date'       => now()->addDays(35),
            'storage_equipment' => 'refrigerator',
            'storage_location'  => 'Quarantine Bay',
            'tti_status'        => 'quarantine',
            'status'            => 'quarantine',
        ]);

        $ttiPayload = [
            'hiv_result'            => 'non_reactive',
            'hbv_result'            => 'non_reactive',
            'hcv_result'            => 'non_reactive',
            'syphilis_result'       => 'non_reactive',
            'malaria_result'        => 'non_reactive',
            'blood_group_confirmed' => 'O+',
            'storage_location'      => 'Main Blood Bank Fridge #2',
        ];

        $response = $this->postJson("/api/v1/blood-bank/units/{$unit->id}/tti-test", $ttiPayload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.overall_status', 'passed');

        $this->assertDatabaseHas('blood_units', [
            'id'         => $unit->id,
            'tti_status' => 'tested_safe',
            'status'     => 'available',
        ]);
    }

    public function test_can_separate_whole_blood_into_components(): void
    {
        Sanctum::actingAs($this->technician);

        $unit = BloodUnit::create([
            'hospital_id'       => $this->hospital->id,
            'blood_group'       => 'AB+',
            'component_type'    => 'whole_blood',
            'volume_ml'         => 350,
            'collection_date'   => now(),
            'expiry_date'       => now()->addDays(35),
            'storage_equipment' => 'refrigerator',
            'storage_location'  => 'Centrifuge Room',
            'tti_status'        => 'tested_safe',
            'status'            => 'available',
        ]);

        $separationPayload = [
            'prbc'             => true,
            'prbc_volume'      => 240,
            'is_leukodepleted' => true,
            'ffp'              => true,
            'ffp_volume'       => 180,
            'platelets'        => true,
            'platelet_volume'  => 55,
        ];

        $response = $this->postJson("/api/v1/blood-bank/units/{$unit->id}/separate", $separationPayload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        // 3 child units created
        $this->assertDatabaseHas('blood_units', [
            'parent_unit_id' => $unit->id,
            'component_type' => 'prbc',
            'blood_group'    => 'AB+',
            'status'         => 'available',
        ]);

        $this->assertDatabaseHas('blood_units', [
            'parent_unit_id' => $unit->id,
            'component_type' => 'ffp',
            'blood_group'    => 'AB+',
        ]);

        $this->assertDatabaseHas('blood_units', [
            'parent_unit_id' => $unit->id,
            'component_type' => 'platelets',
            'blood_group'    => 'AB+',
        ]);
    }

    public function test_can_create_requisition_crossmatch_and_issue_blood(): void
    {
        Sanctum::actingAs($this->technician);

        // 1. Create available unit
        $unit = BloodUnit::create([
            'hospital_id'       => $this->hospital->id,
            'blood_group'       => 'B+',
            'component_type'    => 'prbc',
            'volume_ml'         => 240,
            'collection_date'   => now(),
            'expiry_date'       => now()->addDays(30),
            'storage_equipment' => 'refrigerator',
            'storage_location'  => 'PRBC Fridge B',
            'tti_status'        => 'tested_safe',
            'status'            => 'available',
        ]);

        // 2. Doctor requests blood from OT
        $reqPayload = [
            'patient_id'         => $this->patient->id,
            'doctor_id'          => $this->doctor->id,
            'blood_group_needed' => 'B+',
            'component_needed'   => 'prbc',
            'units_requested'    => 1,
            'urgency'            => 'urgent',
            'clinical_indication'=> 'Pre-op reservation for Cholecystectomy',
            'hb_level'           => 9.5,
        ];

        $reqRes = $this->postJson('/api/v1/blood-bank/requisitions', $reqPayload);
        $reqRes->assertStatus(201);
        $reqId = $reqRes->json('data.id');

        // 3. Perform Cross-match
        $xmPayload = [
            'blood_unit_id'     => $unit->id,
            'method'            => 'gel_card',
            'compatibility'     => 'compatible',
            'reservation_hours' => 48,
            'service_charge'    => 1200.00,
        ];

        $xmRes = $this->postJson("/api/v1/blood-bank/requisitions/{$reqId}/crossmatch", $xmPayload);
        $xmRes->assertStatus(201)
            ->assertJsonPath('data.compatibility', 'compatible');

        $xmId = $xmRes->json('data.id');
        $this->assertDatabaseHas('blood_units', ['id' => $unit->id, 'status' => 'reserved']);

        // 4. Issue blood to ward staff
        $issuePayload = [
            'issued_to_staff_name' => 'Sister Deepa (OT Incharge)',
            'cold_box_temperature' => 4.2,
        ];

        $issueRes = $this->postJson("/api/v1/blood-bank/crossmatches/{$xmId}/issue", $issuePayload);
        $issueRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.unit_barcode', $unit->unit_barcode)
            ->assertJsonPath('data.issued_to_staff', 'Sister Deepa (OT Incharge)');

        $this->assertDatabaseHas('blood_units', ['id' => $unit->id, 'status' => 'issued']);
        $this->assertDatabaseHas('blood_requisitions', ['id' => $reqId, 'status' => 'issued', 'units_issued' => 1]);
    }

    public function test_can_record_adverse_reaction_and_auto_quarantine_companion_units(): void
    {
        Sanctum::actingAs($this->technician);

        $donor = BloodDonor::create([
            'hospital_id'     => $this->hospital->id,
            'name'            => 'Donor Multi Unit',
            'mobile'          => '9800112233',
            'gender'          => 'M',
            'age'             => 30,
            'blood_group'     => 'O-',
            'donor_type'      => 'voluntary',
            'total_donations' => 1,
            'deferral_status' => 'eligible',
        ]);

        // Unit 1: PRBC (Issued to patient)
        $unitIssued = BloodUnit::create([
            'hospital_id'       => $this->hospital->id,
            'donor_id'          => $donor->id,
            'blood_group'       => 'O-',
            'component_type'    => 'prbc',
            'volume_ml'         => 240,
            'collection_date'   => now(),
            'expiry_date'       => now()->addDays(30),
            'storage_equipment' => 'refrigerator',
            'tti_status'        => 'tested_safe',
            'status'            => 'issued',
        ]);

        // Unit 2: FFP from same donor still in stock
        $unitCompanion = BloodUnit::create([
            'hospital_id'       => $this->hospital->id,
            'donor_id'          => $donor->id,
            'blood_group'       => 'O-',
            'component_type'    => 'ffp',
            'volume_ml'         => 180,
            'collection_date'   => now(),
            'expiry_date'       => now()->addDays(365),
            'storage_equipment' => 'deep_freezer',
            'tti_status'        => 'tested_safe',
            'status'            => 'available',
        ]);

        // Report reaction during PRBC transfusion
        $reactionPayload = [
            'blood_unit_id'          => $unitIssued->id,
            'patient_id'             => $this->patient->id,
            'reaction_type'          => 'febrile_non_hemolytic',
            'severity'               => 'moderate',
            'clinical_symptoms'      => 'Rigors, high fever 102F, tachycardia',
            'action_taken'           => 'Transfusion stopped, bag sent back for workup',
            'remnant_bag_returned'   => true,
            'volume_transfused_ml'   => 40,
        ];

        $res = $this->postJson('/api/v1/blood-bank/reactions', $reactionPayload);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.investigation_status', 'under_investigation');

        // Verify companion FFP unit is auto-quarantined!
        $this->assertDatabaseHas('blood_units', [
            'id'     => $unitCompanion->id,
            'status' => 'quarantine',
        ]);
    }

    public function test_can_fetch_and_update_screening_configuration(): void
    {
        Sanctum::actingAs($this->technician);

        // 1. Fetch default configuration
        $res = $this->getJson('/api/v1/blood-bank/screening-config');
        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.vital_rules.min_hemoglobin_g_dl', 12.5)
            ->assertJsonCount(11, 'data.questions');

        // 2. Update configuration with a new custom question and customized Hb limit
        $updatePayload = [
            'vital_rules' => [
                'min_hemoglobin_g_dl' => 13.0,
                'min_weight_kg'       => 50.0,
            ],
            'questions' => array_merge($res->json('data.questions'), [
                [
                    'id'            => 'covid_vaccine_14d',
                    'label'         => 'COVID-19 or viral vaccination in last 14 days',
                    'category'      => 'Vaccination',
                    'deferral_type' => 'temporary',
                    'deferral_days' => 14,
                    'is_active'     => true,
                    'is_custom'     => true,
                    'display_order' => 12,
                ],
            ]),
        ];

        $updateRes = $this->putJson('/api/v1/blood-bank/screening-config', $updatePayload);
        $updateRes->assertStatus(200)
            ->assertJsonPath('data.vital_rules.min_hemoglobin_g_dl', 13)
            ->assertJsonCount(12, 'data.questions');

        // 3. Reset back to defaults
        $resetRes = $this->postJson('/api/v1/blood-bank/screening-config/reset');
        $resetRes->assertStatus(200)
            ->assertJsonPath('data.vital_rules.min_hemoglobin_g_dl', 12.5)
            ->assertJsonCount(11, 'data.questions');
    }

    public function test_custom_screening_questions_and_vital_rules_are_enforced(): void
    {
        Sanctum::actingAs($this->technician);

        // Configure strict Hb = 13.0 and custom question
        $this->putJson('/api/v1/blood-bank/screening-config', [
            'vital_rules' => [
                'min_hemoglobin_g_dl' => 13.0,
            ],
            'questions' => [
                [
                    'id'            => 'travel_zika_zone',
                    'label'         => 'Travel to Zika virus endemic territory in last 4 weeks',
                    'category'      => 'Travel / Vector-Borne',
                    'deferral_type' => 'temporary',
                    'deferral_days' => 28,
                    'is_active'     => true,
                    'is_custom'     => true,
                    'display_order' => 1,
                ],
            ],
        ]);

        $donor = BloodDonor::create([
            'hospital_id'     => $this->hospital->id,
            'donor_number'    => 'DN-2026-99999',
            'name'            => 'Pooja Sharma',
            'mobile'          => '9876543299',
            'gender'          => 'F',
            'age'             => 28,
            'blood_group'     => 'A+',
            'donor_type'      => 'voluntary',
            'deferral_status' => 'eligible',
        ]);

        // Attempt screening with Hb 12.6 (which passes national default 12.5, but fails our configured 13.0!)
        $failHbPayload = [
            'weight_kg'               => 55,
            'hemoglobin_g_dl'         => 12.6,
            'bp_systolic'             => 120,
            'bp_diastolic'            => 80,
            'pulse'                   => 74,
            'temperature'             => 37.0,
            'medical_history_answers' => ['travel_zika_zone' => false],
            'donor_signature_data'    => 'CONFIRMED_INFORMED_CONSENT',
        ];

        $res1 = $this->postJson("/api/v1/blood-bank/donors/{$donor->id}/screen", $failHbPayload);
        $res1->assertStatus(422);
        $this->assertStringContainsString('Minimum 13 required', $res1->json('message'));

        // Attempt screening with Hb 13.5 but custom question checked = true
        $failCustomQuestionPayload = [
            'weight_kg'               => 55,
            'hemoglobin_g_dl'         => 13.5,
            'bp_systolic'             => 120,
            'bp_diastolic'            => 80,
            'pulse'                   => 74,
            'temperature'             => 37.0,
            'medical_history_answers' => ['travel_zika_zone' => true],
            'donor_signature_data'    => 'CONFIRMED_INFORMED_CONSENT',
        ];

        $res2 = $this->postJson("/api/v1/blood-bank/donors/{$donor->id}/screen", $failCustomQuestionPayload);
        $res2->assertStatus(422);
        $this->assertStringContainsString('Travel to Zika virus endemic territory', $res2->json('message'));
    }
}
