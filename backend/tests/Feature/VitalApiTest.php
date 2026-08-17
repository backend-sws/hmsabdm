<?php

namespace Tests\Feature;

use App\Models\Hospital;
use App\Models\IpdAdmission;
use App\Models\Patient;
use App\Models\User;
use App\Models\Vital;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VitalApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_record_opd_vitals(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);
        $patient = Patient::factory()->create(['hospital_id' => $hospital->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/vitals', [
                'patient_id'         => $patient->id,
                'temperature'        => 98.6,
                'blood_pressure_sys' => 120,
                'blood_pressure_dia' => 80,
                'pulse_rate'         => 72,
                'weight'             => 70,
                'height'             => 175,
                'encounter_type'     => 'opd',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.encounter_type', 'opd')
            ->assertJsonPath('data.bmi', 22.86);
    }

    public function test_can_record_ipd_vitals_and_retrieve_admission_chart(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);
        $patient = Patient::factory()->create(['hospital_id' => $hospital->id]);
        $admission = IpdAdmission::create([]);

        // Record morning vitals
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/vitals', [
                'patient_id'         => $patient->id,
                'ipd_admission_id'   => $admission->id,
                'temperature'        => 99.1,
                'blood_pressure_sys' => 130,
                'blood_pressure_dia' => 85,
                'pulse_rate'         => 80,
                'recorded_at'        => now()->subHours(4)->toIso8601String(),
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.encounter_type', 'ipd');

        // Record evening vitals
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/vitals', [
                'patient_id'         => $patient->id,
                'ipd_admission_id'   => $admission->id,
                'temperature'        => 98.4,
                'blood_pressure_sys' => 120,
                'blood_pressure_dia' => 80,
                'pulse_rate'         => 74,
                'recorded_at'        => now()->toIso8601String(),
            ])
            ->assertStatus(201);

        // Fetch IPD admission vitals chart
        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/vitals/ipd/{$admission->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data');
    }
}
