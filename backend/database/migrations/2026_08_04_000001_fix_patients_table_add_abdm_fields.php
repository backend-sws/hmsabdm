<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fix patients table:
     * - Drop bad unique constraints (phone was not nullable)
     * - Add missing columns: mobile, dob, gender, blood_group, address, city, pincode, abha_address
     * - Make abha_number nullable (patients can exist without ABHA)
     */
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            // Drop old non-nullable unique constraint on phone
            $table->dropUnique(['phone']);
            $table->dropColumn('phone');

            // Add proper mobile column (nullable — patients may not have phone)
            $table->string('mobile', 15)->nullable()->after('name');

            // Make abha_number nullable
            $table->string('abha_number')->nullable()->change();

            // Add ABHA address field
            $table->string('abha_address')->nullable()->after('abha_number');

            // Add missing demographic fields
            $table->date('dob')->nullable()->after('abha_address');
            $table->char('gender', 1)->nullable()->after('dob');        // M, F, O
            $table->string('blood_group', 5)->nullable()->after('gender'); // A+, B-, O+, etc.

            // Add address fields
            $table->text('address')->nullable()->after('blood_group');
            $table->string('city')->nullable()->after('address');
            $table->string('pincode', 10)->nullable()->after('city');

            // Indexes for search
            $table->index('mobile');
            $table->index(['hospital_id', 'abha_number']);
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn([
                'mobile', 'abha_address', 'dob', 'gender',
                'blood_group', 'address', 'city', 'pincode',
            ]);
            $table->string('phone')->unique();
            $table->string('abha_number')->unique()->change();
        });
    }
};
