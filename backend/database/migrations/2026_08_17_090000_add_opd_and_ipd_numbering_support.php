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
        // 1. Add opd_number to opd_visits
        Schema::table('opd_visits', function (Blueprint $table) {
            $table->string('opd_number', 50)->nullable()->after('id');
            $table->index(['hospital_id', 'opd_number']);
        });

        // 2. Add ipd_number and core fields to ipd_admissions
        Schema::table('ipd_admissions', function (Blueprint $table) {
            $table->foreignId('hospital_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->nullable()->after('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable()->after('patient_id')->constrained()->nullOnDelete();
            $table->string('ipd_number', 50)->nullable()->after('doctor_id');
            $table->string('status', 20)->default('admitted')->after('ipd_number');
            $table->timestamp('admission_date')->nullable()->after('status');
            $table->timestamp('discharge_date')->nullable()->after('admission_date');

            $table->index(['hospital_id', 'ipd_number']);
            $table->index(['hospital_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('opd_visits', function (Blueprint $table) {
            $table->dropIndex(['hospital_id', 'opd_number']);
            $table->dropColumn('opd_number');
        });

        Schema::table('ipd_admissions', function (Blueprint $table) {
            $table->dropForeign(['hospital_id']);
            $table->dropForeign(['patient_id']);
            $table->dropForeign(['doctor_id']);
            $table->dropIndex(['hospital_id', 'ipd_number']);
            $table->dropIndex(['hospital_id', 'status']);
            $table->dropColumn([
                'hospital_id',
                'patient_id',
                'doctor_id',
                'ipd_number',
                'status',
                'admission_date',
                'discharge_date',
            ]);
        });
    }
};
