<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\Hospital;
use App\Models\OpdVisit;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpdApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Hospital $hospital;
    protected Doctor $doctor;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->hospital = Hospital::factory()->create();
        $this->user = User::factory()->create(['hospital_id' => $this->hospital->id]);
        $this->doctor = Doctor::factory()->create(['hospital_id' => $this->hospital->id]);
    }

    public function test_get_today_queue()
    {
        // Visit for today
        OpdVisit::factory()->create([
            'hospital_id' => $this->hospital->id,
            'doctor_id' => $this->doctor->id,
            'visit_date' => today()->toDateString(),
            'status' => 'waiting',
            'queue_token' => 1
        ]);

        // Visit for tomorrow
        OpdVisit::factory()->create([
            'hospital_id' => $this->hospital->id,
            'doctor_id' => $this->doctor->id,
            'visit_date' => today()->addDay()->toDateString(),
            'status' => 'waiting',
            'queue_token' => 2
        ]);

        $response = $this->actingAs($this->user)->getJson("/api/v1/opd/queue?doctor_id={$this->doctor->id}");

        $response->assertStatus(200)
                 ->assertJsonCount(1, 'data'); // Should only get today's visit
    }

    public function test_call_patient()
    {
        $visit = OpdVisit::factory()->create([
            'hospital_id' => $this->hospital->id,
            'doctor_id' => $this->doctor->id,
            'status' => 'waiting',
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/v1/opd/visit/{$visit->id}/call", [
            'doctor_id' => $this->doctor->id
        ]);

        $response->assertStatus(200);
        $this->assertEquals('called', $visit->fresh()->status);
        $this->assertNotNull($visit->fresh()->called_at);
    }

    public function test_complete_consultation()
    {
        $visit = OpdVisit::factory()->create([
            'hospital_id' => $this->hospital->id,
            'doctor_id' => $this->doctor->id,
            'status' => 'called',
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/v1/opd/visit/{$visit->id}/complete", [
            'doctor_id' => $this->doctor->id,
            'diagnosis' => 'Viral Fever',
            'notes' => 'Prescribed paracetamol'
        ]);

        $response->assertStatus(200);
        $this->assertEquals('done', $visit->fresh()->status);
        $this->assertEquals('Viral Fever', $visit->fresh()->diagnosis);
        $this->assertNotNull($visit->fresh()->completed_at);
    }
}
