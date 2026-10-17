<?php

namespace Database\Seeders;

use App\Models\Hospital;
use App\Models\Doctor;
use App\Models\EmergencyTriage;
use Illuminate\Database\Seeder;

class EmergencyMasterSeeder extends Seeder
{
    /**
     * Seed Emergency Triage realistic cases across Red, Yellow, Green, and MLC categories.
     */
    public function run(): void
    {
        $hospitals = Hospital::all();
        if ($hospitals->isEmpty()) {
            return;
        }

        foreach ($hospitals as $hospital) {
            $hId = $hospital->id;
            $doctor = Doctor::where('hospital_id', $hId)->first();

            $cases = [
                // 1. Red Priority (Resuscitation)
                [
                    'triage_number' => 'EMG-' . $hId . '-2026-0001',
                    'patient_name' => 'Kailash Nath',
                    'gender' => 'male',
                    'approximate_age' => 54,
                    'brought_by' => 'Ambulance 108',
                    'brought_by_contact' => '9811223344',
                    'priority_level' => 'red',
                    'triage_category' => 'medical',
                    'chief_complaint' => 'Acute substernal chest crushing pain radiating to left arm with cold diaphoresis, dyspnea for 45 minutes.',
                    'consciousness_level' => 'confused',
                    'gcs_score' => 13,
                    'initial_vitals' => [
                        'bp_systolic' => 88,
                        'bp_diastolic' => 54,
                        'pulse' => 118,
                        'sp_o2' => 89,
                        'respiratory_rate' => 28,
                        'temperature' => 36.8,
                    ],
                    'is_mlc' => false,
                    'status' => 'under_treatment',
                    'arrival_time' => now()->subMinutes(35),
                    'clinical_notes' => 'Suspected Anterior Wall STEMI. Oxygen 6L/min by mask started, ECG stat, Aspirin 300mg + Clopidogrel 300mg loading dose given, Cardiology on-call informed.',
                ],
                // 2. Yellow Priority (Urgent)
                [
                    'triage_number' => 'EMG-' . $hId . '-2026-0002',
                    'patient_name' => 'Meena Kumari',
                    'gender' => 'female',
                    'approximate_age' => 28,
                    'brought_by' => 'Family (Husband)',
                    'brought_by_contact' => '9822334455',
                    'priority_level' => 'yellow',
                    'triage_category' => 'medical',
                    'chief_complaint' => 'High grade fever (103 F) with chills, severe intractable vomiting, and dehydration for 2 days.',
                    'consciousness_level' => 'alert',
                    'gcs_score' => 15,
                    'initial_vitals' => [
                        'bp_systolic' => 106,
                        'bp_diastolic' => 70,
                        'pulse' => 96,
                        'sp_o2' => 98,
                        'respiratory_rate' => 20,
                        'temperature' => 39.4,
                    ],
                    'is_mlc' => false,
                    'status' => 'under_treatment',
                    'arrival_time' => now()->subMinutes(90),
                    'clinical_notes' => 'IV access secured with 20G cannula. IV Perfalgan 1g given, IV NS 500ml running at 100ml/hr. Dengue NS1 & Malarial antigen sent.',
                ],
                // 3. Green Priority / MLC (Medico-Legal Case)
                [
                    'triage_number' => 'EMG-' . $hId . '-2026-0003',
                    'patient_name' => 'Santosh Yadav',
                    'gender' => 'male',
                    'approximate_age' => 32,
                    'brought_by' => 'Police Escort / PCR Van',
                    'brought_by_contact' => '112',
                    'priority_level' => 'green',
                    'triage_category' => 'trauma',
                    'chief_complaint' => 'Skidded on two-wheeler on highway. Laceration wound over right knee and forearm abrasion.',
                    'consciousness_level' => 'alert',
                    'gcs_score' => 15,
                    'initial_vitals' => [
                        'bp_systolic' => 124,
                        'bp_diastolic' => 82,
                        'pulse' => 78,
                        'sp_o2' => 99,
                        'respiratory_rate' => 16,
                        'temperature' => 37.0,
                    ],
                    'is_mlc' => true,
                    'mlc_number' => 'MLC-' . $hId . '-2026-042',
                    'police_station' => 'Central City Police Station',
                    'police_officer_name' => 'Sub-Inspector R. K. Shinde',
                    'police_buckle_number' => 'PC-8841',
                    'incident_place' => 'Sector 4 Flyover junction',
                    'mlc_injuries_details' => 'Superficial linear laceration 3cm x 0.5cm over anterior right knee, dermis depth. Contusion with abrasion 4cm x 2cm right forearm. No bony crepitus or deformity.',
                    'status' => 'stabilized',
                    'arrival_time' => now()->subHours(2),
                    'stabilized_at' => now()->subMinutes(30),
                    'clinical_notes' => 'Wound cleaned with Betadine & saline, sterile suturing (2 Ethilon sutures) under local lignocaine. Inj TT 0.5ml IM given. MLC paperwork completed.',
                ],
            ];

            foreach ($cases as $c) {
                EmergencyTriage::firstOrCreate(
                    ['hospital_id' => $hId, 'triage_number' => $c['triage_number']],
                    array_merge($c, [
                        'hospital_id' => $hId,
                        'doctor_id'   => $doctor?->id,
                    ])
                );
            }
        }

        $this->command->info('Emergency Triage cases seeded successfully.');
    }
}
