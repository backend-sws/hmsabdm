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
        Schema::create('ipd_nursing_procedures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ipd_admission_id')->constrained('ipd_admissions')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();

            $table->string('procedure_name', 150); // e.g. Wound Dressing (Minor), Nebulization
            $table->string('procedure_code', 50)->nullable(); // e.g. NURS-DRESS-MIN, NURS-NEBUL
            $table->timestamp('performed_at')->useCurrent();
            $table->unsignedBigInteger('performed_by_user_id')->default(0);
            $table->string('performed_by_name', 150)->nullable(); // Nurse name

            $table->text('notes')->nullable(); // Clinical notes regarding the procedure
            $table->decimal('charge_amount', 10, 2)->default(0.00);
            $table->foreignId('billing_ledger_item_id')->nullable()->constrained('billing_ledger_items')->nullOnDelete();

            $table->timestamps();

            $table->index(['hospital_id', 'ipd_admission_id', 'performed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ipd_nursing_procedures');
    }
};
