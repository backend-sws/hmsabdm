<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for the complete Laboratory Information System (LIS).
     */
    public function up(): void
    {
        // Drop any previous stub or partial tables safely
        Schema::dropIfExists('lab_test_results');
        Schema::dropIfExists('lab_order_items');
        Schema::dropIfExists('lab_orders');
        Schema::dropIfExists('lab_parameter_reference_ranges');
        Schema::dropIfExists('lab_parameters');
        Schema::dropIfExists('lab_test_templates');
        Schema::dropIfExists('lab_departments');

        // 1. Lab Departments (Biochemistry, Haematology, Clinical Pathology, Microbiology, etc.)
        Schema::create('lab_departments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('code', 50)->nullable();
            $table->boolean('is_system')->default(true);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['hospital_id', 'is_active']);
        });

        // 2. Lab Test Templates (Master Test catalog with method, sample type, vial, pricing, interpretation)
        Schema::create('lab_test_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('lab_departments')->nullOnDelete();
            $table->string('category', 100)->default('Biochemistry');
            $table->string('test_code', 100)->index();
            $table->string('test_name', 255);
            $table->text('description')->nullable();
            $table->longText('interpretation')->nullable();
            $table->string('sample_type', 100)->nullable(); // 'EDTA Blood', 'Serum', 'Urine', etc.
            $table->string('container_color', 50)->nullable(); // 'Lavender/EDTA', 'Red/Plain', 'Yellow/SST', 'Grey/Fluoride'
            $table->string('method', 150)->nullable(); // 'Hexokinase', 'IFCC', 'Diazo', etc.
            $table->integer('tat_hours')->default(24);
            $table->decimal('standard_price', 10, 2)->default(0.00);
            $table->string('loinc_code', 50)->nullable();
            $table->boolean('is_panel')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['hospital_id', 'category']);
            $table->index(['hospital_id', 'is_active']);
        });

        // 3. Lab Parameters (Individual parameters within a test template, including formula calculations)
        Schema::create('lab_parameters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('test_template_id')->constrained('lab_test_templates')->cascadeOnDelete();
            $table->string('name', 255);
            $table->string('short_code', 50)->nullable(); // Token used in formulas: e.g. TBIL, DBIL, ALB, TP, GLOB
            $table->string('unit', 50)->nullable(); // e.g. mg/dL, g/dL, U/L, %, /cumm
            $table->string('input_type', 50)->default('numeric'); // 'numeric', 'calculated', 'selection', 'text', 'textarea', 'heading'
            $table->string('method', 150)->nullable();
            $table->json('options')->nullable(); // Selection dropdown options e.g. ["Negative", "Positive"]
            $table->boolean('is_calculated')->default(false);
            $table->string('formula', 255)->nullable(); // e.g. '{TBIL} - {DBIL}', '{TP} - {ALB}'
            $table->string('range_type', 50)->default('flexible'); // 'flexible', 'numeric', 'text'
            $table->integer('display_order')->default(0);
            $table->boolean('is_mandatory')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['test_template_id', 'display_order']);
            $table->index(['test_template_id', 'short_code']);
        });

        // 4. Lab Parameter Reference Ranges (Age & gender specific biological intervals & panic thresholds)
        Schema::create('lab_parameter_reference_ranges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parameter_id')->constrained('lab_parameters')->cascadeOnDelete();
            $table->string('gender', 20)->default('Both'); // 'Both', 'Male', 'Female'
            $table->integer('age_min')->default(0);
            $table->integer('age_max')->default(120);
            $table->string('age_unit', 20)->default('Years'); // 'Years', 'Months', 'Days'
            $table->decimal('min_val', 12, 4)->nullable();
            $table->decimal('max_val', 12, 4)->nullable();
            $table->decimal('panic_min', 12, 4)->nullable(); // Critical low panic alert threshold
            $table->decimal('panic_max', 12, 4)->nullable(); // Critical high panic alert threshold
            $table->string('normal_value', 100)->nullable(); // For qualitative ranges: 'Negative', 'Not Detected'
            $table->string('display_range', 255)->nullable(); // e.g. '0.1 - 1.2', '13.0 - 17.0', '< 150 (Desirable)'
            $table->text('interpretation_notes')->nullable();
            $table->timestamps();

            $table->index(['parameter_id', 'gender']);
        });

        // 5. Lab Orders (The order header linked to patient, doctor, prescription, and invoice)
        Schema::create('lab_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('prescription_id')->nullable()->constrained('prescriptions')->nullOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->string('order_number', 50)->unique(); // e.g. 'LAB-ORD-20261010-0001'
            $table->string('sample_accession_number', 50)->nullable()->index(); // Barcode: e.g. 'SMP-20261010-0001'
            $table->string('urgency', 20)->default('Routine'); // 'Routine', 'Urgent', 'STAT'
            $table->string('order_type', 30)->default('OPD'); // 'OPD', 'IPD', 'Emergency', 'External'
            $table->string('status', 30)->default('pending_sample'); // 'pending_sample', 'sample_collected', 'in_progress', 'completed', 'authorized', 'cancelled'
            
            // Phlebotomy / Sample tracking
            $table->timestamp('sample_collected_at')->nullable();
            $table->foreignId('sample_collected_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('sample_notes', 255)->nullable();
            
            // Result entry tracking
            $table->timestamp('result_entered_at')->nullable();
            $table->foreignId('result_entered_by_user_id')->nullable()->constrained('users')->nullOnDelete();

            // Pathologist validation / sign-off
            $table->timestamp('authorized_at')->nullable();
            $table->foreignId('authorized_by_doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->text('authorization_notes')->nullable();
            $table->text('clinical_notes')->nullable();
            $table->timestamps();

            $table->index(['hospital_id', 'status']);
            $table->index(['hospital_id', 'patient_id']);
            $table->index(['hospital_id', 'created_at']);
        });

        // 6. Lab Order Items (Individual test panels in an order)
        Schema::create('lab_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('lab_orders')->cascadeOnDelete();
            $table->foreignId('prescription_investigation_id')->nullable()->constrained('prescription_investigations')->nullOnDelete();
            $table->foreignId('test_template_id')->nullable()->constrained('lab_test_templates')->nullOnDelete();
            $table->string('test_name', 255);
            $table->string('test_code', 100)->nullable();
            $table->string('category', 100)->nullable();
            $table->decimal('rate', 10, 2)->default(0.00);
            $table->string('status', 30)->default('pending_sample'); // 'pending_sample', 'sample_collected', 'in_progress', 'completed', 'authorized', 'cancelled'
            $table->text('technician_remarks')->nullable();
            $table->text('pathologist_remarks')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index(['hospital_id', 'status']);
        });

        // 7. Lab Test Results (Observed and calculated parameter values)
        Schema::create('lab_test_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained('lab_order_items')->cascadeOnDelete();
            $table->foreignId('parameter_id')->nullable()->constrained('lab_parameters')->nullOnDelete();
            $table->string('parameter_name', 255);
            $table->string('short_code', 50)->nullable();
            $table->string('unit', 50)->nullable();
            $table->string('method', 150)->nullable();
            $table->text('observed_value')->nullable(); // Raw value (numeric string or qualitative text)
            $table->decimal('numeric_value', 12, 4)->nullable(); // Numeric value for calculations & delta check
            $table->string('flag', 20)->default('normal'); // 'normal', 'low', 'high', 'panic_low', 'panic_high', 'abnormal'
            $table->string('reference_range_text', 255)->nullable(); // Snapshot of display range
            $table->boolean('is_calculated')->default(false);
            $table->string('formula_used', 255)->nullable();
            $table->integer('display_order')->default(0);
            $table->timestamps();

            $table->index(['order_item_id']);
            $table->index(['hospital_id', 'flag']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lab_test_results');
        Schema::dropIfExists('lab_order_items');
        Schema::dropIfExists('lab_orders');
        Schema::dropIfExists('lab_parameter_reference_ranges');
        Schema::dropIfExists('lab_parameters');
        Schema::dropIfExists('lab_test_templates');
        Schema::dropIfExists('lab_departments');
    }
};
