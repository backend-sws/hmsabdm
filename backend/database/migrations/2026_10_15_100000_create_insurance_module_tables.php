<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ──────────────────────────────────────────────────────────────────
        // 1. INSURANCE PAYERS MASTER
        //    (All TPAs, Insurance Companies, CGHS, ESIC, AB-PMJAY)
        // ──────────────────────────────────────────────────────────────────
        Schema::create('insurance_payers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->string('name', 200);
            $table->enum('payer_type', ['tpa', 'insurance_company', 'corporate', 'cghs', 'esic', 'pmjay', 'other'])->default('tpa');
            $table->string('code', 50)->nullable()->comment('Short code e.g. MEDASSIST, CGHS_DEL');
            $table->string('contact_person', 100)->nullable();
            $table->string('contact_phone', 20)->nullable();
            $table->string('contact_email', 150)->nullable();
            $table->string('portal_url', 300)->nullable();
            $table->string('api_endpoint', 300)->nullable()->comment('NHCX/TMS/payer API endpoint');
            $table->string('empanelment_number', 100)->nullable()->comment('Hospital empanelment/network ID');
            $table->string('empanelment_letter_path', 500)->nullable();
            $table->date('empanelment_valid_till')->nullable();
            $table->string('gst_number', 20)->nullable();
            $table->string('pan_number', 20)->nullable();
            $table->string('address', 500)->nullable();
            $table->decimal('default_copay_percent', 5, 2)->default(0)->comment('Default co-pay %');
            $table->decimal('default_deductible', 12, 2)->default(0);
            $table->integer('preauth_tat_hours')->default(4)->comment('Expected pre-auth TAT in hours');
            $table->integer('claim_settlement_days')->default(30)->comment('Expected settlement in days');
            $table->json('metadata')->nullable()->comment('Payer-specific config, API keys (encrypted)');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('hospital_id')->references('id')->on('hospitals')->onDelete('cascade');
            $table->unique(['hospital_id', 'code']);
        });

        // ──────────────────────────────────────────────────────────────────
        // 2. INSURANCE TARIFF PACKAGES
        //    (Per-payer negotiated rates overriding standard charge master)
        // ──────────────────────────────────────────────────────────────────
        Schema::create('insurance_tariff_packages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('payer_id')->index();
            $table->unsignedBigInteger('charge_master_id')->nullable()->index();
            $table->string('procedure_name', 200);
            $table->string('hbp_code', 50)->nullable()->comment('AB-PMJAY Health Benefit Package code');
            $table->string('cghs_code', 50)->nullable()->comment('CGHS Package code');
            $table->string('icd10_code', 20)->nullable();
            $table->enum('category', ['consultation', 'procedure', 'surgery', 'room', 'icu', 'lab', 'pharmacy', 'implant', 'other'])->default('procedure');
            $table->decimal('approved_rate', 14, 2)->comment('Payer-negotiated rate');
            $table->decimal('room_rent_cap_per_day', 10, 2)->nullable();
            $table->decimal('icu_cap_per_day', 10, 2)->nullable();
            $table->integer('max_los_days')->nullable()->comment('Maximum Length of Stay');
            $table->text('exclusions')->nullable();
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->boolean('requires_prior_approval')->default(false)->comment('For implants/high-cost devices');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('payer_id')->references('id')->on('insurance_payers')->onDelete('cascade');
        });

        // ──────────────────────────────────────────────────────────────────
        // 3. PATIENT INSURANCE DETAILS
        //    (Per-patient insurance card details, supports dual insurance)
        // ──────────────────────────────────────────────────────────────────
        Schema::create('patient_insurance_details', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('patient_id')->index();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->unsignedBigInteger('payer_id')->index();
            $table->string('policy_number', 100)->nullable();
            $table->string('member_id', 100)->nullable();
            $table->string('group_number', 100)->nullable()->comment('Corporate group policy number');
            $table->string('ayushman_id', 100)->nullable()->comment('AB-PMJAY Beneficiary ID');
            $table->string('abha_id', 50)->nullable();
            $table->string('esic_ip_number', 50)->nullable()->comment('ESIC Insured Person number');
            $table->string('cghs_beneficiary_number', 50)->nullable();
            $table->string('insured_name', 200)->nullable()->comment('Name on policy (may differ from patient)');
            $table->enum('relation_to_patient', ['self', 'spouse', 'child', 'parent', 'sibling', 'other'])->default('self');
            $table->decimal('sum_insured', 14, 2)->nullable();
            $table->decimal('sum_insured_remaining', 14, 2)->nullable()->comment('Available balance this policy year');
            $table->decimal('copay_percent', 5, 2)->default(0);
            $table->decimal('deductible', 12, 2)->default(0);
            $table->date('policy_start')->nullable();
            $table->date('policy_end')->nullable();
            $table->boolean('is_primary')->default(true)->comment('Primary or secondary (dual insurance)');
            $table->string('card_image_path', 500)->nullable();
            $table->string('policy_document_path', 500)->nullable();
            $table->enum('verification_status', ['pending', 'verified', 'failed', 'expired'])->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->text('verification_notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('hospital_id')->references('id')->on('hospitals')->onDelete('cascade');
            $table->foreign('payer_id')->references('id')->on('insurance_payers')->onDelete('cascade');
        });

        // ──────────────────────────────────────────────────────────────────
        // 4. INSURANCE PRE-AUTHORIZATIONS
        //    (Initial, Enhancement, Emergency pre-auths per admission)
        // ──────────────────────────────────────────────────────────────────
        Schema::create('insurance_preauths', function (Blueprint $table) {
            $table->id();
            $table->string('preauth_number', 30)->unique()->comment('Internal reference e.g. PA-2026-00001');
            $table->unsignedBigInteger('admission_id')->nullable()->index()->comment('IPD admission');
            $table->unsignedBigInteger('opd_visit_id')->nullable()->index()->comment('OPD visit (for OPD cashless)');
            $table->unsignedBigInteger('payer_id')->index();
            $table->unsignedBigInteger('patient_insurance_id')->index();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->enum('preauth_type', ['initial', 'enhancement', 'emergency'])->default('initial');
            $table->enum('status', ['draft', 'submitted', 'approved', 'queried', 'query_responded', 'denied', 'cancelled', 'expired'])->default('draft');
            $table->json('icd10_codes')->nullable()->comment('Array of ICD-10 diagnosis codes');
            $table->string('hbp_code', 50)->nullable()->comment('AB-PMJAY Health Benefit Package code');
            $table->string('cghs_package_code', 50)->nullable();
            $table->string('primary_diagnosis', 500)->nullable();
            $table->text('proposed_treatment')->nullable();
            $table->integer('estimated_los_days')->nullable()->comment('Estimated Length of Stay');
            $table->decimal('estimated_amount', 14, 2)->nullable();
            $table->decimal('room_rent_per_day', 10, 2)->nullable();
            // TPA Response Fields
            $table->string('tpa_preauth_number', 100)->nullable()->comment('Reference number from TPA');
            $table->decimal('approved_amount', 14, 2)->nullable();
            $table->decimal('approved_room_rent_cap', 10, 2)->nullable();
            $table->decimal('approved_icu_cap', 10, 2)->nullable();
            $table->integer('approved_los_days')->nullable();
            $table->date('valid_till')->nullable();
            $table->string('sanction_letter_path', 500)->nullable();
            $table->text('approval_remarks')->nullable();
            $table->string('denial_reason', 500)->nullable();
            // Query/Shortfall Flow
            $table->text('tpa_query')->nullable()->comment('Shortfall/query raised by TPA');
            $table->timestamp('query_raised_at')->nullable();
            $table->text('query_response')->nullable();
            $table->timestamp('query_responded_at')->nullable();
            $table->json('query_documents')->nullable()->comment('Paths to uploaded response docs');
            // Timeline
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('denied_at')->nullable();
            // Parent for Enhancement
            $table->unsignedBigInteger('parent_preauth_id')->nullable()->comment('Initial preauth for enhancements');
            // Audit
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('payer_id')->references('id')->on('insurance_payers');
            $table->foreign('patient_insurance_id')->references('id')->on('patient_insurance_details');
            $table->foreign('hospital_id')->references('id')->on('hospitals')->onDelete('cascade');
        });

        // ──────────────────────────────────────────────────────────────────
        // 5. INSURANCE CLAIMS
        //    (Post-discharge claim lifecycle)
        // ──────────────────────────────────────────────────────────────────
        Schema::create('insurance_claims', function (Blueprint $table) {
            $table->id();
            $table->string('claim_number', 30)->unique()->comment('Internal claim number e.g. CLM-2026-00001');
            $table->unsignedBigInteger('preauth_id')->nullable()->index();
            $table->unsignedBigInteger('admission_id')->nullable()->index();
            $table->unsignedBigInteger('opd_visit_id')->nullable()->index();
            $table->unsignedBigInteger('payer_id')->index();
            $table->unsignedBigInteger('patient_insurance_id')->index();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->enum('claim_type', ['cashless', 'reimbursement', 'corporate_billing'])->default('cashless');
            $table->enum('status', [
                'draft', 'submitted', 'under_review', 'additional_docs_needed',
                'approved', 'partially_approved', 'rejected', 'settled',
                'grievance_raised', 'grievance_resolved', 'resubmitted', 'written_off'
            ])->default('draft');
            // Amounts
            $table->decimal('total_bill_amount', 14, 2)->default(0);
            $table->decimal('claimed_amount', 14, 2)->default(0);
            $table->decimal('non_payable_amount', 14, 2)->default(0)->comment('IRDAI excluded consumables');
            $table->decimal('copay_amount', 14, 2)->default(0)->comment('Patient share');
            $table->decimal('deducted_amount', 14, 2)->default(0)->comment('TPA deductions');
            $table->decimal('approved_amount', 14, 2)->nullable();
            $table->decimal('settled_amount', 14, 2)->nullable();
            // Secondary Insurance (Dual COB)
            $table->unsignedBigInteger('secondary_claim_id')->nullable()->comment('Linked secondary insurance claim');
            $table->decimal('secondary_approved_amount', 14, 2)->nullable();
            // TPA References
            $table->string('tpa_claim_number', 100)->nullable();
            $table->string('nhcx_claim_id', 200)->nullable()->comment('NHCX exchange reference');
            $table->string('tms_transaction_id', 200)->nullable()->comment('PMJAY TMS reference');
            // Dates
            $table->date('submission_date')->nullable();
            $table->date('approval_date')->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->string('settlement_utr', 200)->nullable()->comment('Bank UTR/NEFT reference');
            // Rejection / Grievance
            $table->text('rejection_reason')->nullable();
            $table->integer('resubmission_count')->default(0);
            $table->text('resubmission_notes')->nullable();
            $table->timestamp('grievance_raised_at')->nullable();
            $table->text('grievance_notes')->nullable();
            $table->timestamp('grievance_resolved_at')->nullable();
            // Documents
            $table->json('documents')->nullable()->comment('Dossier document paths');
            // Audit
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('payer_id')->references('id')->on('insurance_payers');
            $table->foreign('patient_insurance_id')->references('id')->on('patient_insurance_details');
            $table->foreign('hospital_id')->references('id')->on('hospitals')->onDelete('cascade');
        });

        // ──────────────────────────────────────────────────────────────────
        // 6. IRDAI NON-PAYABLE ITEMS MASTER
        //    (Items that insurance cannot pay - consumables, toiletries etc.)
        // ──────────────────────────────────────────────────────────────────
        Schema::create('insurance_nonpayable_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->unsignedBigInteger('payer_id')->nullable()->index()->comment('NULL = applies to all payers');
            $table->unsignedBigInteger('charge_master_id')->nullable()->index();
            $table->string('item_name', 200);
            $table->string('item_code', 50)->nullable();
            $table->enum('category', ['consumable', 'toiletry', 'diet', 'administrative', 'cosmetic', 'other'])->default('consumable');
            $table->text('reason')->nullable()->comment('Why it is non-payable (IRDAI circular reference)');
            $table->string('irdai_circular', 100)->nullable()->comment('IRDAI circular number');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('hospital_id')->references('id')->on('hospitals')->onDelete('cascade');
        });

        // ──────────────────────────────────────────────────────────────────
        // 7. AR (ACCOUNTS RECEIVABLE) AGING LEDGER
        //    (Post-claim settlement tracking & aging)
        // ──────────────────────────────────────────────────────────────────
        Schema::create('insurance_ar_ledger', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('claim_id')->index();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->enum('event_type', [
                'claim_submitted', 'approved', 'partial_approval',
                'payment_received', 'deduction_applied', 'short_payment',
                'grievance_raised', 'resubmitted', 'written_off', 'settled'
            ]);
            $table->decimal('amount', 14, 2)->default(0);
            $table->decimal('running_outstanding', 14, 2)->default(0)->comment('Outstanding after this event');
            $table->date('event_date');
            $table->string('transaction_ref', 200)->nullable()->comment('UTR/bank ref/TPA ref');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('claim_id')->references('id')->on('insurance_claims')->onDelete('cascade');
            $table->foreign('hospital_id')->references('id')->on('hospitals')->onDelete('cascade');
        });

        // ──────────────────────────────────────────────────────────────────
        // 8. IMPLANT / HIGH-COST DEVICE PRIOR APPROVALS
        //    (Stents, prosthetics, cochlear implants, hip/knee implants)
        // ──────────────────────────────────────────────────────────────────
        Schema::create('insurance_implant_approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('preauth_id')->nullable()->index();
            $table->unsignedBigInteger('admission_id')->nullable()->index();
            $table->unsignedBigInteger('payer_id')->index();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->string('device_name', 200);
            $table->string('brand_model', 200)->nullable();
            $table->string('barcode_serial', 100)->nullable();
            $table->string('manufacturer', 200)->nullable();
            $table->decimal('device_cost', 12, 2);
            $table->enum('status', ['pending', 'approved', 'denied', 'not_required'])->default('pending');
            $table->string('approval_reference', 100)->nullable();
            $table->text('denial_reason')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->string('invoice_path', 500)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('payer_id')->references('id')->on('insurance_payers');
            $table->foreign('hospital_id')->references('id')->on('hospitals')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insurance_implant_approvals');
        Schema::dropIfExists('insurance_ar_ledger');
        Schema::dropIfExists('insurance_nonpayable_items');
        Schema::dropIfExists('insurance_claims');
        Schema::dropIfExists('insurance_preauths');
        Schema::dropIfExists('patient_insurance_details');
        Schema::dropIfExists('insurance_tariff_packages');
        Schema::dropIfExists('insurance_payers');
    }
};
