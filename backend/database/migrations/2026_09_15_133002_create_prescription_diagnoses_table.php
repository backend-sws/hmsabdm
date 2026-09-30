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
        Schema::create('prescription_diagnoses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prescription_id')->constrained()->cascadeOnDelete();
            $table->foreignId('icd10_id')->nullable()->constrained('icd10_codes')->nullOnDelete();
            $table->string('icd_code', 20)->nullable(); // e.g. A00.0, E11.9
            $table->string('diagnosis_name', 500);
            $table->string('diagnosis_type', 30)->default('provisional'); // provisional, confirmed, differential
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('prescription_id');
            $table->index('icd10_id');
            $table->index('icd_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescription_diagnoses');
    }
};
