<?php

namespace Tests\Feature;

use App\Models\Bed;
use App\Models\CounterQueue;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\Hospital;
use App\Models\Patient;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IpdAdmissionApiTest extends TestCase
{
    use RefreshDatabase;

    protected Hospital $hospital;
    protected User $user;
    protected Doctor $doctor;
    protected Department $department;
    protected Ward $ward;
    protected Bed $bed1;
    protected Bed $bed2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hospital = Hospital::factory()->create(['name' => 'City Care Hospital']);
        $this->user = User::factory()->create(['hospital_id' => $this->hospital->id]);

        $this->department = Department::create([
            'hospital_id' => $this->hospital->id,
            'name'        => 'Surgery',
            'code'        => 'SURG',
            'is_active'   => true,
        ]);

        $this->doctor = Doctor::create([
            'hospital_id'    => $this->hospital->id,
            'department_id'  => $this->department->id,
            'name'           => 'Dr. Sanjeev Kumar',
            'email'          => 'sanjeev@example.com',
            'specialization' => 'General Surgeon',
            'phone'          => '9876500001',
            'is_active'      => true,
        ]);

        $this->ward = Ward::create([
            'hospital_id'  => $this->hospital->id,
            'name'         => 'Surgical Male Ward',
            'code'         => 'SMW',
            'floor'        => '1st Floor',
            'gender_type'  => 'male',
            'daily_charge' => 1200.00,
            'is_active'    => true,
        ]);

        $this->bed1 = Bed::create([
            'hospital_id'  => $this->hospital->id,
            'ward_id'      => $this->ward->id,
            'bed_number'   => 'SMW-01',
            'status'       => 'available',
            'daily_charge' => 1200.00,
            'is_active'    => true,
        ]);

        $this->bed2 = Bed::create([
            'hospital_id'  => $this->hospital->id,
            'ward_id'      => $this->ward->id,
            'bed_number'   => 'SMW-02',
            'status'       => 'available',
            'daily_charge' => 1200.00,
            'is_active'    => true,
        ]);
    }

    public function test_can_get_wards_and_available_beds(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/ipd/wards');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.name', 'Surgical Male Ward')
            ->assertJsonPath('data.0.available_beds', 2);

        $bedResponse = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/v1/ipd/beds/available?ward_id={$this->ward->id}");

        $bedResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data');
    }

    public function test_can_admit_existing_patient_to_ipd_and_issue_parcha(): void
    {
        $patient = Patient::factory()->create([
            'hospital_id' => $this->hospital->id,
            'name'        => 'Ramesh Gupta',
            'mobile'      => '9876543210',
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/reception/admit-ipd', [
                'patient_id'        => $patient->id,
                'doctor_id'         => $this->doctor->id,
                'department_id'     => $this->department->id,
                'ward_id'           => $this->ward->id,
                'bed_id'            => $this->bed1->id,
                'admission_type'    => 'planned',
                'admission_reason'  => 'Planned Laparoscopic Cholecystectomy',
                'is_mlc'            => false,
                'advance_deposit'   => 5000.00,
                'payment_method'    => 'upi',
                'payment_ref'       => 'UPI889900',
                'attendant_name'    => 'Suresh Gupta',
                'attendant_relation'=> 'Brother',
                'attendant_phone'   => '9876500000',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.patient.name', 'Ramesh Gupta')
            ->assertJsonPath('data.bed.bed_number', 'SMW-01')
            ->assertJsonPath('data.doctor.name', 'Dr. Sanjeev Kumar')
            ->assertJsonPath('data.financials.advance_deposit', 5000)
            ->assertJsonPath('data.financials.payment_status', 'paid');

        $ipdNumber = $response->json('data.ipd_number');
        $this->assertNotEmpty($ipdNumber);
        $this->assertStringStartsWith('IPD-', $ipdNumber);

        // Bed 1 should now be occupied
        $this->assertEquals('occupied', $this->bed1->fresh()->status);
    }

    public function test_can_admit_direct_walk_in_patient_in_single_step(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/ipd/admit', [
                'name'              => 'Sunita Sharma',
                'mobile'            => '9876511111',
                'gender'            => 'F',
                'dob'               => '1992-04-10',
                'id_proof_type'     => 'pan',
                'id_proof_number'   => 'ABCDE5678G',
                'doctor_id'         => $this->doctor->id,
                'department_id'     => $this->department->id,
                'bed_id'            => $this->bed2->id,
                'admission_type'    => 'emergency',
                'admission_reason'  => 'Severe Abdominal Pain and Vomiting',
                'is_mlc'            => false,
                'advance_deposit'   => 3000.00,
                'payment_breakdown' => [
                    ['method' => 'cash', 'amount' => 1500.00],
                    ['method' => 'upi', 'amount' => 1500.00, 'ref' => 'UPI998877'],
                ],
                'attendant_name'    => 'Mohan Sharma',
                'attendant_relation'=> 'Husband',
                'attendant_phone'   => '9876522222',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.patient.name', 'Sunita Sharma')
            ->assertJsonPath('data.patient.id_proof_type', 'pan')
            ->assertJsonPath('data.financials.payment_method', 'split')
            ->assertJsonPath('data.financials.advance_deposit', 3000);

        // Bed 2 should now be occupied
        $this->assertEquals('occupied', $this->bed2->fresh()->status);
    }

    public function test_cannot_admit_to_already_occupied_bed(): void
    {
        $patient1 = Patient::factory()->create(['hospital_id' => $this->hospital->id]);
        $patient2 = Patient::factory()->create(['hospital_id' => $this->hospital->id]);

        // Admit patient 1 into bed1
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/ipd/admit', [
                'patient_id' => $patient1->id,
                'doctor_id'  => $this->doctor->id,
                'bed_id'     => $this->bed1->id,
            ]);

        // Attempt to admit patient 2 into the same occupied bed1
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/ipd/admit', [
                'patient_id' => $patient2->id,
                'doctor_id'  => $this->doctor->id,
                'bed_id'     => $this->bed1->id,
            ]);

        $response->assertStatus(400)
            ->assertJsonPath('success', false);
    }

    public function test_can_transfer_patient_to_different_bed(): void
    {
        $patient = Patient::factory()->create(['hospital_id' => $this->hospital->id]);

        // Admit into bed1
        $admitResponse = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/ipd/admit', [
                'patient_id' => $patient->id,
                'doctor_id'  => $this->doctor->id,
                'bed_id'     => $this->bed1->id,
            ]);

        $admissionId = $admitResponse->json('data.id');

        // Transfer to bed2
        $transferResponse = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/ipd/admissions/{$admissionId}/transfer-bed", [
                'new_bed_id' => $this->bed2->id,
            ]);

        $transferResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.bed.bed_number', 'SMW-02');

        // Old bed1 should be available, new bed2 occupied
        $this->assertEquals('available', $this->bed1->fresh()->status);
        $this->assertEquals('occupied', $this->bed2->fresh()->status);
    }

    public function test_can_discharge_patient_and_free_bed(): void
    {
        $patient = Patient::factory()->create(['hospital_id' => $this->hospital->id]);

        $admitResponse = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/ipd/admit', [
                'patient_id' => $patient->id,
                'doctor_id'  => $this->doctor->id,
                'bed_id'     => $this->bed1->id,
            ]);

        $admissionId = $admitResponse->json('data.id');
        $this->assertEquals('occupied', $this->bed1->fresh()->status);

        // Discharge
        $dischargeResponse = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/ipd/admissions/{$admissionId}/discharge", [
                'discharge_date' => now()->toDateTimeString(),
            ]);

        $dischargeResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'discharged');

        // Bed1 should be released to available
        $this->assertEquals('available', $this->bed1->fresh()->status);
    }

    public function test_can_admit_from_scan_and_share_token(): void
    {
        $patient = Patient::factory()->create(['hospital_id' => $this->hospital->id]);

        $queue = CounterQueue::create([
            'hospital_id'  => $this->hospital->id,
            'patient_id'   => $patient->id,
            'link_token'   => '999',
            'counter_code' => 'COUNTER-1',
            'status'       => 'waiting_confirmation',
            'expires_at'   => now()->addMinutes(15),
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/reception/admit-ipd', [
                'token'     => '999',
                'doctor_id' => $this->doctor->id,
                'bed_id'    => $this->bed1->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.patient.id', $patient->id);

        $this->assertEquals('confirmed', $queue->fresh()->status);
    }
}
