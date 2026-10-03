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
        Schema::create('ipd_mar_administrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained('hospitals')->onDelete('cascade');
            $table->foreignId('ipd_admission_id')->constrained('ipd_admissions')->onDelete('cascade');
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('prescription_item_id')->nullable()->constrained('prescription_items')->nullOnDelete();

            $table->string('medicine_name', 200);
            $table->string('dosage', 100);
            $table->string('route', 50);          // 'iv', 'im', 'oral', 'sc', 'inhalation', 'topical'
            $table->dateTime('scheduled_at')->nullable();
            $table->dateTime('administered_at');
            
            $table->foreignId('administered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('administered_by_name', 100);
            
            $table->string('status', 30);         // 'given', 'omitted', 'refused', 'held', 'vomited'
            $table->string('omission_reason', 255)->nullable();
            $table->string('batch_number', 100)->nullable();
            $table->text('notes')->nullable();

            // Optional auto-billing ledger link
            $table->foreignId('billing_ledger_item_id')->nullable()->constrained('billing_ledger_items')->nullOnDelete();

            $table->timestamps();

            $table->index(['hospital_id', 'ipd_admission_id', 'administered_at'], 'idx_mar_adm_date');
            $table->index(['hospital_id', 'prescription_item_id'], 'idx_mar_rx_item');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ipd_mar_administrations');
    }
};
