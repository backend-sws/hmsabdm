<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Hospital;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Department;
use App\Models\Ward;
use App\Models\Bed;
use App\Models\IpdAdmission;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\BillingLedgerItem;
use Database\Seeders\ChargeMasterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class IpdNursingRegistersTest extends TestCase
{
    use RefreshDatabase;

    protected Hospital $hospital;
    protected User $nurseUser;
    protected Department $department;
    protected Doctor $doctor;
    protected Ward $icuWard;
    protected Bed $icuBed;
    protected Patient $patient;
    protected IpdAdmission $admission;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hospital = Hospital::firstOrCreate(
            ['abdm_hip_id' => 'HIP-TEST-NURSING-CARE'],
            ['name' => 'Metro Care Multispeciality Hospital', 'code' => 'MCMH']
        );

        ChargeMasterSeeder::seedHospitalCharges($this->hospital->id);

        $this->nurseUser = User::firstOrCreate(
            ['email' => 'nurse.sunita@metrocare.com'],
            ['name' => 'Nurse Sunita Verma', 'password' => bcrypt('password'), 'hospital_id' => $this->hospital->id]
        );

        $this->department = Department::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Critical Care & ICU'],
            ['code' => 'CCU', 'status' => 'active']
        );

        $this->doctor = Doctor::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Dr. Sameer Khan'],
            [
                'department_id'  => $this->department->id,
                'specialization' => 'Intensivist',
                'status'         => 'active',
                'phone'          => '9876543200',
            ]
        );

        $this->icuWard = Ward::create([
            'hospital_id'  => $this->hospital->id,
            'name'         => 'Intensive Care Unit (ICU)',
            'ward_type'    => 'icu',
            'daily_charge' => 6500.00,
            'is_active'    => true,
        ]);

        $this->icuBed = Bed::create([
            'hospital_id'  => $this->hospital->id,
            'ward_id'      => $this->icuWard->id,
            'bed_number'   => 'ICU-BED-01',
            'daily_charge' => 6500.00,
            'status'       => 'occupied',
            'is_active'    => true,
        ]);

        $this->patient = Patient::create([
            'hospital_id' => $this->hospital->id,
            'name'        => 'Rajiv Malhotra',
            'gender'      => 'M',
            'dob'         => '1980-04-12',
            'mobile'      => '9811002233',
            'blood_group' => 'A+',
        ]);

        $this->admission = IpdAdmission::create([
            'hospital_id'      => $this->hospital->id,
            'patient_id'        => $this->patient->id,
            'doctor_id'         => $this->doctor->id,
            'department_id'     => $this->department->id,
            'ward_id'           => $this->icuWard->id,
            'bed_id'            => $this->icuBed->id,
            'admission_type'    => 'emergency',
            'admission_reason'  => 'Severe Sepsis with Acute Respiratory Distress',
            'status'            => 'admitted',
            'advance_deposit'   => 15000.00,
            'admission_date'    => now()->subDays(2),
        ]);
    }

    public function test_can_record_fluid_intake_and_output_and_compute_net_balance()
    {
        Sanctum::actingAs($this->nurseUser);

        // 1. Record Intake: Normal Saline IV (500 ml)
        $intakeRes1 = $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/intake-output", [
            'entry_type'       => 'intake',
            'category'         => 'iv_fluid',
            'item_name'        => 'Normal Saline 0.9% (500ml)',
            'quantity_ml'      => 500.0,
            'route'            => 'iv',
            'recorded_by_name' => 'Nurse Sunita Verma',
            'remarks'          => 'Infused over 4 hours at 125 ml/hr',
        ]);

        $intakeRes1->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.entry_type', 'intake')
            ->assertJsonPath('data.quantity_ml', 500);

        // 2. Record Intake: Oral Soup (200 ml)
        $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/intake-output", [
            'entry_type'       => 'intake',
            'category'         => 'oral',
            'item_name'        => 'Clear Vegetable Soup',
            'quantity_ml'      => 200.0,
            'route'            => 'oral',
            'recorded_by_name' => 'Nurse Sunita Verma',
        ])->assertStatus(201);

        // 3. Record Output: Foley Catheter Urine (400 ml)
        $outputRes1 = $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/intake-output", [
            'entry_type'       => 'output',
            'category'         => 'urine',
            'item_name'        => 'Foley Catheter Urine',
            'quantity_ml'      => 400.0,
            'route'            => 'foley',
            'recorded_by_name' => 'Nurse Sunita Verma',
            'remarks'          => 'Clear straw colored urine',
        ]);

        $outputRes1->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.entry_type', 'output');

        // 4. Record Output: Surgical Drain (50 ml)
        $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/intake-output", [
            'entry_type'       => 'output',
            'category'         => 'surgical_drain',
            'item_name'        => 'Abdominal Drain',
            'quantity_ml'      => 50.0,
            'route'            => 'drain_left',
            'recorded_by_name' => 'Nurse Sunita Verma',
            'remarks'          => 'Serosanguinous fluid',
        ])->assertStatus(201);

        // 5. Fetch Fluid Balance Summary
        $summaryRes = $this->getJson("/api/v1/ipd/admissions/{$this->admission->id}/intake-output");

        $summaryRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.summary.total_intake_ml', 700)
            ->assertJsonPath('data.summary.total_output_ml', 450)
            ->assertJsonPath('data.summary.net_balance_ml', 250)
            ->assertJsonPath('data.summary.balance_status', 'positive')
            ->assertJsonPath('data.breakdown.intake_by_category.iv_fluid', 500)
            ->assertJsonPath('data.breakdown.intake_by_category.oral', 200)
            ->assertJsonPath('data.breakdown.output_by_category.urine', 400)
            ->assertJsonPath('data.breakdown.output_by_category.surgical_drain', 50);

        $this->assertCount(4, $summaryRes->json('data.entries'));
    }

    public function test_can_record_mar_administration_and_track_status()
    {
        Sanctum::actingAs($this->nurseUser);

        // Create an active prescription for this IPD admission
        $rx = Prescription::create([
            'hospital_id'      => $this->hospital->id,
            'patient_id'        => $this->patient->id,
            'doctor_id'         => $this->doctor->id,
            'ipd_admission_id'  => $this->admission->id,
            'encounter_type'    => 'ipd',
            'chief_complaints'  => ['Fever', 'Dyspnea'],
        ]);

        $item1 = PrescriptionItem::create([
            'prescription_id' => $rx->id,
            'medicine_name'   => 'Inj. Meropenem 1g',
            'dosage'          => '1g',
            'frequency'       => 'TDS',
            'duration_days'   => 5,
            'timing'          => 'after_food',
        ]);

        $item2 = PrescriptionItem::create([
            'prescription_id' => $rx->id,
            'medicine_name'   => 'Tab. Pantoprazole 40mg',
            'dosage'          => '40mg',
            'frequency'       => 'OD',
            'duration_days'   => 5,
            'timing'          => 'before_food',
        ]);

        // 1. Nurse administers Meropenem ("given")
        $adminRes1 = $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/mar", [
            'prescription_item_id' => $item1->id,
            'medicine_name'        => 'Inj. Meropenem 1g',
            'dosage'               => '1g',
            'route'                => 'iv',
            'status'               => 'given',
            'batch_number'         => 'MRP-2026-X88',
            'administered_by_name' => 'Nurse Sunita Verma',
            'notes'                => 'Administered IV infusion over 30 minutes, tolerated well',
        ]);

        $adminRes1->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'given')
            ->assertJsonPath('data.batch_number', 'MRP-2026-X88');

        // 2. Nurse records Pantoprazole as "omitted" (patient NPO for endoscopy)
        $adminRes2 = $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/mar", [
            'prescription_item_id' => $item2->id,
            'medicine_name'        => 'Tab. Pantoprazole 40mg',
            'dosage'               => '40mg',
            'route'                => 'oral',
            'status'               => 'omitted',
            'omission_reason'      => 'Patient strictly NPO after midnight for upper GI endoscopy',
            'administered_by_name' => 'Nurse Sunita Verma',
        ]);

        $adminRes2->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'omitted')
            ->assertJsonPath('data.omission_reason', 'Patient strictly NPO after midnight for upper GI endoscopy');

        // 3. Fetch MAR Drug Chart
        $chartRes = $this->getJson("/api/v1/ipd/admissions/{$this->admission->id}/mar");

        $chartRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.summary.total_administered', 1)
            ->assertJsonPath('data.summary.total_omitted', 1)
            ->assertJsonPath('data.summary.total_refused', 0);

        $this->assertCount(2, $chartRes->json('data.administrations'));
    }

    public function test_can_auto_bill_mar_administration_when_charge_specified()
    {
        Sanctum::actingAs($this->nurseUser);

        // Nurse gives an expensive injection and bills it directly to patient's running ledger
        $res = $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/mar", [
            'medicine_name'        => 'Inj. Human Albumin 20% (100ml)',
            'dosage'               => '100ml',
            'route'                => 'iv',
            'status'               => 'given',
            'batch_number'         => 'ALB-9941',
            'administered_by_name' => 'Nurse Sunita Verma',
            'charge_amount'        => 3800.00,
            'quantity'             => 1,
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'given');

        $adminId = $res->json('data.id');

        // Verify billing ledger item was created
        $ledgerItem = BillingLedgerItem::where('hospital_id', $this->hospital->id)
            ->where('encounter_type', 'ipd')
            ->where('encounter_id', $this->admission->id)
            ->where('category', 'pharmacy')
            ->first();

        $this->assertNotNull($ledgerItem);
        $this->assertEquals(3800.00, (float) $ledgerItem->total_amount);
        $this->assertEquals('unbilled', $ledgerItem->status);
        $this->assertStringContainsString('Inj. Human Albumin 20%', $ledgerItem->item_name);

        $this->assertDatabaseHas('ipd_mar_administrations', [
            'id'                     => $adminId,
            'billing_ledger_item_id' => $ledgerItem->id,
        ]);
    }

    public function test_can_record_and_acknowledge_nursing_shift_handover()
    {
        Sanctum::actingAs($this->nurseUser);

        // 1. Outgoing nurse creates morning-to-evening handover note
        $handoverRes = $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/shift-handover", [
            'shift_name'          => 'morning',
            'shift_date'          => now()->toDateString(),
            'outgoing_nurse_name' => 'Nurse Sunita Verma',
            'patient_condition'   => 'critical',
            'handover_notes'      => 'Patient on 2L O2 support via nasal prongs. Blood pressure maintained on low-dose noradrenaline.',
            'critical_alerts'     => 'Strict NPO after midnight for scheduled CT Abdomen with contrast. Continuous SpO2 monitoring required.',
            'pending_tasks'       => 'Send evening arterial blood gas (ABG) at 6 PM. Check random blood sugar at 4 PM.',
        ]);

        $handoverRes->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.shift_name', 'morning')
            ->assertJsonPath('data.patient_condition', 'critical')
            ->assertJsonPath('data.outgoing_nurse_name', 'Nurse Sunita Verma');

        $handoverId = $handoverRes->json('data.id');

        // 2. Fetch shift handovers list
        $listRes = $this->getJson("/api/v1/ipd/admissions/{$this->admission->id}/shift-handover");
        $listRes->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertCount(1, $listRes->json('data'));

        // 3. Incoming nurse acknowledges handover
        $ackRes = $this->putJson("/api/v1/ipd/shift-handover/{$handoverId}/acknowledge", [
            'incoming_nurse_name' => 'Nurse Priya Nair (Evening Charge Nurse)',
        ]);

        $ackRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.incoming_nurse_name', 'Nurse Priya Nair (Evening Charge Nurse)');

        $this->assertNotNull($ackRes->json('data.acknowledged_at'));
    }

    public function test_inpatient_360_chart_includes_fluid_balance_mar_and_shift_handovers()
    {
        Sanctum::actingAs($this->nurseUser);

        // Add 1 intake, 1 MAR, and 1 handover
        $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/intake-output", [
            'entry_type'       => 'intake',
            'category'         => 'iv_fluid',
            'item_name'        => 'Ringer Lactate (500ml)',
            'quantity_ml'      => 500.0,
            'recorded_by_name' => 'Nurse Sunita',
        ]);

        $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/mar", [
            'medicine_name'        => 'Inj. Paracetamol 1g IV',
            'dosage'               => '1g',
            'status'               => 'given',
            'administered_by_name' => 'Nurse Sunita',
        ]);

        $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/shift-handover", [
            'shift_name'          => 'night',
            'outgoing_nurse_name' => 'Nurse Sunita',
            'patient_condition'   => 'stable',
            'handover_notes'      => 'Night shift handover note',
        ]);

        // Fetch Inpatient 360 Master Chart
        $chartRes = $this->getJson("/api/v1/ipd/admissions/{$this->admission->id}/chart");

        $chartRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'admission',
                    'patient',
                    'doctor_rounds',
                    'nursing_procedures',
                    'vitals_history',
                    'fluid_balance_summary' => [
                        'total_intake_ml',
                        'total_output_ml',
                        'net_balance_ml',
                        'balance_status',
                    ],
                    'intake_outputs',
                    'mar_administrations',
                    'shift_handovers',
                    'prescriptions',
                    'financial_summary',
                ],
            ]);

        $this->assertEquals(500.0, $chartRes->json('data.fluid_balance_summary.total_intake_ml'));
        $this->assertNotEmpty($chartRes->json('data.intake_outputs'));
        $this->assertNotEmpty($chartRes->json('data.mar_administrations'));
        $this->assertNotEmpty($chartRes->json('data.shift_handovers'));
    }
}
