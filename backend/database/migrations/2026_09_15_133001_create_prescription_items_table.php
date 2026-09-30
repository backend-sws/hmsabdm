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
        Schema::create('prescription_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prescription_id')->constrained()->cascadeOnDelete();
            $table->foreignId('medicine_id')->nullable()->constrained('medicines_master')->nullOnDelete();
            $table->string('medicine_name', 255);
            $table->string('generic_name', 255)->nullable();
            $table->string('dosage_form', 100)->nullable(); // Tablet, Syrup, Injection, Capsule, Drops, etc.
            $table->string('dosage', 100)->nullable();      // 500mg, 1 tablet, 10ml
            $table->string('frequency', 50)->nullable();   // 1-0-1, 1-0-0, TDS, SOS, Once Daily
            $table->integer('duration_days')->default(1);  // 5 days
            $table->string('timing', 100)->nullable();     // After Food, Before Food, At Bedtime
            $table->string('instructions', 255)->nullable();
            $table->boolean('is_dispensed')->default(false);
            $table->timestamps();

            $table->index('prescription_id');
            $table->index('medicine_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescription_items');
    }
};
