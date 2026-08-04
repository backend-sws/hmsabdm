<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vitals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('opd_visit_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('recorded_at');

            // Temperature
            $table->decimal('temperature', 5, 1)->nullable();        // 98.6
            $table->char('temperature_unit', 1)->default('F');       // F or C

            // Blood Pressure
            $table->smallInteger('blood_pressure_sys')->nullable();   // systolic  e.g. 120
            $table->smallInteger('blood_pressure_dia')->nullable();   // diastolic e.g. 80

            // Other vitals
            $table->smallInteger('pulse_rate')->nullable();           // bpm
            $table->smallInteger('respiratory_rate')->nullable();     // breaths/min
            $table->decimal('oxygen_saturation', 4, 1)->nullable();  // SpO2 %
            $table->decimal('weight', 5, 2)->nullable();              // kg
            $table->decimal('height', 5, 2)->nullable();              // cm
            $table->decimal('bmi', 5, 2)->nullable();                 // auto-calculated

            // Blood Glucose
            $table->decimal('blood_glucose', 6, 1)->nullable();      // mg/dL
            $table->enum('glucose_type', ['fasting', 'random', 'post_meal'])->nullable();

            $table->timestamps();

            $table->index(['patient_id', 'recorded_at']);
            $table->index('opd_visit_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vitals');
    }
};
