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
        Schema::create('ipd_shift_handovers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained('hospitals')->onDelete('cascade');
            $table->foreignId('ward_id')->constrained('wards')->onDelete('cascade');
            $table->foreignId('ipd_admission_id')->constrained('ipd_admissions')->onDelete('cascade');
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');

            $table->string('shift_name', 20);     // 'morning', 'evening', 'night'
            $table->date('shift_date');
            
            $table->string('outgoing_nurse_name', 100);
            $table->string('incoming_nurse_name', 100)->nullable();
            
            $table->string('patient_condition', 30); // 'stable', 'critical', 'deteriorating', 'post_op', 'ventilated'
            $table->text('handover_notes');
            $table->text('critical_alerts')->nullable(); // e.g. "Strict NPO after midnight", "Check sugar 2-hourly"
            $table->text('pending_tasks')->nullable();   // e.g. "Collect morning blood culture", "Change central line dressing"
            
            $table->dateTime('acknowledged_at')->nullable();
            $table->timestamps();

            $table->index(['hospital_id', 'ward_id', 'shift_date', 'shift_name'], 'idx_handover_ward_shift');
            $table->index(['hospital_id', 'ipd_admission_id', 'shift_date'], 'idx_handover_adm_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ipd_shift_handovers');
    }
};
