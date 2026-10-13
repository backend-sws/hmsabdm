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
        Schema::table('pharmacy_sales', function (Blueprint $table) {
            if (!Schema::hasColumn('pharmacy_sales', 'doctor_reg_no')) {
                $table->string('doctor_reg_no', 100)->nullable()->after('doctor_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pharmacy_sales', function (Blueprint $table) {
            if (Schema::hasColumn('pharmacy_sales', 'doctor_reg_no')) {
                $table->dropColumn('doctor_reg_no');
            }
        });
    }
};
