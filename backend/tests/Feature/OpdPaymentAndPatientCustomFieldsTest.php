<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\Department;
use App\Models\Hospital;
use App\Models\OpdVisit;
use App\Models\Patient;
use App\Models\PatientFieldConfig;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpdPaymentAndPatientCustomFieldsTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_opd_visit_with_split_payments_and_discount(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);
        $patient = Patient::factory()->create(['hospital_id' => $hospital->id]);
        $department = Department::factory()->create(['hospital_id' => $hospital->id]);
        $doctor = Doctor::factory()->create([
            'hospital_id'   => $hospital->id,
            'department_id' => $department->id,
        ]);

        // Fee ₹500, Discount ₹50, Paid ₹450 (₹250 Cash + ₹200 UPI) -> Paid in full
        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/reception/visit', [
                'patient_id'        => $patient->id,
                'doctor_id'         => $doctor->id,
                'department_id'     => $department->id,
                'chief_complaint'   => 'Severe headache',
                'fee_charged'       => 500.00,
                'discount'          => 50.00,
                'amount_paid'       => 450.00,
                'payment_breakdown' => [
                    ['method' => 'cash', 'amount' => 250.00],
                    ['method' => 'upi', 'amount' => 200.00, 'ref' => 'UPI9876543210'],
                ],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.fee_charged', 500)
            ->assertJsonPath('data.discount', 50)
            ->assertJsonPath('data.amount_paid', 450)
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.payment_method', 'split')
            ->assertJsonCount(2, 'data.payment_breakdown');

        $this->assertDatabaseHas('opd_visits', [
            'patient_id'     => $patient->id,
            'fee_charged'    => 500.00,
            'discount'       => 50.00,
            'amount_paid'    => 450.00,
            'payment_status' => 'paid',
            'payment_method' => 'split',
        ]);
    }

    public function test_can_calculate_partial_payment_status(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);
        $patient = Patient::factory()->create(['hospital_id' => $hospital->id]);
        $department = Department::factory()->create(['hospital_id' => $hospital->id]);
        $doctor = Doctor::factory()->create([
            'hospital_id'   => $hospital->id,
            'department_id' => $department->id,
        ]);

        // Fee ₹600, Paid ₹200 -> Partial status
        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/reception/visit', [
                'patient_id'     => $patient->id,
                'doctor_id'      => $doctor->id,
                'department_id'  => $department->id,
                'fee_charged'    => 600.00,
                'amount_paid'    => 200.00,
                'payment_method' => 'cash',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.payment_status', 'partial');
    }

    public function test_can_register_patient_with_guardian_and_custom_fields(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/reception/register', [
                'name'              => 'Rahul Kumar',
                'guardian_name'     => 'Mahesh Kumar',
                'guardian_relation' => 'Father',
                'guardian_phone'    => '9876500001',
                'mobile'            => '9876543210',
                'gender'            => 'M',
                'dob'               => '2005-06-15',
                'blood_group'       => 'B+',
                'district'          => 'Patna',
                'state'             => 'Bihar',
                'custom_fields'     => [
                    'marital_status'          => 'Single',
                    'occupation'              => 'Student',
                    'emergency_contact_name'  => 'Mahesh Kumar',
                    'emergency_contact_phone' => '9876500001',
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.guardian_name', 'Mahesh Kumar')
            ->assertJsonPath('data.guardian_relation', 'Father')
            ->assertJsonPath('data.guardian_phone', '9876500001')
            ->assertJsonPath('data.district', 'Patna')
            ->assertJsonPath('data.custom_fields.marital_status', 'Single');

        $this->assertDatabaseHas('patients', [
            'name'          => 'Rahul Kumar',
            'guardian_name' => 'Mahesh Kumar',
            'district'      => 'Patna',
            'state'         => 'Bihar',
        ]);
    }

    public function test_can_manage_hospital_custom_patient_fields(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        // 1. Get default configs
        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/patient-fields/configs');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertGreaterThanOrEqual(5, count($response->json('data')));

        // 2. Create custom field
        $createRes = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/patient-fields/configs', [
                'label'       => 'School / College Name',
                'field_key'   => 'school_name',
                'category'    => 'education',
                'input_type'  => 'text',
                'placeholder' => 'Enter school/college name',
                'is_required' => false,
                'sort_order'  => 20,
            ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('data.field_key', 'school_name');

        $configId = $createRes->json('data.id');

        // 3. Update custom field
        $updateRes = $this->actingAs($user, 'sanctum')
            ->putJson("/api/v1/patient-fields/configs/{$configId}", [
                'label' => 'School or Institute Name',
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.label', 'School or Institute Name');

        // 4. Delete custom field
        $deleteRes = $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/v1/patient-fields/configs/{$configId}");

        $deleteRes->assertStatus(200);
        $this->assertDatabaseMissing('patient_field_configs', ['id' => $configId]);
    }
}
