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
        Schema::table('insurance_preauths', function (Blueprint $table) {
            if (!Schema::hasColumn('insurance_preauths', 'followup_notes')) {
                $table->json('followup_notes')->nullable()->after('approval_remarks')->comment('Call & communication log with TPA');
            }
        });

        Schema::table('insurance_claims', function (Blueprint $table) {
            if (!Schema::hasColumn('insurance_claims', 'followup_notes')) {
                $table->json('followup_notes')->nullable()->after('notes')->comment('Call & communication log with TPA');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('insurance_preauths', function (Blueprint $table) {
            if (Schema::hasColumn('insurance_preauths', 'followup_notes')) {
                $table->dropColumn('followup_notes');
            }
        });

        Schema::table('insurance_claims', function (Blueprint $table) {
            if (Schema::hasColumn('insurance_claims', 'followup_notes')) {
                $table->dropColumn('followup_notes');
            }
        });
    }
};
