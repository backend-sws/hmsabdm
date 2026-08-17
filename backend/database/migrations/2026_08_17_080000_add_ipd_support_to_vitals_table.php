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
        Schema::table('vitals', function (Blueprint $table) {
            $table->foreignId('ipd_admission_id')->nullable()->after('opd_visit_id')->constrained()->nullOnDelete();
            $table->string('encounter_type', 20)->default('opd')->after('ipd_admission_id');

            $table->index(['ipd_admission_id', 'recorded_at']);
            $table->index('encounter_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vitals', function (Blueprint $table) {
            $table->dropForeign(['ipd_admission_id']);
            $table->dropIndex(['ipd_admission_id', 'recorded_at']);
            $table->dropIndex(['encounter_type']);
            $table->dropColumn(['ipd_admission_id', 'encounter_type']);
        });
    }
};
