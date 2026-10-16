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
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->foreignId('ipd_admission_id')->nullable()->after('patient_id')->constrained('ipd_admissions')->nullOnDelete();
            $table->boolean('is_bedside_collection')->default(false)->after('order_type');
            $table->index(['hospital_id', 'ipd_admission_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->dropForeign(['ipd_admission_id']);
            $table->dropIndex(['hospital_id', 'ipd_admission_id']);
            $table->dropColumn(['ipd_admission_id', 'is_bedside_collection']);
        });
    }
};
