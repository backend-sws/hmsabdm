<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Enterprise Hospital Pharmacy & Inventory Management System.
     */
    public function up(): void
    {
        // Safely drop any legacy stub tables
        Schema::dropIfExists('pharmacy_supplier_payments');
        Schema::dropIfExists('pharmacy_return_items');
        Schema::dropIfExists('pharmacy_returns');
        Schema::dropIfExists('pharmacy_sale_items');
        Schema::dropIfExists('pharmacy_sales');
        Schema::dropIfExists('pharmacy_purchase_items');
        Schema::dropIfExists('pharmacy_purchases');
        Schema::dropIfExists('stock_transactions');
        Schema::dropIfExists('pharmacy_batches');
        Schema::dropIfExists('pharmacy_suppliers');
        Schema::dropIfExists('hospital_medicines');
        Schema::dropIfExists('pharmacy_orders');
        Schema::dropIfExists('medicines');

        // 1. Hospital Active Formulary / Medicine Catalog
        Schema::create('hospital_medicines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('master_medicine_id')->nullable()->constrained('medicines_master')->nullOnDelete();
            $table->string('item_code', 50)->nullable()->index();
            $table->string('brand_name', 255)->index();
            $table->string('generic_name', 255)->nullable()->index();
            $table->string('dosage_form', 50)->default('Tablet')->index(); // Tablet, Capsule, Syrup, Injection, IV Fluid, etc.
            $table->string('strength', 100)->nullable();
            $table->string('manufacturer', 255)->nullable();
            $table->decimal('default_purchase_price', 10, 2)->default(0.00);
            $table->decimal('default_selling_price', 10, 2)->default(0.00);
            $table->decimal('mrp', 10, 2)->default(0.00);
            $table->string('hsn_code', 20)->default('3004');
            $table->decimal('gst_rate', 5, 2)->default(12.00); // 0, 5, 12, 18
            $table->string('rack_location', 100)->nullable();
            $table->integer('min_reorder_level')->default(20);
            $table->integer('max_stock_level')->nullable();
            $table->string('prescription_type', 30)->default('SCHEDULE_H'); // OTC, SCHEDULE_H, SCHEDULE_H1, NARCOTIC
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['hospital_id', 'is_active']);
            $table->index(['hospital_id', 'brand_name']);
        });

        // 2. Pharmacy Suppliers / Vendor Master
        Schema::create('pharmacy_suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('supplier_name', 255)->index();
            $table->string('contact_person', 150)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('gstin', 20)->nullable()->index();
            $table->string('drug_license_no', 100)->nullable(); // Form 20B/21B
            $table->string('pan_no', 20)->nullable();
            $table->text('address')->nullable();
            $table->integer('credit_days')->default(30);
            $table->decimal('credit_limit', 12, 2)->default(0.00);
            $table->decimal('opening_balance', 12, 2)->default(0.00);
            $table->string('bank_name', 150)->nullable();
            $table->string('bank_account_no', 50)->nullable();
            $table->string('bank_ifsc', 20)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['hospital_id', 'is_active']);
        });

        // 3. Live Batch Inventory (FEFO Tracking)
        Schema::create('pharmacy_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('hospital_medicine_id')->constrained('hospital_medicines')->cascadeOnDelete();
            $table->string('batch_number', 100)->index();
            $table->date('mfg_date')->nullable();
            $table->date('expiry_date')->index();
            $table->decimal('purchase_rate', 10, 2)->default(0.00);
            $table->decimal('mrp', 10, 2)->default(0.00);
            $table->decimal('selling_price', 10, 2)->default(0.00);
            $table->integer('available_quantity')->default(0)->index();
            $table->integer('reserved_quantity')->default(0);
            $table->string('rack_location', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['hospital_id', 'hospital_medicine_id', 'is_active']);
            $table->index(['hospital_id', 'expiry_date']);
        });

        // 4. Pharmacy Purchase / Inward GRN Header
        Schema::create('pharmacy_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('pharmacy_suppliers')->cascadeOnDelete();
            $table->string('grn_number', 50)->unique();
            $table->string('supplier_invoice_no', 100)->index();
            $table->date('invoice_date');
            $table->date('received_date');
            $table->decimal('subtotal_amount', 12, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('taxable_amount', 12, 2)->default(0.00);
            $table->decimal('cgst_amount', 12, 2)->default(0.00);
            $table->decimal('sgst_amount', 12, 2)->default(0.00);
            $table->decimal('igst_amount', 12, 2)->default(0.00);
            $table->decimal('round_off', 6, 2)->default(0.00);
            $table->decimal('net_amount', 12, 2)->default(0.00);
            $table->string('payment_status', 20)->default('UNPAID'); // UNPAID, PARTIAL, PAID
            $table->decimal('paid_amount', 12, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->foreignId('received_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['hospital_id', 'received_date']);
            $table->index(['hospital_id', 'supplier_id']);
        });

        // 5. Pharmacy Purchase Line Items
        Schema::create('pharmacy_purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained('pharmacy_purchases')->cascadeOnDelete();
            $table->foreignId('hospital_medicine_id')->constrained('hospital_medicines')->cascadeOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('pharmacy_batches')->nullOnDelete();
            $table->string('batch_number', 100);
            $table->date('mfg_date')->nullable();
            $table->date('expiry_date');
            $table->integer('pack_size')->default(1);
            $table->integer('pack_quantity')->default(1);
            $table->integer('free_pack_quantity')->default(0);
            $table->integer('total_unit_quantity')->default(1);
            $table->decimal('purchase_rate_per_unit', 10, 2)->default(0.00);
            $table->decimal('discount_percent', 5, 2)->default(0.00);
            $table->decimal('gst_rate', 5, 2)->default(12.00);
            $table->decimal('unit_mrp', 10, 2)->default(0.00);
            $table->decimal('selling_price_per_unit', 10, 2)->default(0.00);
            $table->decimal('taxable_amount', 12, 2)->default(0.00);
            $table->decimal('cgst_amount', 12, 2)->default(0.00);
            $table->decimal('sgst_amount', 12, 2)->default(0.00);
            $table->decimal('total_amount', 12, 2)->default(0.00);
            $table->timestamps();

            $table->index(['purchase_id', 'hospital_medicine_id']);
        });

        // 6. Pharmacy Sales / POS Billing Invoices Header
        Schema::create('pharmacy_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('invoice_number', 50)->unique();
            $table->string('sale_type', 20)->default('WALK_IN'); // WALK_IN, OPD, IPD, EMERGENCY
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
            $table->foreignId('opd_visit_id')->nullable()->constrained('opd_visits')->nullOnDelete();
            $table->foreignId('ipd_admission_id')->nullable()->constrained('ipd_admissions')->nullOnDelete();
            $table->foreignId('prescription_id')->nullable()->constrained('prescriptions')->nullOnDelete();
            $table->string('customer_name', 150);
            $table->string('customer_phone', 20)->nullable();
            $table->string('doctor_name', 150)->nullable(); // Required for Schedule H/H1
            $table->decimal('subtotal_amount', 12, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('taxable_amount', 12, 2)->default(0.00);
            $table->decimal('cgst_amount', 12, 2)->default(0.00);
            $table->decimal('sgst_amount', 12, 2)->default(0.00);
            $table->decimal('round_off', 6, 2)->default(0.00);
            $table->decimal('net_amount', 12, 2)->default(0.00);
            $table->string('payment_mode', 30)->default('CASH'); // CASH, UPI, CARD, SPLIT, IPD_LEDGER
            $table->json('payment_details')->nullable(); // For split payments {cash: 200, upi: 300}
            $table->string('payment_status', 30)->default('PAID'); // PAID, CHARGED_TO_IPD, REFUNDED, PARTIALLY_REFUNDED
            $table->text('notes')->nullable();
            $table->foreignId('billed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['hospital_id', 'created_at']);
            $table->index(['hospital_id', 'sale_type']);
            $table->index(['hospital_id', 'patient_id']);
        });

        // 7. Pharmacy Sold Line Items
        Schema::create('pharmacy_sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('pharmacy_sales')->cascadeOnDelete();
            $table->foreignId('hospital_medicine_id')->constrained('hospital_medicines')->cascadeOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('pharmacy_batches')->nullOnDelete();
            $table->string('batch_number', 100);
            $table->date('expiry_date');
            $table->string('hsn_code', 20)->default('3004');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_mrp', 10, 2)->default(0.00);
            $table->decimal('unit_price', 10, 2)->default(0.00);
            $table->decimal('discount_percent', 5, 2)->default(0.00);
            $table->decimal('taxable_amount', 10, 2)->default(0.00);
            $table->decimal('gst_rate', 5, 2)->default(12.00);
            $table->decimal('cgst_amount', 10, 2)->default(0.00);
            $table->decimal('sgst_amount', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2)->default(0.00);
            $table->integer('returned_quantity')->default(0);
            $table->timestamps();

            $table->index(['sale_id', 'hospital_medicine_id']);
        });

        // 8. Pharmacy Customer Returns / Credit Notes
        Schema::create('pharmacy_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('credit_note_number', 50)->unique();
            $table->foreignId('sale_id')->constrained('pharmacy_sales')->cascadeOnDelete();
            $table->string('customer_name', 150);
            $table->string('customer_phone', 20)->nullable();
            $table->text('return_reason')->nullable();
            $table->decimal('refund_amount', 12, 2)->default(0.00);
            $table->string('refund_mode', 30)->default('CASH'); // CASH, UPI, IPD_DEDUCTION
            $table->foreignId('processed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['hospital_id', 'created_at']);
        });

        // 9. Pharmacy Returned Line Items
        Schema::create('pharmacy_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_id')->constrained('pharmacy_returns')->cascadeOnDelete();
            $table->foreignId('sale_item_id')->constrained('pharmacy_sale_items')->cascadeOnDelete();
            $table->foreignId('hospital_medicine_id')->constrained('hospital_medicines')->cascadeOnDelete();
            $table->foreignId('batch_id')->constrained('pharmacy_batches')->cascadeOnDelete();
            $table->integer('quantity_returned')->default(1);
            $table->decimal('unit_price', 10, 2)->default(0.00);
            $table->decimal('taxable_amount_reversed', 10, 2)->default(0.00);
            $table->decimal('cgst_reversed', 10, 2)->default(0.00);
            $table->decimal('sgst_reversed', 10, 2)->default(0.00);
            $table->decimal('net_refund_amount', 10, 2)->default(0.00);
            $table->timestamps();
        });

        // 10. Immutable Stock Audit Transactions
        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('hospital_medicine_id')->constrained('hospital_medicines')->cascadeOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('pharmacy_batches')->nullOnDelete();
            $table->string('transaction_type', 30)->index(); // PURCHASE_INWARD, SALE_DISPENSE, SALES_RETURN, PURCHASE_RETURN, STOCK_ADJUSTMENT, EXPIRED_DISPOSAL
            $table->integer('quantity_in')->default(0);
            $table->integer('quantity_out')->default(0);
            $table->integer('balance_after')->default(0);
            $table->string('reference_id', 100)->nullable()->index(); // GRN, INV, CR #
            $table->text('notes')->nullable();
            $table->foreignId('performed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['hospital_id', 'created_at']);
            $table->index(['hospital_id', 'hospital_medicine_id']);
        });

        // 11. Pharmacy Supplier Payments / Ledger Vouchers
        Schema::create('pharmacy_supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('pharmacy_suppliers')->cascadeOnDelete();
            $table->foreignId('purchase_id')->nullable()->constrained('pharmacy_purchases')->nullOnDelete();
            $table->string('payment_number', 50)->unique();
            $table->date('payment_date');
            $table->decimal('amount', 12, 2);
            $table->decimal('tds_amount', 10, 2)->default(0.00);
            $table->string('payment_mode', 30)->default('NEFT_RTGS'); // NEFT_RTGS, CHEQUE, UPI, CASH
            $table->string('reference_number', 100)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('paid_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['hospital_id', 'supplier_id']);
            $table->index(['hospital_id', 'payment_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pharmacy_supplier_payments');
        Schema::dropIfExists('stock_transactions');
        Schema::dropIfExists('pharmacy_return_items');
        Schema::dropIfExists('pharmacy_returns');
        Schema::dropIfExists('pharmacy_sale_items');
        Schema::dropIfExists('pharmacy_sales');
        Schema::dropIfExists('pharmacy_purchase_items');
        Schema::dropIfExists('pharmacy_purchases');
        Schema::dropIfExists('pharmacy_batches');
        Schema::dropIfExists('pharmacy_suppliers');
        Schema::dropIfExists('hospital_medicines');
    }
};
