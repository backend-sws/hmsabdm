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
        Schema::create('billing_ledger_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->string('encounter_type', 30); // 'opd', 'ipd', 'emergency'
            $table->unsignedBigInteger('encounter_id'); // opd_visits.id or ipd_admissions.id
            $table->foreignId('charge_id')->nullable()->constrained('charges_master')->nullOnDelete();
            $table->string('category', 50); // 'bed_charges', 'doctor_fees', 'nursing_charges', etc.
            $table->string('item_name', 255);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('quantity', 8, 2)->default(1.0);
            $table->decimal('tax_amount', 10, 2)->default(0.00);
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2);
            $table->timestamp('charged_at')->useCurrent();
            $table->unsignedBigInteger('charged_by_user_id')->default(0); // 0 = system cron / auto
            $table->boolean('auto_generated')->default(false);
            $table->string('notes', 255)->nullable();
            $table->string('status', 30)->default('unbilled'); // 'unbilled', 'billed', 'cancelled', 'waived'
            $table->timestamps();

            $table->index(['hospital_id', 'patient_id']);
            $table->index(['hospital_id', 'encounter_type', 'encounter_id']);
            $table->index(['hospital_id', 'status']);
            $table->index(['charged_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('billing_ledger_items');
    }
};
