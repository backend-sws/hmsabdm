<?php

namespace Tests\Feature;

use App\Models\Hospital;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HospitalApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_create_hospital_with_default_admin(): void
    {
        $superAdmin = User::factory()->create(['hospital_id' => null]);

        $response = $this->actingAs($superAdmin, 'sanctum')
            ->postJson('/api/v1/hospitals', [
                'name' => 'Metro Care Hospital',
                'code' => 'MCH-01',
                'email' => 'contact@metrocare.com',
                'city' => 'Mumbai',
                'admin_name' => 'Dr. Metro Admin',
                'admin_email' => 'admin@metrocare.com',
                'admin_password' => 'Secret123!',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Metro Care Hospital')
            ->assertJsonPath('data.admin_credentials.email', 'admin@metrocare.com')
            ->assertJsonPath('data.admin_credentials.password', 'Secret123!');

        $this->assertDatabaseHas('hospitals', [
            'name' => 'Metro Care Hospital',
            'code' => 'MCH-01',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'admin@metrocare.com',
            'name' => 'Dr. Metro Admin',
        ]);
    }
}
