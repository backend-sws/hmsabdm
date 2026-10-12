<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 1+2+3: Packaging Config, Expiry Status, Supplier Return (RTV) Tables.
     */
    public function up(): void
    {
        // Phase 1: Add packaging / strip-size columns to hospital_medicines
        Schema::table('hospital_medicines', function (Blueprint $table) {
            $table->unsignedSmallInteger('strip_size')->default(10)->after('max_stock_level')
                  ->comment('Units per strip/primary pack (e.g. 10 tabs/strip)');
            $table->unsignedSmallInteger('box_size')->default(1)->after('strip_size')
                  ->comment('Strips per box (1 if sold per strip only)');
            $table->string('base_unit', 30)->default('Tab')->after('box_size')
                  ->comment('Smallest dispensable unit label');
            $table->string('reorder_unit', 20)->default('unit')->after('base_unit')
                  ->comment('strip | box | unit — how min_reorder_level is counted');
        });

        // Phase 2: Expiry status + quarantine columns on pharmacy_batches
        Schema::table('pharmacy_batches', function (Blueprint $table) {
            $table->string('expiry_status', 20)->default('GOOD')->after('is_active')
                  ->index()
                  ->comment('GOOD | NEAR_EXPIRY(<90d) | CRITICAL(<30d) | EXPIRED | QUARANTINED');
            $table->timestamp('quarantined_at')->nullable()->after('expiry_status');
            $table->foreignId('quarantined_by_user_id')->nullable()->after('quarantined_at')
                  ->constrained('users')->nullOnDelete();
        });

        // Phase 3: Supplier Return to Vendor (RTV) Header
        Schema::create('pharmacy_supplier_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('rtv_number', 50)->unique()->comment('RTV-YYYYMMDD-XXXX');
            $table->foreignId('supplier_id')->constrained('pharmacy_suppliers')->cascadeOnDelete();
            $table->foreignId('purchase_id')->nullable()->constrained('pharmacy_purchases')->nullOnDelete();
            $table->string('return_reason', 50)->default('NEAR_EXPIRY')
                  ->comment('NEAR_EXPIRY | EXPIRED | DAMAGED | WRONG_GOODS | QUALITY_ISSUE');
            $table->text('notes')->nullable();
            $table->string('status', 30)->default('DRAFT')
                  ->comment('DRAFT | CHALLAN_PRINTED | SUPPLIER_ACCEPTED | DEBIT_NOTE_ISSUED | CLOSED');
            $table->decimal('total_return_value', 12, 2)->default(0.00);
            $table->decimal('debit_note_amount', 12, 2)->default(0.00);
            $table->string('debit_note_number', 50)->nullable();
            $table->date('debit_note_date')->nullable();
            $table->foreignId('initiated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['hospital_id', 'status']);
            $table->index(['hospital_id', 'supplier_id']);
            $table->index(['hospital_id', 'created_at']);
        });

        // Phase 3: RTV Line Items
        Schema::create('pharmacy_supplier_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_return_id')->constrained('pharmacy_supplier_returns')->cascadeOnDelete();
            $table->foreignId('hospital_medicine_id')->constrained('hospital_medicines')->cascadeOnDelete();
            $table->foreignId('batch_id')->constrained('pharmacy_batches')->cascadeOnDelete();
            $table->string('batch_number', 100);
            $table->date('expiry_date');
            $table->integer('quantity_returned')->default(1);
            $table->decimal('purchase_rate', 10, 2)->default(0.00);
            $table->decimal('line_total', 12, 2)->default(0.00);
            $table->timestamps();

            $table->index(['supplier_return_id', 'hospital_medicine_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pharmacy_supplier_return_items');
        Schema::dropIfExists('pharmacy_supplier_returns');

        Schema::table('pharmacy_batches', function (Blueprint $table) {
            $table->dropForeign(['quarantined_by_user_id']);
            $table->dropColumn(['expiry_status', 'quarantined_at', 'quarantined_by_user_id']);
        });

        Schema::table('hospital_medicines', function (Blueprint $table) {
            $table->dropColumn(['strip_size', 'box_size', 'base_unit', 'reorder_unit']);
        });
    }
};
