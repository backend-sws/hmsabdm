<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('counter_queues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->string('link_token')->unique();            // ABDM token e.g. "482" — 30 min validity
            $table->string('counter_code')->nullable();        // ABDM hipCode
            $table->enum('status', ['waiting_confirmation', 'confirmed', 'expired'])
                  ->default('waiting_confirmation');
            $table->timestamp('expires_at')->nullable();       // now() + 30 min (per NHA spec)
            $table->timestamps();

            $table->index(['status', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('counter_queues');
    }
};
