<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // doctor's login account
            $table->string('name');
            $table->string('specialization')->nullable();   // "Cardiologist"
            $table->string('qualification')->nullable();    // "MBBS, MD"
            $table->string('phone', 15)->nullable();
            $table->string('email')->nullable();
            $table->string('hpr_id')->nullable();           // ABDM HPR ID
            $table->integer('consultation_time')->default(15); // minutes per patient
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['hospital_id', 'department_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctors');
    }
};
