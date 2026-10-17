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
use App\Models\EmergencyTriage;
use App\Models\IpdAdmission;
use App\Models\Vital;
use App\Models\BillingLedgerItem;
use Database\Seeders\ChargeMasterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class EmergencyTriageApiTest extends TestCase
{
    use RefreshDatabase;

    protected Hospital $hospital;
    protected User $user;
    protected Department $department;
    protected Doctor $doctor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hospital = Hospital::firstOrCreate(
            ['abdm_hip_id' => 'HIP-TEST-EMERGENCY'],
            ['name' => 'Metro Trauma & Emergency Hospital', 'code' => 'MTEH']
        );

        ChargeMasterSeeder::seedHospitalCharges($this->hospital->id);

        $this->user = User::firstOrCreate(
            ['email' => 'cmo@metrohospital.com'],
            ['name' => 'Dr. Casualty Officer', 'password' => bcrypt('password'), 'hospital_id' => $this->hospital->id]
        );

        $this->department = Department::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Emergency & Trauma'],
            ['code' => 'ER', 'status' => 'active']
        );

        $this->doctor = Doctor::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Dr. Sanjay Verma'],
            [
                'department_id'  => $this->department->id,
                'user_id'        => $this->user->id,
                'specialization' => 'Emergency Medicine',
                'hpr_id'         => 'HPR-DOC-ER-991',
                'is_active'      => true,
            ]
        );

        Sanctum::actingAs($this->user);
    }

    public function test_can_fast_track_admit_unknown_emergency_patient()
    {
        $response = $this->postJson('/api/v1/emergency/triage', [
            'is_unknown_patient'  => true,
            'gender'              => 'M',
            'approximate_age'     => 30,
            'priority_level'      => 'red',
            'triage_category'     => 'Trauma',
            'chief_complaint'     => 'Unconscious road accident victim with severe head trauma',
            'consciousness_level' => 'unresponsive',
            'gcs_score'           => 6,
            'brought_by'          => 'Ambulance',
            'brought_by_contact'  => '108',
            'doctor_id'           => $this->doctor->id,
            'initial_vitals'      => [
                'bp_systolic'      => 85,
                'bp_diastolic'     => 55,
                'pulse'            => 130,
                'spo2'             => 88,
                'temperature'      => 97.8,
                'respiratory_rate' => 28,
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.priority_level', 'red')
            ->assertJsonPath('data.consciousness_level', 'unresponsive')
            ->assertJsonPath('data.gcs_score', 6);

        $triageData = $response->json('data');
        $this->assertNotEmpty($triageData['triage_number']);
        $this->assertStringStartsWith('EMG-', $triageData['triage_number']);

        // Verify Temporary Patient record
        $this->assertNotEmpty($triageData['patient']);
        $this->assertStringStartsWith('EMG-', $triageData['patient']['uhid']);
        $this->assertStringContainsString('Unknown Male', $triageData['patient']['name']);

        // Verify Initial Vitals recorded
        $this->assertDatabaseHas('vitals', [
            'patient_id'        => $triageData['patient_id'],
            'encounter_type'    => 'emergency',
            'pulse_rate'        => 130,
            'oxygen_saturation' => 88,
        ]);


        // Verify Emergency Tariff auto-posted to ledger
        $this->assertDatabaseHas('billing_ledger_items', [
            'patient_id'     => $triageData['patient_id'],
            'encounter_type' => 'emergency',
            'encounter_id'   => $triageData['id'],
        ]);
    }

    public function test_can_admit_emergency_patient_with_instant_bed_allocation()
    {
        $ward = Ward::create([
            'hospital_id' => $this->hospital->id,
            'name'        => 'Red Triage Resuscitation Bay',
            'ward_type'   => 'icu',
        ]);

        $bed = Bed::create([
            'hospital_id' => $this->hospital->id,
            'ward_id'     => $ward->id,
            'bed_number'  => 'RED-BAY-01',
            'status'      => 'available',
        ]);

        $response = $this->postJson('/api/v1/emergency/triage', [
            'patient_name'        => 'Anil Kapoor',
            'gender'              => 'M',
            'approximate_age'     => 45,
            'priority_level'      => 'red',
            'triage_category'     => 'Cardiac',
            'chief_complaint'     => 'Acute STEMI myocardial infarction',
            'consciousness_level' => 'alert',
            'ward_id'             => $ward->id,
            'bed_id'              => $bed->id,
            'doctor_id'           => $this->doctor->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.bed.bed_number', 'RED-BAY-01');

        $triageId = $response->json('data.id');
        $ipdAdmissionId = $response->json('data.ipd_admission_id');

        $this->assertNotEmpty($ipdAdmissionId);

        // Bed status should be occupied
        $bed->refresh();
        $this->assertEquals('occupied', $bed->status);
        $this->assertEquals($ipdAdmissionId, $bed->current_admission_id);

        // IPD admission created as emergency
        $this->assertDatabaseHas('ipd_admissions', [
            'id'             => $ipdAdmissionId,
            'admission_type' => 'emergency',
            'bed_id'         => $bed->id,
            'status'         => 'admitted',
        ]);
    }

    public function test_can_register_mlc_case_and_generate_police_intimation_memo()
    {
        $response = $this->postJson('/api/v1/emergency/triage', [
            'patient_name'         => 'Kailash Joshi',
            'gender'               => 'M',
            'approximate_age'      => 28,
            'priority_level'       => 'yellow',
            'triage_category'      => 'Trauma',
            'chief_complaint'      => 'Physical assault with blunt weapon injuries',
            'is_mlc'               => true,
            'police_station'       => 'Civil Lines Police Station',
            'police_officer_name'  => 'Head Constable Virender',
            'police_buckle_number' => 'HC-889',
            'incident_place'       => 'Sector 14 Market',
            'mlc_injuries_details' => 'Contusion over left zygomatic arch and forearm defense wounds',
            'doctor_id'            => $this->doctor->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_mlc', true);

        $triageId = $response->json('data.id');
        $mlcNumber = $response->json('data.mlc_number');

        $this->assertNotEmpty($mlcNumber);
        $this->assertStringStartsWith('MLC-', $mlcNumber);

        // Generate Police Intimation Memo (MLC Slip)
        $slipResponse = $this->getJson("/api/v1/emergency/triages/{$triageId}/mlc-slip");

        $slipResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.mlc_details.mlc_number', $mlcNumber)
            ->assertJsonPath('data.mlc_details.police_station', 'Civil Lines Police Station')
            ->assertJsonPath('data.mlc_details.police_officer_name', 'Head Constable Virender')
            ->assertJsonPath('data.patient.name', 'Kailash Joshi')
            ->assertJsonPath('data.clinical_assessment.examining_doctor', 'Dr. Sanjay Verma')
            ->assertJsonStructure([
                'data' => [
                    'hospital',
                    'mlc_details',
                    'patient',
                    'clinical_assessment',
                    'declaration',
                    'generated_at',
                ]
            ]);
    }

    public function test_can_link_post_stabilization_identity_to_registered_patient()
    {
        // 1. Initial unknown patient admitted
        $triageResponse = $this->postJson('/api/v1/emergency/triage', [
            'is_unknown_patient'  => true,
            'gender'              => 'F',
            'approximate_age'     => 25,
            'priority_level'      => 'yellow',
            'chief_complaint'     => 'Fainting and dehydration',
            'doctor_id'           => $this->doctor->id,
        ]);

        $triageId = $triageResponse->json('data.id');
        $tempPatientId = $triageResponse->json('data.patient_id');

        // 2. Family arrives with official patient details
        $verifiedPatient = Patient::create([
            'hospital_id'  => $this->hospital->id,
            'name'         => 'Pooja Sharma',
            'mobile'       => '9811223344',
            'gender'       => 'F',
            'dob'          => '1999-08-20',
            'blood_group'  => 'O+',
            'abha_address' => 'pooja@abdm',
        ]);

        // 3. Link emergency case to the verified patient
        $linkResponse = $this->putJson("/api/v1/emergency/triages/{$triageId}/link-patient", [
            'target_patient_id' => $verifiedPatient->id,
        ]);

        $linkResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.patient_id', $verifiedPatient->id)
            ->assertJsonPath('data.patient_name', 'Pooja Sharma')
            ->assertJsonPath('data.is_unknown_patient', false);

        // Verify triage in DB updated
        $this->assertDatabaseHas('emergency_triages', [
            'id'                 => $triageId,
            'patient_id'         => $verifiedPatient->id,
            'is_unknown_patient' => false,
        ]);
    }

    public function test_can_fetch_triage_desk_with_priority_counters()
    {
        // Create 1 red, 1 yellow, 1 green
        $this->postJson('/api/v1/emergency/triage', [
            'patient_name'   => 'Patient Red',
            'priority_level' => 'red',
        ]);

        $this->postJson('/api/v1/emergency/triage', [
            'patient_name'   => 'Patient Yellow',
            'priority_level' => 'yellow',
            'is_mlc'         => true,
        ]);

        $this->postJson('/api/v1/emergency/triage', [
            'patient_name'   => 'Patient Green',
            'priority_level' => 'green',
        ]);

        $response = $this->getJson('/api/v1/emergency/triages');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.counters.red_priority', 1)
            ->assertJsonPath('data.counters.yellow_priority', 1)
            ->assertJsonPath('data.counters.green_priority', 1)
            ->assertJsonPath('data.counters.mlc_cases', 1)
            ->assertJsonPath('data.counters.active_in_er', 3);
    }

    public function test_can_generate_emergency_discharge_and_transfer_slip()
    {
        $createRes = $this->postJson('/api/v1/emergency/triage', [
            'patient_name'    => 'Ramesh Verma',
            'gender'          => 'M',
            'approximate_age' => 42,
            'priority_level'  => 'yellow',
            'chief_complaint' => 'Acute chest pain radiating to left arm',
            'doctor_id'       => $this->doctor->id,
        ]);
        $triageId = $createRes->json('data.id');

        // Update status to stabilized
        $this->putJson("/api/v1/emergency/triages/{$triageId}/status", [
            'status' => 'stabilized',
            'notes'  => 'ECG shows sinus rhythm, pain relieved with Sorbitrate sublingual.',
        ]);

        $slipRes = $this->getJson("/api/v1/emergency/triages/{$triageId}/discharge-slip");

        $slipRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.patient.name', 'Ramesh Verma')
            ->assertJsonPath('data.triage.status', 'stabilized')
            ->assertJsonPath('data.doctor.name', 'Dr. Sanjay Verma');
    }

    public function test_can_record_and_fetch_continuous_bedside_vitals()
    {
        $createRes = $this->postJson('/api/v1/emergency/triage', [
            'patient_name'   => 'Suresh Patel',
            'priority_level' => 'red',
        ]);
        $triageId = $createRes->json('data.id');

        // Log repeat vitals after 15 minutes
        $vitalRes = $this->postJson("/api/v1/emergency/triages/{$triageId}/vitals", [
            'bp_systolic'         => 110,
            'bp_diastolic'        => 75,
            'pulse'               => 88,
            'spo2'                => 97,
            'temperature'         => 98.4,
            'respiratory_rate'    => 18,
            'gcs_score'           => 14,
            'consciousness_level' => 'alert',
            'pain_score'          => 4,
            'notes'               => 'Patient responding well to oxygen mask',
        ]);

        $vitalRes->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.blood_pressure_sys', 110)
            ->assertJsonPath('data.pulse_rate', 88);

        // Fetch vitals history
        $historyRes = $this->getJson("/api/v1/emergency/triages/{$triageId}/vitals");
        $historyRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.history');
    }

    public function test_can_add_clinical_notes_and_provisional_diagnosis()
    {
        $createRes = $this->postJson('/api/v1/emergency/triage', [
            'patient_name'   => 'Anita Devi',
            'priority_level' => 'yellow',
        ]);
        $triageId = $createRes->json('data.id');

        $notesRes = $this->postJson("/api/v1/emergency/triages/{$triageId}/clinical-notes", [
            'provisional_diagnosis' => 'Acute Appendicitis with Localized Peritonitis',
            'treatment_given'       => 'Inj. Ceftriaxone 1g IV STAT, Inj. Pantocid 40mg IV',
            'doctor_notes'          => 'USG Abdomen requested urgently. Keep NPO for possible emergency surgery.',
        ]);

        $notesRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertStringContainsString('Acute Appendicitis', $notesRes->json('data.clinical_notes'));
    }

    public function test_can_collect_advance_deposit_and_generate_receipt()
    {
        $createRes = $this->postJson('/api/v1/emergency/triage', [
            'patient_name'   => 'Deepak Sharma',
            'priority_level' => 'red',
        ]);
        $triageId = $createRes->json('data.id');

        $depRes = $this->postJson("/api/v1/emergency/triages/{$triageId}/deposit", [
            'amount'          => 5000,
            'payment_method'  => 'upi',
            'transaction_ref' => 'UPI/2026/889900',
        ]);

        $depRes->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.amount', 5000)
            ->assertJsonPath('data.payment_method', 'upi');

        $this->assertNotEmpty($depRes->json('data.receipt_number'));

        $this->assertDatabaseHas('billing_ledger_items', [
            'encounter_type' => 'emergency',
            'category'       => 'payment_deposit',
            'unit_price'     => -5000,
        ]);
    }
}
