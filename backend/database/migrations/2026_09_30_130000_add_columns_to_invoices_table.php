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
        Schema::table('invoices', function (Blueprint $table) {
            $table->foreignId('hospital_id')->after('id')->constrained('hospitals')->onDelete('cascade');
            $table->foreignId('patient_id')->after('hospital_id')->constrained('patients')->onDelete('cascade');
            $table->string('encounter_type', 20)->default('ipd')->after('patient_id'); // 'ipd', 'opd', 'emergency'
            $table->unsignedBigInteger('encounter_id')->nullable()->after('encounter_type'); // ipd_admissions.id or opd_visits.id
            $table->string('invoice_number', 50)->unique()->after('encounter_id');
            $table->dateTime('invoice_date')->after('invoice_number');

            // Financial Calculations
            $table->decimal('gross_amount', 12, 2)->default(0.00)->after('invoice_date');
            $table->decimal('discount_amount', 12, 2)->default(0.00)->after('gross_amount');
            $table->string('discount_reason', 255)->nullable()->after('discount_amount');
            $table->decimal('tax_amount', 12, 2)->default(0.00)->after('discount_reason');
            $table->decimal('net_amount', 12, 2)->default(0.00)->after('tax_amount');

            // Deductions & Settlements
            $table->decimal('advance_adjusted', 12, 2)->default(0.00)->after('net_amount');
            $table->decimal('insurance_approved_amount', 12, 2)->default(0.00)->after('advance_adjusted');
            $table->string('tpa_claim_number', 100)->nullable()->after('insurance_approved_amount');
            $table->string('insurance_company_name', 150)->nullable()->after('tpa_claim_number');
            $table->decimal('amount_paid', 12, 2)->default(0.00)->after('insurance_company_name');
            $table->decimal('balance_due', 12, 2)->default(0.00)->after('amount_paid');

            // Payment Details
            $table->string('payment_method', 50)->nullable()->after('balance_due'); // 'cash', 'card', 'upi', 'tpa_insurance', 'split'
            $table->json('payment_breakdown')->nullable()->after('payment_method');
            $table->string('payment_status', 30)->default('pending')->after('payment_breakdown'); // 'paid', 'partially_paid', 'pending', 'waived'
            $table->string('status', 30)->default('finalized')->after('payment_status'); // 'draft', 'finalized', 'cancelled'

            // Security Gate Pass
            $table->string('gate_pass_number', 50)->nullable()->unique()->after('status');
            $table->dateTime('gate_pass_issued_at')->nullable()->after('gate_pass_number');
            $table->foreignId('created_by_user_id')->nullable()->after('gate_pass_issued_at')->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable()->after('created_by_user_id');

            $table->index(['hospital_id', 'encounter_type', 'encounter_id'], 'idx_inv_hosp_enc');
            $table->index(['hospital_id', 'patient_id'], 'idx_inv_patient');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['hospital_id']);
            $table->dropForeign(['patient_id']);
            $table->dropForeign(['created_by_user_id']);
            $table->dropIndex('idx_inv_hosp_enc');
            $table->dropIndex('idx_inv_patient');

            $table->dropColumn([
                'hospital_id',
                'patient_id',
                'encounter_type',
                'encounter_id',
                'invoice_number',
                'invoice_date',
                'gross_amount',
                'discount_amount',
                'discount_reason',
                'tax_amount',
                'net_amount',
                'advance_adjusted',
                'insurance_approved_amount',
                'tpa_claim_number',
                'insurance_company_name',
                'amount_paid',
                'balance_due',
                'payment_method',
                'payment_breakdown',
                'payment_status',
                'status',
                'gate_pass_number',
                'gate_pass_issued_at',
                'created_by_user_id',
                'notes',
            ]);
        });
    }
};
