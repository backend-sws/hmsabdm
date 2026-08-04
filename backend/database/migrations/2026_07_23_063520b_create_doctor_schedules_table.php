<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('day_of_week');              // 0=Sun, 1=Mon, ..., 6=Sat
            $table->time('start_time');                      // "09:00:00"
            $table->time('end_time');                        // "13:00:00"
            $table->unsignedInteger('max_patients')->default(30);
            $table->decimal('opd_fee', 8, 2)->nullable();    // Doctor's OPD fee on that day
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // A doctor can have only one schedule per day
            $table->unique(['doctor_id', 'day_of_week']);
            $table->index(['doctor_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_schedules');
    }
};
