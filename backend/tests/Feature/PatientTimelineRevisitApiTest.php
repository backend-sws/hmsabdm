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
use App\Models\OpdVisit;
use App\Models\IpdAdmission;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionDiagnosis;
use App\Models\Vital;
use App\Models\BillingLedgerItem;
use App\Models\HospitalSetting;
use Database\Seeders\ChargeMasterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class PatientTimelineRevisitApiTest extends TestCase
{
    use RefreshDatabase;

    protected Hospital $hospital;
    protected User $user;
    protected Department $department;
    protected Doctor $doctor;
    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hospital = Hospital::firstOrCreate(
            ['abdm_hip_id' => 'HIP-TEST-TIMELINE'],
            ['name' => 'Apex Superspeciality Hospital', 'code' => 'ASH']
        );

        ChargeMasterSeeder::seedHospitalCharges($this->hospital->id);

        $this->user = User::firstOrCreate(
            ['email' => 'doctor@apexhospital.com'],
            ['name' => 'Dr. Sharma', 'password' => bcrypt('password'), 'hospital_id' => $this->hospital->id]
        );

        $this->department = Department::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Cardiology'],
            ['code' => 'CARD', 'status' => 'active']
        );

        $this->doctor = Doctor::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Dr. Rajesh Sharma'],
            [
                'department_id'  => $this->department->id,
                'user_id'        => $this->user->id,
                'specialization' => 'Cardiologist',
                'is_active'      => true,
            ]
        );

        $this->patient = Patient::create([
            'hospital_id' => $this->hospital->id,
            'name'        => 'Vikram Malhotra',
            'mobile'      => '9876501234',
            'gender'      => 'M',
            'dob'         => '1980-04-12',
            'blood_group' => 'B+',
            'city'        => 'New Delhi',
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_can_fetch_patient_history_for_new_patient_with_empty_timeline()
    {
        $response = $this->getJson("/api/v1/patients/{$this->patient->id}/history");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.patient.id', $this->patient->id)
            ->assertJsonPath('data.patient.name', 'Vikram Malhotra')
            ->assertJsonPath('data.summary.total_opd_visits', 0)
            ->assertJsonPath('data.summary.total_ipd_admissions', 0)
            ->assertJsonPath('data.summary.total_prescriptions', 0)
            ->assertJsonPath('data.summary.total_vitals_logged', 0)
            ->assertJsonPath('data.summary.is_currently_admitted', false)
            ->assertJsonPath('data.timeline', []);
    }

    public function test_can_fetch_patient_360_history_with_all_events_in_descending_chronological_order()
    {
        // 1. Create OPD Visit (3 days ago)
        $visit = OpdVisit::create([
            'hospital_id'     => $this->hospital->id,
            'patient_id'      => $this->patient->id,
            'doctor_id'       => $this->doctor->id,
            'department_id'   => $this->department->id,
            'visit_date'      => now()->subDays(3)->toDateString(),
            'queue_token'     => 1,
            'status'          => 'done',
            'chief_complaint' => 'Chest heaviness and palpitation',
            'diagnosis'       => 'I20.9 - Angina Pectoris',
            'fee_charged'     => 500.00,
            'amount_paid'     => 500.00,
            'payment_status'  => 'paid',
        ]);

        // 2. Create Vital Record (2 days ago)
        $vital = Vital::create([
            'hospital_id'  => $this->hospital->id,
            'patient_id'   => $this->patient->id,
            'opd_visit_id' => $visit->id,
            'recorded_by'  => $this->user->id,
            'bp_systolic'  => 130,
            'bp_diastolic' => 85,
            'pulse'        => 78,
            'spo2'         => 98,
            'temperature'  => 98.4,
            'recorded_at'  => now()->subDays(2),
        ]);

        // 3. Create Prescription (2 days ago)
        $prescription = Prescription::create([
            'hospital_id'     => $this->hospital->id,
            'patient_id'      => $this->patient->id,
            'doctor_id'       => $this->doctor->id,
            'opd_visit_id'    => $visit->id,
            'advice'          => 'Low salt diet and avoid heavy lifting',
            'follow_up_date'  => now()->addDays(5)->toDateString(),
        ]);

        PrescriptionItem::create([
            'prescription_id' => $prescription->id,
            'medicine_name'   => 'Aspirin 75mg',
            'dosage'          => '75mg',
            'frequency'       => '1-0-0',
            'duration_days'   => 15,
            'timing'          => 'after_food',
        ]);

        PrescriptionDiagnosis::create([
            'prescription_id' => $prescription->id,
            'icd_code'        => 'I20.9',
            'diagnosis_name'  => 'Angina Pectoris, unspecified',
            'diagnosis_type'  => 'primary',
        ]);

        // 4. Create IPD Admission (1 day ago - active)
        $ward = Ward::create([
            'hospital_id' => $this->hospital->id,
            'name'        => 'Cardiac ICU',
            'ward_type'   => 'icu',
        ]);

        $bed = Bed::create([
            'hospital_id' => $this->hospital->id,
            'ward_id'     => $ward->id,
            'bed_number'  => 'CICU-01',
            'status'      => 'occupied',
        ]);

        $admission = IpdAdmission::create([
            'hospital_id'      => $this->hospital->id,
            'patient_id'       => $this->patient->id,
            'doctor_id'        => $this->doctor->id,
            'department_id'    => $this->department->id,
            'ward_id'          => $ward->id,
            'bed_id'           => $bed->id,
            'admission_type'   => 'emergency',
            'admission_reason' => 'Acute Coronary Syndrome evaluation',
            'admission_date'   => now()->subDays(1),
            'status'           => 'admitted',
            'advance_deposit'  => 10000.00,
        ]);

        // 5. Add Billing Ledger item
        BillingLedgerItem::create([
            'hospital_id'         => $this->hospital->id,
            'patient_id'          => $this->patient->id,
            'encounter_type'      => 'ipd',
            'encounter_id'        => $admission->id,
            'category'            => 'bed_charges',
            'item_name'           => 'ICU Bed Daily Rent',
            'unit_price'          => 6500.00,
            'quantity'            => 1.0,
            'tax_amount'          => 0.00,
            'total_amount'        => 6500.00,
            'charged_at'          => now()->subDays(1),
            'charged_by_user_id'  => 0,
            'status'              => 'unbilled',
        ]);

        $response = $this->getJson("/api/v1/patients/{$this->patient->id}/history");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.summary.total_opd_visits', 1)
            ->assertJsonPath('data.summary.total_ipd_admissions', 1)
            ->assertJsonPath('data.summary.total_prescriptions', 1)
            ->assertJsonPath('data.summary.total_vitals_logged', 1)
            ->assertJsonPath('data.summary.is_currently_admitted', true)
            ->assertJsonPath('data.summary.current_admission.ward', 'Cardiac ICU')
            ->assertJsonPath('data.summary.current_admission.bed', 'CICU-01')
            ->assertJsonPath('data.summary.billing.unbilled_amount', 6500);

        $timeline = $response->json('data.timeline');
        $this->assertCount(4, $timeline);

        $eventTypes = array_column($timeline, 'event_type');
        $this->assertContains('ipd_admission', $eventTypes);
        $this->assertContains('vital', $eventTypes);
        $this->assertContains('opd_visit', $eventTypes);
        $this->assertContains('prescription', $eventTypes);

        // Verify timestamps are descending
        for ($i = 0; $i < count($timeline) - 1; $i++) {
            $this->assertGreaterThanOrEqual(
                $timeline[$i + 1]['timestamp'],
                $timeline[$i]['timestamp'],
                "Timeline event at index {$i} is older than index " . ($i + 1)
            );
        }
    }

    public function test_can_generate_quick_revisit_token_by_uhid_without_re_entering_demographics()
    {
        $response = $this->postJson('/api/v1/reception/quick-visit', [
            'uhid'            => $this->patient->uhid,
            'doctor_id'       => $this->doctor->id,
            'chief_complaint' => 'Routine follow-up',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.requires_selection', false)
            ->assertJsonPath('data.visit.patient_id', $this->patient->id)
            ->assertJsonPath('data.visit.doctor_id', $this->doctor->id)
            ->assertJsonPath('data.visit.department_id', $this->department->id)
            ->assertJsonPath('data.visit.queue_token', 1)
            ->assertJsonPath('data.revisit_info.is_revisit', true);

        $this->assertDatabaseHas('opd_visits', [
            'patient_id' => $this->patient->id,
            'doctor_id'  => $this->doctor->id,
            'hospital_id'=> $this->hospital->id,
        ]);
    }

    public function test_quick_revisit_applies_free_followup_policy_within_validity_window()
    {
        // Patient had visit with Dr. Rajesh Sharma 2 days ago
        $priorVisit = OpdVisit::create([
            'hospital_id'     => $this->hospital->id,
            'patient_id'      => $this->patient->id,
            'doctor_id'       => $this->doctor->id,
            'department_id'   => $this->department->id,
            'visit_date'      => now()->subDays(2)->toDateString(),
            'queue_token'     => 5,
            'status'          => 'done',
            'fee_charged'     => 500.00,
            'amount_paid'     => 500.00,
            'payment_status'  => 'paid',
        ]);

        // Reception generates quick re-visit today
        $response = $this->postJson('/api/v1/reception/quick-visit', [
            'patient_id' => $this->patient->id,
            'doctor_id'  => $this->doctor->id,
        ]);
        if ($response->status() !== 200) dump($response->json());

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.revisit_info.is_free_revisit', true)
            ->assertJsonPath('data.revisit_info.days_since_last_visit', 2)
            ->assertJsonPath('data.revisit_info.previous_visit_id', $priorVisit->id)
            ->assertJsonPath('data.visit.fee_charged', 0)
            ->assertJsonPath('data.visit.amount_paid', 0)
            ->assertJsonPath('data.visit.payment_status', 'waived');
    }

    public function test_quick_revisit_charges_standard_fee_when_outside_validity_window()
    {
        // Patient had visit with Dr. Rajesh Sharma 20 days ago (outside 7 days validity)
        OpdVisit::create([
            'hospital_id'     => $this->hospital->id,
            'patient_id'      => $this->patient->id,
            'doctor_id'       => $this->doctor->id,
            'department_id'   => $this->department->id,
            'visit_date'      => now()->subDays(20)->toDateString(),
            'queue_token'     => 3,
            'status'          => 'done',
            'fee_charged'     => 500.00,
            'amount_paid'     => 500.00,
            'payment_status'  => 'paid',
        ]);

        $response = $this->postJson('/api/v1/reception/quick-visit', [
            'patient_id' => $this->patient->id,
            'doctor_id'  => $this->doctor->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.revisit_info.is_free_revisit', false)
            ->assertJsonPath('data.visit.fee_charged', 500);
    }

    public function test_quick_revisit_supports_split_payment_with_breakdown()
    {
        $response = $this->postJson('/api/v1/reception/quick-visit', [
            'patient_id'        => $this->patient->id,
            'doctor_id'         => $this->doctor->id,
            'fee_charged'       => 500,
            'payment_method'    => 'split',
            'payment_ref'       => 'UTR123456',
            'payment_breakdown' => [
                ['method' => 'cash', 'amount' => 250],
                ['method' => 'upi', 'amount' => 250, 'ref' => 'UTR123456'],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.visit.payment_method', 'split')
            ->assertJsonPath('data.visit.amount_paid', 500)
            ->assertJsonPath('data.visit.payment_status', 'paid');
    }
}

