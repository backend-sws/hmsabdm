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
        // 1. IPD Nursing Ward Drug Indents & Requisitions
        if (!Schema::hasTable('pharmacy_ward_indents')) {
            Schema::create('pharmacy_ward_indents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
                $table->string('indent_number', 50)->index();
                $table->foreignId('ipd_admission_id')->constrained('ipd_admissions')->cascadeOnDelete();
                $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
                $table->string('ward_name', 100)->nullable();
                $table->string('bed_number', 50)->nullable();
                $table->string('priority', 20)->default('ROUTINE'); // ROUTINE, URGENT, STAT
                $table->string('status', 30)->default('PENDING'); // PENDING, DISPENSED, PARTIALLY_DISPENSED, REJECTED, RETURNED
                $table->foreignId('requested_by_user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('dispensed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('dispensed_at')->nullable();
                $table->text('notes')->nullable();
                $table->string('rejection_reason', 255)->nullable();
                $table->decimal('total_taxable', 12, 2)->default(0.00);
                $table->decimal('total_tax', 12, 2)->default(0.00);
                $table->decimal('total_amount', 12, 2)->default(0.00);
                $table->timestamps();

                $table->index(['hospital_id', 'status']);
                $table->index(['hospital_id', 'ipd_admission_id']);
                $table->index(['hospital_id', 'created_at']);
            });
        }

        // 2. IPD Nursing Ward Drug Indent Line Items
        if (!Schema::hasTable('pharmacy_ward_indent_items')) {
            Schema::create('pharmacy_ward_indent_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('ward_indent_id')->constrained('pharmacy_ward_indents')->cascadeOnDelete();
                $table->foreignId('hospital_medicine_id')->constrained('hospital_medicines')->cascadeOnDelete();
                $table->foreignId('batch_id')->nullable()->constrained('pharmacy_batches')->nullOnDelete();
                $table->integer('requested_quantity')->default(1);
                $table->integer('dispensed_quantity')->default(0);
                $table->integer('returned_quantity')->default(0);
                $table->decimal('unit_price', 10, 2)->default(0.00);
                $table->decimal('gst_rate', 5, 2)->default(0.00);
                $table->decimal('taxable_amount', 10, 2)->default(0.00);
                $table->decimal('tax_amount', 10, 2)->default(0.00);
                $table->decimal('total_amount', 10, 2)->default(0.00);
                $table->string('dosage_instruction', 255)->nullable();
                $table->foreignId('billing_ledger_item_id')->nullable()->constrained('billing_ledger_items')->nullOnDelete();
                $table->string('status', 30)->default('PENDING'); // PENDING, DISPENSED, REJECTED, RETURNED
                $table->timestamps();

                $table->index(['ward_indent_id', 'status']);
            });
        }

        // 3. Pharmacy Purchase Orders (PO)
        if (!Schema::hasTable('pharmacy_purchase_orders')) {
            Schema::create('pharmacy_purchase_orders', function (Blueprint $table) {
                $table->id();
                $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
                $table->string('po_number', 50)->index();
                $table->foreignId('supplier_id')->constrained('pharmacy_suppliers')->cascadeOnDelete();
                $table->date('po_date');
                $table->date('expected_delivery_date')->nullable();
                $table->string('status', 30)->default('ORDERED'); // DRAFT, ORDERED, PARTIALLY_RECEIVED, COMPLETED, CANCELLED
                $table->integer('total_items_count')->default(0);
                $table->decimal('subtotal_amount', 12, 2)->default(0.00);
                $table->decimal('discount_amount', 12, 2)->default(0.00);
                $table->decimal('taxable_amount', 12, 2)->default(0.00);
                $table->decimal('tax_amount', 12, 2)->default(0.00);
                $table->decimal('net_amount', 12, 2)->default(0.00);
                $table->text('notes')->nullable();
                $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['hospital_id', 'status']);
                $table->index(['hospital_id', 'supplier_id']);
                $table->index(['hospital_id', 'po_date']);
            });
        }

        // 4. Pharmacy Purchase Order Line Items
        if (!Schema::hasTable('pharmacy_purchase_order_items')) {
            Schema::create('pharmacy_purchase_order_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('purchase_order_id')->constrained('pharmacy_purchase_orders')->cascadeOnDelete();
                $table->foreignId('hospital_medicine_id')->constrained('hospital_medicines')->cascadeOnDelete();
                $table->integer('pack_quantity')->default(1);
                $table->integer('strip_size')->default(1);
                $table->integer('pack_size')->default(1);
                $table->integer('total_loose_units')->default(1);
                $table->decimal('pack_purchase_rate', 10, 2)->default(0.00);
                $table->decimal('unit_purchase_price', 10, 2)->default(0.00);
                $table->decimal('discount_percent', 5, 2)->default(0.00);
                $table->decimal('gst_rate', 5, 2)->default(0.00);
                $table->decimal('taxable_amount', 12, 2)->default(0.00);
                $table->decimal('cgst_amount', 12, 2)->default(0.00);
                $table->decimal('sgst_amount', 12, 2)->default(0.00);
                $table->decimal('total_amount', 12, 2)->default(0.00);
                $table->integer('received_quantity')->default(0);
                $table->string('status', 30)->default('PENDING'); // PENDING, PARTIALLY_RECEIVED, COMPLETED, CANCELLED
                $table->timestamps();

                $table->index(['purchase_order_id', 'status']);
            });
        }

        // 5. Link Pharmacy Purchase (GRN) to Purchase Order
        if (Schema::hasTable('pharmacy_purchases') && !Schema::hasColumn('pharmacy_purchases', 'purchase_order_id')) {
            Schema::table('pharmacy_purchases', function (Blueprint $table) {
                $table->foreignId('purchase_order_id')->nullable()->after('supplier_id')->constrained('pharmacy_purchase_orders')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('pharmacy_purchases') && Schema::hasColumn('pharmacy_purchases', 'purchase_order_id')) {
            Schema::table('pharmacy_purchases', function (Blueprint $table) {
                $table->dropForeign(['purchase_order_id']);
                $table->dropColumn('purchase_order_id');
            });
        }

        Schema::dropIfExists('pharmacy_purchase_order_items');
        Schema::dropIfExists('pharmacy_purchase_orders');
        Schema::dropIfExists('pharmacy_ward_indent_items');
        Schema::dropIfExists('pharmacy_ward_indents');
    }
};
