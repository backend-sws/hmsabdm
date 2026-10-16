<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop legacy PostgreSQL check constraints on opd_visits that were left over from enum definitions
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE opd_visits DROP CONSTRAINT IF EXISTS opd_visits_payment_method_check;");
            DB::statement("ALTER TABLE opd_visits DROP CONSTRAINT IF EXISTS opd_visits_payment_status_check;");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Check constraints are omitted intentionally to keep payment methods flexible
    }
};
