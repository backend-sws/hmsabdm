<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\Department;
use App\Models\Hospital;
use App\Models\HospitalSetting;
use App\Models\IpdAdmission;
use App\Models\OpdVisit;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NumberingSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_generate_and_customize_opd_number(): void
    {
        $hospital = Hospital::factory()->create(['code' => 'DEMO']);
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        // Default OPD generation: OPD-2026-00001
        $opdNo1 = Hospital::generateNextOpdNumber($hospital->id);
        $this->assertEquals('OPD-' . date('Y') . '-00001', $opdNo1);

        $opdNo2 = Hospital::generateNextOpdNumber($hospital->id);
        $this->assertEquals('OPD-' . date('Y') . '-00002', $opdNo2);

        // Customize OPD format via Settings API
        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/hospital/settings/opd-number', [
                'opd_prefix'         => 'CITY',
                'opd_format'         => '{PREFIX}/{CODE}/{YEAR}/{SEQ}',
                'opd_padding'        => 4,
                'opd_sequence_reset' => 'monthly',
                'opd_next_sequence'  => 10,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.preview_sample', 'CITY/DEMO/' . date('Y') . '/0010');

        $opdNoCustom = Hospital::generateNextOpdNumber($hospital->id);
        $this->assertEquals('CITY/DEMO/' . date('Y') . '/0010', $opdNoCustom);
    }

    public function test_can_generate_and_customize_ipd_number(): void
    {
        $hospital = Hospital::factory()->create(['code' => 'DEMO']);
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        // Default IPD generation: IPD-2026-00001
        $ipdNo1 = Hospital::generateNextIpdNumber($hospital->id);
        $this->assertEquals('IPD-' . date('Y') . '-00001', $ipdNo1);

        // Customize IPD format via Settings API
        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/hospital/settings/ipd-number', [
                'ipd_prefix'         => 'ADM',
                'ipd_format'         => '{CODE}-IPD-{YEAR}{MONTH}-{SEQ}',
                'ipd_padding'        => 3,
                'ipd_sequence_reset' => 'yearly',
                'ipd_next_sequence'  => 5,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $ipdNoCustom = Hospital::generateNextIpdNumber($hospital->id);
        $this->assertEquals('DEMO-IPD-' . date('Ym') . '-005', $ipdNoCustom);
    }

    public function test_opd_visit_creation_automatically_assigns_opd_number(): void
    {
        $hospital = Hospital::factory()->create();
        $patient = Patient::factory()->create(['hospital_id' => $hospital->id]);
        $department = Department::factory()->create(['hospital_id' => $hospital->id]);
        $doctor = Doctor::factory()->create([
            'hospital_id'   => $hospital->id,
            'department_id' => $department->id,
        ]);

        $visit = OpdVisit::create([
            'hospital_id'   => $hospital->id,
            'patient_id'    => $patient->id,
            'doctor_id'     => $doctor->id,
            'department_id' => $department->id,
            'visit_date'    => now()->toDateString(),
            'queue_token'   => 1,
        ]);

        $this->assertNotEmpty($visit->opd_number);
        $this->assertStringStartsWith('OPD-', $visit->opd_number);
    }

    public function test_ipd_admission_creation_automatically_assigns_ipd_number(): void
    {
        $hospital = Hospital::factory()->create();
        $patient = Patient::factory()->create(['hospital_id' => $hospital->id]);

        $admission = IpdAdmission::create([
            'hospital_id' => $hospital->id,
            'patient_id'  => $patient->id,
        ]);

        $this->assertNotEmpty($admission->ipd_number);
        $this->assertStringStartsWith('IPD-', $admission->ipd_number);
        $this->assertEquals('admitted', $admission->status);
    }

    public function test_get_unified_numbering_overview(): void
    {
        $hospital = Hospital::factory()->create();
        $user = User::factory()->create(['hospital_id' => $hospital->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/hospital/settings/numbering');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'uhid' => ['uhid_prefix', 'uhid_format', 'preview_sample', 'available_formats'],
                    'opd'  => ['opd_prefix', 'opd_format', 'preview_sample', 'available_formats'],
                    'ipd'  => ['ipd_prefix', 'ipd_format', 'preview_sample', 'available_formats'],
                ]
            ]);
    }
}
