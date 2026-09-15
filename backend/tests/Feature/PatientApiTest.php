<?php

namespace Tests\Feature;

use App\Models\Hospital;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_patients_with_sorting_and_pagination(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        Patient::factory()->count(5)->create(['hospital_id' => $hospital->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/patients?per_page=15&page=1&sort=-created_at');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'data',
                    'meta' => [
                        'current_page',
                        'per_page',
                        'total',
                    ]
                ]
            ]);
    }

    public function test_can_search_patients_by_uhid_or_name(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        $patient = Patient::factory()->create([
            'hospital_id' => $hospital->id,
            'name'        => 'Rahul Sharma',
            'mobile'      => '9876543210',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/patients?search=Rahul');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.data.0.name', 'Rahul Sharma');
    }

    public function test_can_get_single_patient_by_id(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        $patient = Patient::factory()->create([
            'hospital_id' => $hospital->id,
            'name'        => 'Priya Verma',
            'mobile'      => '9123456780',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/patients/{$patient->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Priya Verma');
    }

    public function test_can_update_patient_demographics(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        $patient = Patient::factory()->create([
            'hospital_id' => $hospital->id,
            'name'        => 'Original Name',
            'city'        => 'Old City',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/v1/patients/{$patient->id}", [
                'name'    => 'Updated Name',
                'city'    => 'New Delhi',
                'pincode' => '110001',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonPath('data.city', 'New Delhi');

        $this->assertDatabaseHas('patients', [
            'id'   => $patient->id,
            'name' => 'Updated Name',
            'city' => 'New Delhi',
        ]);
    }

    public function test_can_delete_patient(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        $patient = Patient::factory()->create(['hospital_id' => $hospital->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/v1/patients/{$patient->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('patients', ['id' => $patient->id]);
    }

    public function test_deduplicates_returning_patient_with_same_abha_or_mobile(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        $existing = Patient::factory()->create([
            'hospital_id'  => $hospital->id,
            'name'         => 'Vikram Singh',
            'mobile'       => '9876543210',
            'abha_address' => 'vikram@abdm',
        ]);

        // Receptionist re-enters the same patient after 1 month in normal flow
        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/patients', [
                'name'         => 'Vikram Singh',
                'mobile'       => '9876543210',
                'abha_address' => 'vikram@abdm',
                'city'         => 'Jaipur',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.id', $existing->id)
            ->assertJsonPath('data.uhid', $existing->uhid)
            ->assertJsonPath('data.city', 'Jaipur');

        // Verify no duplicate patient was created
        $this->assertEquals(1, Patient::where('hospital_id', $hospital->id)->count());
    }

    public function test_allows_family_members_with_same_mobile_but_different_name(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        $father = Patient::factory()->create([
            'hospital_id' => $hospital->id,
            'name'        => 'Ramesh Sharma',
            'mobile'      => '9876500000',
        ]);

        // Daughter registers with same family mobile number
        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/patients', [
                'name'   => 'Pooja Sharma',
                'mobile' => '9876500000',
                'gender' => 'F',
            ]);

        $response->assertStatus(201);
        $this->assertNotEquals($father->id, $response->json('data.id'));

        // Verify 2 distinct patients exist
        $this->assertEquals(2, Patient::where('hospital_id', $hospital->id)->count());
    }
}
