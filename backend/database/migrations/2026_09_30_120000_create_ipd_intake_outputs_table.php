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
        Schema::create('ipd_intake_outputs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained('hospitals')->onDelete('cascade');
            $table->foreignId('ipd_admission_id')->constrained('ipd_admissions')->onDelete('cascade');
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            
            $table->string('entry_type', 20); // 'intake', 'output'
            $table->string('category', 50);    // intake: 'iv_fluid', 'oral', 'rt_feed', 'blood_product', 'tpn', 'other'
                                               // output: 'urine', 'rt_aspirate', 'surgical_drain', 'vomitus', 'stool', 'blood_loss', 'other'
            $table->string('item_name', 150);  // e.g. "DNS 500ml", "Packed Red Blood Cells (PRBC)", "Foley Urine", "Abdominal Drain"
            $table->decimal('quantity_ml', 8, 2); // e.g. 500.00, 250.00, 60.00
            $table->string('route', 50)->nullable(); // 'iv', 'oral', 'ng_tube', 'foley', 'drain_left', 'drain_right'
            
            $table->dateTime('recorded_at');
            $table->foreignId('recorded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('recorded_by_name', 100);
            $table->text('remarks')->nullable();
            
            $table->timestamps();

            $table->index(['hospital_id', 'ipd_admission_id', 'recorded_at'], 'idx_io_adm_recorded');
            $table->index(['hospital_id', 'patient_id', 'entry_type'], 'idx_io_patient_entry');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ipd_intake_outputs');
    }
};
