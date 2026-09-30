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
use App\Models\BillingLedgerItem;
use App\Models\Vital;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use Database\Seeders\ChargeMasterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class IpdCareAndBedMatrixApiTest extends TestCase
{
    use RefreshDatabase;

    protected Hospital $hospital;
    protected User $user;
    protected Department $department;
    protected Doctor $doctor;
    protected Ward $icuWard;
    protected Ward $generalWard;
    protected Bed $icuBed1;
    protected Bed $icuBed2;
    protected Bed $genBed1;
    protected Patient $patient;
    protected IpdAdmission $admission;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hospital = Hospital::firstOrCreate(
            ['abdm_hip_id' => 'HIP-TEST-IPD-CARE'],
            ['name' => 'CareMax Super Speciality Hospital', 'code' => 'CMSH']
        );

        ChargeMasterSeeder::seedHospitalCharges($this->hospital->id);

        $this->user = User::firstOrCreate(
            ['email' => 'doctor@caremax.com'],
            ['name' => 'Dr. Ananya Roy', 'password' => bcrypt('password'), 'hospital_id' => $this->hospital->id]
        );

        $this->department = Department::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'General Surgery'],
            ['code' => 'SURG', 'status' => 'active']
        );

        $this->doctor = Doctor::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Dr. Ananya Roy'],
            [
                'department_id'  => $this->department->id,
                'user_id'        => $this->user->id,
                'specialization' => 'General & Laparoscopic Surgeon',
                'is_active'      => true,
            ]
        );

        // Create Wards and Beds
        $this->icuWard = Ward::create([
            'hospital_id'  => $this->hospital->id,
            'name'         => 'Surgical ICU',
            'ward_type'    => 'icu',
            'daily_charge' => 6500.00,
        ]);

        $this->icuBed1 = Bed::create([
            'hospital_id'  => $this->hospital->id,
            'ward_id'      => $this->icuWard->id,
            'bed_number'   => 'SICU-01',
            'status'       => 'available',
            'daily_charge' => 6500.00,
        ]);

        $this->icuBed2 = Bed::create([
            'hospital_id'  => $this->hospital->id,
            'ward_id'      => $this->icuWard->id,
            'bed_number'   => 'SICU-02',
            'status'       => 'available',
            'daily_charge' => 6500.00,
        ]);

        $this->generalWard = Ward::create([
            'hospital_id'  => $this->hospital->id,
            'name'         => 'Male Surgical Ward',
            'ward_type'    => 'general',
            'daily_charge' => 800.00,
        ]);

        $this->genBed1 = Bed::create([
            'hospital_id'  => $this->hospital->id,
            'ward_id'      => $this->generalWard->id,
            'bed_number'   => 'GEN-01',
            'status'       => 'available',
            'daily_charge' => 800.00,
        ]);

        // Patient and Admission
        $this->patient = Patient::create([
            'hospital_id' => $this->hospital->id,
            'name'        => 'Devendra Pratap',
            'gender'      => 'M',
            'dob'         => '1984-07-22',
            'mobile'      => '9876541230',
            'city'        => 'Lucknow',
        ]);

        $this->admission = IpdAdmission::create([
            'hospital_id'      => $this->hospital->id,
            'patient_id'       => $this->patient->id,
            'doctor_id'        => $this->doctor->id,
            'department_id'    => $this->department->id,
            'ward_id'          => $this->icuWard->id,
            'bed_id'           => $this->icuBed1->id,
            'admission_type'   => 'planned',
            'admission_reason' => 'Post-op Laparoscopic Cholecystectomy',
            'status'           => 'admitted',
            'admission_date'   => now()->subDays(2),
            'advance_deposit'  => 5000.00,
            'attendant_name'   => 'Sunita Pratap',
            'attendant_phone'  => '9876541239',
        ]);

        $this->icuBed1->update([
            'status'               => 'occupied',
            'current_admission_id' => $this->admission->id,
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_can_fetch_live_visual_bed_matrix_with_occupancy_percentage_and_patient_details()
    {
        // Add a ledger item so running bill is verified
        BillingLedgerItem::create([
            'hospital_id'        => $this->hospital->id,
            'patient_id'         => $this->patient->id,
            'encounter_type'     => 'ipd',
            'encounter_id'       => $this->admission->id,
            'category'           => 'bed_charges',
            'item_name'          => 'ICU Bed Rent',
            'unit_price'         => 6500.00,
            'quantity'           => 2.0,
            'tax_amount'         => 0.00,
            'total_amount'       => 13000.00,
            'charged_at'         => now()->subDay(),
            'charged_by_user_id' => 0,
            'status'             => 'unbilled',
        ]);

        $response = $this->getJson('/api/v1/ipd/bed-matrix');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.overview.total_beds', 3)
            ->assertJsonPath('data.overview.occupied_beds', 1)
            ->assertJsonPath('data.overview.available_beds', 2)
            ->assertJsonPath('data.overview.occupancy_percentage', 33.3);

        $wards = $response->json('data.wards');
        $this->assertCount(2, $wards);

        // Find ICU ward
        $icuMatrix = collect($wards)->firstWhere('name', 'Surgical ICU');
        $this->assertEquals(2, $icuMatrix['total_beds']);
        $this->assertEquals(1, $icuMatrix['occupied_beds']);
        $this->assertEquals(1, $icuMatrix['available_beds']);

        // Check occupied bed details
        $occupiedBed = collect($icuMatrix['beds'])->firstWhere('bed_number', 'SICU-01');
        $this->assertEquals('occupied', $occupiedBed['status']);
        $this->assertEquals('Devendra Pratap', $occupiedBed['admission']['patient']['name']);
        $this->assertEquals('Dr. Ananya Roy', $occupiedBed['admission']['doctor']['name']);
        $this->assertEquals(13000, $occupiedBed['admission']['running_bill']);
    }

    public function test_can_record_doctor_inpatient_daily_round_soap_note_and_auto_trigger_tariff()
    {
        $response = $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/rounds", [
            'doctor_id'            => $this->doctor->id,
            'round_type'           => 'routine',
            'subjective'           => 'Patient reports mild pain, slept well, no vomiting',
            'objective'            => 'Abdomen soft, non-tender. Bowel sounds positive. Drain 50ml serous.',
            'assessment'           => 'Post-op Day 2 recovering well',
            'plan'                 => 'Remove abdominal drain tomorrow, initiate soft diet',
            'diet_advice'          => 'soft',
            'clinical_condition'   => 'improving',
            'is_discharge_planned' => true,
            'planned_discharge_date'=> now()->addDays(2)->toDateString(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.clinical_condition', 'improving')
            ->assertJsonPath('data.subjective', 'Patient reports mild pain, slept well, no vomiting')
            ->assertJsonPath('data.is_discharge_planned', true);

        $roundId = $response->json('data.id');
        $ledgerItemId = $response->json('data.billing_ledger_item_id');

        $this->assertNotEmpty($ledgerItemId);

        // Verify ledger item was created for doctor round
        $this->assertDatabaseHas('billing_ledger_items', [
            'id'             => $ledgerItemId,
            'encounter_type' => 'ipd',
            'encounter_id'   => $this->admission->id,
            'category'       => 'doctor_fees',
            'status'         => 'unbilled',
        ]);

        // Verify history endpoint
        $historyResponse = $this->getJson("/api/v1/ipd/admissions/{$this->admission->id}/rounds");
        $historyResponse->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertCount(1, $historyResponse->json('data'));
    }

    public function test_can_record_bedside_nursing_procedure_and_auto_post_charge()
    {
        $response = $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/procedures", [
            'procedure_name'    => 'Wound Dressing (Minor)',
            'procedure_code'    => 'NURS-DRESS-MIN',
            'performed_by_name' => 'Staff Nurse Sunita',
            'notes'             => 'Laparoscopy port dressings changed under aseptic conditions',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.procedure_name', 'Wound Dressing (Minor)')
            ->assertJsonPath('data.charge_amount', 200);

        $procedureId = $response->json('data.id');
        $ledgerItemId = $response->json('data.billing_ledger_item_id');

        $this->assertNotEmpty($ledgerItemId);

        // Verify ledger item was auto-created for nursing charge
        $this->assertDatabaseHas('billing_ledger_items', [
            'id'             => $ledgerItemId,
            'encounter_type' => 'ipd',
            'encounter_id'   => $this->admission->id,
            'category'       => 'nursing_charges',
            'total_amount'   => 200.00,
        ]);

        // Verify procedure log endpoint
        $procLogResponse = $this->getJson("/api/v1/ipd/admissions/{$this->admission->id}/procedures");
        $procLogResponse->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertCount(1, $procLogResponse->json('data'));
    }

    public function test_can_fetch_inpatient_360_comprehensive_chart()
    {
        // 1. Add doctor round
        $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/rounds", [
            'subjective' => 'Patient comfortable',
            'objective'  => 'Vitals stable',
            'assessment' => 'Improving',
            'plan'       => 'Continue current meds',
        ]);

        // 2. Add nursing procedure
        $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/procedures", [
            'procedure_name' => 'Nebulization',
            'procedure_code' => 'NURS-NEBUL',
            'charge_amount'  => 100.00,
        ]);

        // 3. Add Vital
        Vital::create([
            'hospital_id'        => $this->hospital->id,
            'patient_id'         => $this->patient->id,
            'encounter_type'     => 'ipd',
            'ipd_admission_id'   => $this->admission->id,
            'recorded_by'        => $this->user->id,
            'blood_pressure_sys' => 120,
            'blood_pressure_dia' => 80,
            'pulse_rate'         => 76,
            'oxygen_saturation'  => 99,
            'temperature'        => 98.6,
            'recorded_at'        => now(),
        ]);

        // 4. Fetch 360 chart
        $response = $this->getJson("/api/v1/ipd/admissions/{$this->admission->id}/chart");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.admission.ipd_number', $this->admission->ipd_number)
            ->assertJsonPath('data.admission.status', 'admitted')
            ->assertJsonPath('data.patient.name', 'Devendra Pratap')
            ->assertJsonStructure([
                'data' => [
                    'admission',
                    'patient',
                    'doctor_rounds',
                    'nursing_procedures',
                    'vitals_history',
                    'prescriptions',
                    'financial_summary' => [
                        'total_charged',
                        'advance_deposit',
                        'net_balance_due',
                        'category_breakdown',
                        'ledger_items',
                    ],
                ]
            ]);

        $this->assertCount(1, $response->json('data.doctor_rounds'));
        $this->assertCount(1, $response->json('data.nursing_procedures'));
        $this->assertCount(1, $response->json('data.vitals_history'));
        $this->assertEquals(5000, $response->json('data.financial_summary.advance_deposit'));
    }
}
