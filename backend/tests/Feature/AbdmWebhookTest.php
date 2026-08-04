<?php

namespace Tests\Feature;

use App\Models\CounterQueue;
use App\Models\Patient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AbdmWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Since the webhook controller creates a patient with a hospital_id = 1 by default,
        // we'll need to create a default hospital in tests.
        \App\Models\Hospital::factory()->create(['id' => 1]);
    }

    public function test_scan_and_share_webhook_creates_patient_and_queue()
    {
        $payload = [
            'token' => 'mock-token-abc',
            'hipCode' => 'HIP123',
            'profile' => [
                'patient' => [
                    'abhaNumber' => '91-1111-2222-3333',
                    'abhaAddress' => 'test@abdm',
                    'name' => 'John Doe',
                    'gender' => 'M',
                    'yearOfBirth' => '1990',
                    'mobile' => '9876543210'
                ]
            ]
        ];

        $response = $this->postJson('/api/webhook/abdm/v1/scan-and-share', $payload);

        $response->assertStatus(202)
                 ->assertJsonStructure(['status', 'message', 'token']);

        // Verify patient created
        $this->assertDatabaseHas('patients', [
            'abha_number' => '91-1111-2222-3333',
            'name' => 'John Doe',
        ]);

        // Verify queue created
        $this->assertDatabaseHas('counter_queues', [
            'status' => 'waiting_confirmation',
        ]);
    }

    public function test_scan_and_share_webhook_links_existing_patient()
    {
        $patient = Patient::factory()->create([
            'hospital_id' => 1,
            'abha_number' => '91-1111-2222-3333',
            'name' => 'Old Name',
        ]);

        $payload = [
            'token' => 'mock-token-def',
            'hipCode' => 'HIP123',
            'profile' => [
                'patient' => [
                    'abhaNumber' => '91-1111-2222-3333',
                    'name' => 'New Name', // Webhook should NOT overwrite manual records
                ]
            ]
        ];

        $response = $this->postJson('/api/webhook/abdm/v1/scan-and-share', $payload);
        $response->assertStatus(202);

        // Ensure patient not duplicated
        $this->assertEquals(1, Patient::count());
        $this->assertDatabaseHas('patients', [
            'abha_number' => '91-1111-2222-3333',
            'name' => 'Old Name', // Should remain old name
        ]);

        // Ensure queue is created for the existing patient
        $this->assertDatabaseHas('counter_queues', [
            'patient_id' => $patient->id,
            'status' => 'waiting_confirmation',
        ]);
    }

    public function test_scan_and_share_missing_payload_handles_gracefully()
    {
        $response = $this->postJson('/api/webhook/abdm/v1/scan-and-share', []);
        
        $response->assertStatus(400); // Bad request for missing payload
    }
}
