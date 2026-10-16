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
        Schema::create('ipd_discharge_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ipd_admission_id')->constrained('ipd_admissions')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->foreignId('prepared_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('finalized_by_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('summary_number', 50)->nullable()->index();
            $table->enum('status', ['draft', 'finalized', 'amended'])->default('draft');
            $table->string('discharge_type', 30)->default('routine'); // routine, lama, dama, transfer, absconded, deceased
            
            // Admission & Discharge Timestamps
            $table->dateTime('admission_date')->nullable();
            $table->dateTime('discharge_date')->nullable();
            
            // Diagnoses
            $table->text('admission_diagnosis')->nullable();
            $table->text('final_diagnosis')->nullable();
            $table->string('icd10_code', 50)->nullable();
            
            // Clinical Presentation
            $table->text('chief_complaints')->nullable();
            $table->text('history_of_present_illness')->nullable();
            $table->text('past_history_and_allergies')->nullable();
            
            // Discharge Condition & Vitals
            $table->string('condition_at_discharge', 255)->nullable()->default('stable'); // stable, improved, critical, relieved, deceased
            $table->json('discharge_vitals')->nullable(); // { temperature, bp_sys, bp_dia, pulse, rr, spo2 }
            
            // Hospital Course & Interventions
            $table->text('hospital_course')->nullable();
            $table->text('procedures_surgeries')->nullable();
            $table->text('investigations_summary')->nullable();
            $table->text('treatment_given')->nullable();
            
            // Take-Home Discharge Medications
            $table->json('discharge_medications')->nullable(); // [{ medicine_name, dosage_form, dose, route, frequency, duration, instructions }]
            
            // Post-Discharge Care & Advice
            $table->text('dietary_advice')->nullable();
            $table->text('physical_activity_advice')->nullable();
            $table->text('wound_care_instructions')->nullable();
            $table->text('emergency_red_flags')->nullable();
            
            // Follow-up
            $table->date('follow_up_date')->nullable();
            $table->foreignId('follow_up_doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->text('follow_up_instructions')->nullable();
            
            $table->dateTime('finalized_at')->nullable();
            $table->timestamps();

            $table->unique(['hospital_id', 'ipd_admission_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ipd_discharge_summaries');
    }
};
