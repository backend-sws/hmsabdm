<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Link each pharmacy batch directly to its vendor / supplier.
     */
    public function up(): void
    {
        Schema::table('pharmacy_batches', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->after('hospital_medicine_id')
                  ->constrained('pharmacy_suppliers')->nullOnDelete()
                  ->comment('Vendor / Supplier who supplied this batch');

            $table->index(['hospital_id', 'supplier_id']);
        });

        // Backfill supplier_id for existing batches from inward GRNs (PostgreSQL specific syntax)
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                UPDATE pharmacy_batches b
                SET supplier_id = p.supplier_id
                FROM pharmacy_purchase_items pi
                JOIN pharmacy_purchases p ON pi.purchase_id = p.id
                WHERE pi.batch_id = b.id AND b.supplier_id IS NULL
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pharmacy_batches', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropIndex(['hospital_id', 'supplier_id']);
            $table->dropColumn('supplier_id');
        });
    }
};
