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
}
