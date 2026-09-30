<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Hospital;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Department;
use App\Models\OpdVisit;
use App\Models\MedicineMaster;
use App\Models\Icd10Code;
use App\Models\Prescription;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class PrescriptionApiTest extends TestCase
{
    use RefreshDatabase;

    protected Hospital $hospital;
    protected User $user;
    protected Doctor $doctor;
    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hospital = Hospital::firstOrCreate(
            ['abdm_hip_id' => 'HIP-TEST-RX'],
            ['name' => 'Metro Multi-Specialty Hospital', 'code' => 'MMSH']
        );

        $this->user = User::firstOrCreate(
            ['email' => 'doctor@metro.com'],
            ['name' => 'Dr. Sharma', 'password' => bcrypt('password'), 'hospital_id' => $this->hospital->id]
        );

        $department = Department::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'General Medicine'],
            ['code' => 'GEN-MED', 'is_active' => true]
        );

        $this->doctor = Doctor::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Dr. Sharma'],
            [
                'user_id'       => $this->user->id,
                'department_id' => $department->id,
                'qualification' => 'MBBS, MD',
                'is_active'     => true,
            ]
        );

        $this->patient = Patient::firstOrCreate(
            ['mobile' => '9876500112', 'hospital_id' => $this->hospital->id],
            ['name' => 'Anil Verma', 'gender' => 'M', 'dob' => '1992-04-10']
        );

        // Seed sample medicine and ICD-10 for SQLite test environment
        MedicineMaster::firstOrCreate(
            ['brand_name' => 'Augmentin 625 Duo Tablet'],
            [
                'generic_name'     => 'Amoxycillin + Clavulanic Acid',
                'salt_composition' => 'Amoxycillin (500mg) + Clavulanic Acid (125mg)',
                'dosage_form'      => 'Tablet',
                'manufacturer'     => 'GSK Pharmaceuticals',
                'mrp'              => 223.42,
                'is_generic'       => false,
                'is_active'        => true,
            ]
        );

        Icd10Code::firstOrCreate(
            ['code' => 'A00.0'],
            [
                'code_with_separator' => 'A00.0',
                'short_description'   => 'Cholera due to Vibrio cholerae 01, biovar cholerae',
                'is_billable'         => true,
            ]
        );

        Sanctum::actingAs($this->user);
    }

    public function test_can_search_medicines_by_brand_or_generic_or_salt(): void
    {
        $response = $this->getJson('/api/v1/medicines/search?q=Augmentin');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'brand_name',
                        'generic_name',
                        'salt_composition',
                        'dosage_form',
                        'mrp',
                    ]
                ]
            ]);

        $this->assertNotEmpty($response->json('data'));
        $this->assertEquals('Augmentin 625 Duo Tablet', $response->json('data.0.brand_name'));
    }

    public function test_can_search_icd10_diagnosis_by_code_or_name(): void
    {
        $response = $this->getJson('/api/v1/diagnosis/search?q=Cholera');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'code',
                        'short_description',
                    ]
                ]
            ]);

        $this->assertNotEmpty($response->json('data'));
        $this->assertEquals('A00.0', $response->json('data.0.code'));
    }

    public function test_can_create_structured_prescription_with_medicines_and_diagnoses(): void
    {
        $medicine = MedicineMaster::where('brand_name', 'Augmentin 625 Duo Tablet')->first();
        $icd = Icd10Code::where('code', 'A00.0')->first();

        $payload = [
            'patient_id'       => $this->patient->id,
            'doctor_id'        => $this->doctor->id,
            'chief_complaints' => ['Severe watery diarrhea', 'Mild fever'],
            'clinical_notes'   => 'Dehydration grade 1. Advised ORS solution and antibiotic course.',
            'diet_advice'      => 'Light liquid diet, plenty of oral rehydration solution.',
            'general_advice'   => 'Rest, return if vomits repeatedly.',
            'follow_up_date'   => now()->addDays(3)->format('Y-m-d'),
            'diagnoses'        => [
                [
                    'icd10_id'       => $icd->id,
                    'icd_code'       => $icd->code,
                    'diagnosis_name' => $icd->short_description,
                    'diagnosis_type' => 'confirmed',
                ]
            ],
            'items'            => [
                [
                    'medicine_id'   => $medicine->id,
                    'medicine_name' => $medicine->brand_name,
                    'generic_name'  => $medicine->generic_name,
                    'dosage_form'   => 'Tablet',
                    'dosage'        => '625mg',
                    'frequency'     => '1-0-1',
                    'duration_days' => 5,
                    'timing'        => 'After Food',
                    'instructions'  => 'Take with plenty of water',
                ]
            ]
        ];

        $response = $this->postJson('/api/v1/prescriptions', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.patient_id', $this->patient->id)
            ->assertJsonPath('data.doctor_id', $this->doctor->id)
            ->assertJsonPath('data.items.0.medicine_name', 'Augmentin 625 Duo Tablet')
            ->assertJsonPath('data.diagnoses.0.icd_code', 'A00.0');

        $rxId = $response->json('data.id');

        // Verify single fetch endpoint
        $fetchResponse = $this->getJson("/api/v1/prescriptions/{$rxId}");
        $fetchResponse->assertStatus(200)
            ->assertJsonPath('data.id', $rxId)
            ->assertJsonPath('data.patient.name', 'Anil Verma');
    }

    public function test_can_prescribe_and_complete_opd_visit_in_one_step(): void
    {
        $department = Department::first();

        // 1. Create a waiting OPD visit
        $visit = OpdVisit::create([
            'hospital_id'   => $this->hospital->id,
            'patient_id'    => $this->patient->id,
            'doctor_id'     => $this->doctor->id,
            'department_id' => $department->id,
            'visit_date'    => today(),
            'queue_token'   => 'OPD-101',
            'status'        => 'waiting',
        ]);

        $medicine = MedicineMaster::first();
        $icd = Icd10Code::first();

        // 2. Doctor prescribes via 1-click visit endpoint
        $response = $this->postJson("/api/v1/opd/visit/{$visit->id}/prescribe", [
            'chief_complaints' => ['Acute sore throat'],
            'clinical_notes'   => 'Tonsillitis checkup complete.',
            'diagnoses'        => [
                [
                    'icd10_id'       => $icd->id,
                    'icd_code'       => $icd->code,
                    'diagnosis_name' => 'Acute Tonsillitis',
                    'diagnosis_type' => 'confirmed',
                ]
            ],
            'items'            => [
                [
                    'medicine_id'   => $medicine->id,
                    'medicine_name' => $medicine->brand_name,
                    'dosage_form'   => 'Tablet',
                    'dosage'        => '625mg',
                    'frequency'     => '1-0-1',
                    'duration_days' => 5,
                    'timing'        => 'After Food',
                ]
            ]
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        // 3. Verify OPD Visit was automatically marked 'done' with diagnosis & notes
        $visit->refresh();
        $this->assertEquals('done', $visit->status);
        $this->assertEquals('Acute Tonsillitis', $visit->diagnosis);
        $this->assertNotNull($visit->completed_at);

        // 4. Verify patient prescriptions list shows this prescription
        $listResponse = $this->getJson("/api/v1/prescriptions/patient/{$this->patient->id}");
        $listResponse->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertNotEmpty($listResponse->json('data'));
    }
}
