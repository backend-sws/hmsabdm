<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('emergency_triages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('triage_number', 50)->index(); // e.g. EMG-2026-00001
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('ipd_admission_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('ward_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('bed_id')->nullable()->constrained()->nullOnDelete();

            $table->boolean('is_unknown_patient')->default(false);
            $table->string('patient_name', 255);
            $table->string('gender', 10)->default('O'); // M, F, O
            $table->integer('approximate_age')->nullable();
            $table->string('brought_by', 100)->default('Self'); // Ambulance, Police, Relative, Self, Good Samaritan
            $table->string('brought_by_contact', 50)->nullable();

            // ESI Triage Priority: red, yellow, green
            $table->string('priority_level', 20)->default('yellow'); // red, yellow, green
            $table->string('triage_category', 100)->nullable(); // Trauma, Cardiac, Stroke, Respiratory, Poisoning, Burns, General
            $table->text('chief_complaint')->nullable();
            
            // Consciousness / AVPU Scale & GCS
            $table->string('consciousness_level', 30)->default('alert'); // alert, voice, pain, unresponsive
            $table->integer('gcs_score')->nullable(); // Glasgow Coma Scale (3-15)
            $table->json('initial_vitals')->nullable(); // bp, pulse, spo2, temp, rr

            // Medico-Legal Case (MLC)
            $table->boolean('is_mlc')->default(false);
            $table->string('mlc_number', 50)->nullable();
            $table->string('police_station', 150)->nullable();
            $table->string('police_officer_name', 150)->nullable();
            $table->string('police_buckle_number', 50)->nullable();
            $table->string('incident_place', 255)->nullable();
            $table->text('mlc_injuries_details')->nullable();

            // Status Lifecycle
            $table->string('status', 40)->default('under_treatment'); // under_treatment, stabilized, admitted_to_ipd, transferred_external, discharged, brought_dead, expired
            $table->timestamp('arrival_time')->useCurrent();
            $table->timestamp('stabilized_at')->nullable();
            $table->timestamp('discharged_at')->nullable();
            $table->text('clinical_notes')->nullable();
            $table->unsignedBigInteger('created_by_user_id')->default(0);

            $table->timestamps();

            $table->index(['hospital_id', 'priority_level', 'status']);
            $table->index(['hospital_id', 'is_mlc']);
            $table->index(['hospital_id', 'arrival_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('emergency_triages');
    }
};
