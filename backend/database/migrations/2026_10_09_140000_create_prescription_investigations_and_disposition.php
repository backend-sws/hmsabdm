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
        // 1. Add disposition and admission recommendation fields to prescriptions
        Schema::table('prescriptions', function (Blueprint $table) {
            if (!Schema::hasColumn('prescriptions', 'disposition')) {
                $table->string('disposition', 30)->default('home')->after('follow_up_date'); // 'home', 'day_care', 'admit_ipd'
            }
            if (!Schema::hasColumn('prescriptions', 'disposition_notes')) {
                $table->text('disposition_notes')->nullable()->after('disposition');
            }
            if (!Schema::hasColumn('prescriptions', 'admit_priority')) {
                $table->string('admit_priority', 20)->nullable()->after('disposition_notes'); // 'routine', 'urgent', 'stat'
            }
            if (!Schema::hasColumn('prescriptions', 'recommended_ward')) {
                $table->string('recommended_ward', 50)->nullable()->after('admit_priority');
            }
        });

        // 2. Create prescription_investigations table for Pathology & Radiology orders
        Schema::create('prescription_investigations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('prescription_id')->constrained('prescriptions')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->string('test_name', 255);
            $table->string('test_code', 50)->nullable();
            $table->string('category', 50)->default('Pathology'); // 'Pathology', 'Radiology', 'Cardiology', 'Other'
            $table->string('urgency', 20)->default('Routine'); // 'Routine', 'Urgent', 'STAT'
            $table->decimal('standard_rate', 10, 2)->nullable();
            $table->string('clinical_indication', 255)->nullable();
            $table->string('status', 30)->default('ordered'); // 'ordered', 'billed', 'sample_collected', 'in_progress', 'completed', 'cancelled'
            $table->foreignId('billed_invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->timestamps();

            $table->index(['hospital_id', 'prescription_id']);
            $table->index(['hospital_id', 'patient_id']);
            $table->index(['hospital_id', 'status']);
            $table->index(['hospital_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescription_investigations');

        Schema::table('prescriptions', function (Blueprint $table) {
            $columns = ['disposition', 'disposition_notes', 'admit_priority', 'recommended_ward'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('prescriptions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
