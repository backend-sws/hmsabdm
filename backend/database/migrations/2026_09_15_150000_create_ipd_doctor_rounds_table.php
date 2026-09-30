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
        Schema::create('ipd_doctor_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ipd_admission_id')->constrained('ipd_admissions')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();

            $table->date('round_date');
            $table->time('round_time')->nullable();
            $table->string('round_type', 40)->default('routine'); // routine, specialist_call, emergency, night_round

            // SOAP Clinical Note
            $table->text('subjective')->nullable(); // Patient complaints, symptoms
            $table->text('objective')->nullable();  // Physical examination, systemic findings
            $table->text('assessment')->nullable(); // Clinical assessment / progress
            $table->text('plan')->nullable();       // Clinical treatment & investigation plan

            $table->string('diet_advice', 100)->nullable(); // normal, liquid, soft, diabetic, renal, npo
            $table->string('clinical_condition', 40)->default('stable'); // improving, stable, deteriorating, critical
            $table->boolean('is_discharge_planned')->default(false);
            $table->date('planned_discharge_date')->nullable();

            $table->decimal('fee_charged', 10, 2)->default(0.00);
            $table->foreignId('billing_ledger_item_id')->nullable()->constrained('billing_ledger_items')->nullOnDelete();
            $table->unsignedBigInteger('created_by_user_id')->default(0);

            $table->timestamps();

            $table->index(['hospital_id', 'ipd_admission_id', 'round_date']);
            $table->index(['hospital_id', 'doctor_id', 'round_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ipd_doctor_rounds');
    }
};
