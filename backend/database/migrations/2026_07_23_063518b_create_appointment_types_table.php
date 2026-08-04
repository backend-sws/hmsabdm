<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('name');                         // "New Patient", "Follow-up"
            $table->string('code', 20);                    // "NEW", "FU", "EMER"
            $table->decimal('base_fee', 8, 2)->default(0); // Base consultation charge
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['hospital_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_types');
    }
};
