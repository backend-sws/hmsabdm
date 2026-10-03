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
        Schema::table('billing_ledger_items', function (Blueprint $table) {
            $table->foreignId('invoice_id')->nullable()->after('status')->constrained('invoices')->nullOnDelete();
            $table->index(['hospital_id', 'invoice_id'], 'idx_ledger_invoice');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('billing_ledger_items', function (Blueprint $table) {
            $table->dropForeign(['invoice_id']);
            $table->dropIndex('idx_ledger_invoice');
            $table->dropColumn('invoice_id');
        });
    }
};
