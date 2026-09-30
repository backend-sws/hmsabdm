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
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('opd_visit_id')->nullable()->constrained('opd_visits')->nullOnDelete();
            $table->foreignId('ipd_admission_id')->nullable()->constrained('ipd_admissions')->nullOnDelete();
            $table->string('encounter_type', 30)->default('opd'); // 'opd', 'ipd', 'emergency'
            $table->string('prescription_number', 50)->nullable()->index();
            $table->json('chief_complaints')->nullable(); // ["Fever x 3 days", "Headache"]
            $table->text('clinical_notes')->nullable();
            $table->text('diet_advice')->nullable();
            $table->text('general_advice')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->string('status', 30)->default('active'); // 'active', 'completed', 'dispensed', 'cancelled'
            $table->timestamps();

            $table->index(['hospital_id', 'patient_id']);
            $table->index(['hospital_id', 'doctor_id']);
            $table->index(['hospital_id', 'opd_visit_id']);
            $table->index(['hospital_id', 'ipd_admission_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};
