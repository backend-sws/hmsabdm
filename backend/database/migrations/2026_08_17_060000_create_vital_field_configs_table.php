<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Hospital Custom Vital Field Definitions
        Schema::create('vital_field_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('field_key'); // e.g. 'pain_score', 'waist_circumference', 'spo2'
            $table->string('label');     // e.g. 'Pain Score (1-10)', 'Waist Circumference'
            $table->string('category')->default('General'); // 'General', 'Cardio', 'Diabetic', 'Pediatric'
            $table->string('unit')->nullable(); // 'cm', 'mmHg', 'bpm', 'scale', 'mg/dL', '%'
            $table->enum('input_type', ['number', 'text', 'select', 'boolean'])->default('number');
            $table->json('options')->nullable(); // For select dropdown options
            $table->decimal('min_value', 8, 2)->nullable();
            $table->decimal('max_value', 8, 2)->nullable();
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['hospital_id', 'field_key']);
            $table->index(['hospital_id', 'is_active', 'sort_order']);
        });

        // 2. Add custom_vitals JSON column to vitals table
        Schema::table('vitals', function (Blueprint $table) {
            $table->json('custom_vitals')->nullable()->after('glucose_type');
        });
    }

    public function down(): void
    {
        Schema::table('vitals', function (Blueprint $table) {
            $table->dropColumn('custom_vitals');
        });

        Schema::dropIfExists('vital_field_configs');
    }
};
