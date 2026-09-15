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
        // 1. Setup Wards Table
        Schema::table('wards', function (Blueprint $table) {
            $table->foreignId('hospital_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->string('name', 100)->nullable()->after('hospital_id');
            $table->string('code', 50)->nullable()->after('name');
            $table->string('floor', 50)->nullable()->after('code');
            $table->string('gender_type', 20)->default('all')->after('floor'); // male, female, all
            $table->decimal('daily_charge', 10, 2)->default(0)->after('gender_type');
            $table->boolean('is_active')->default(true)->after('daily_charge');

            $table->index(['hospital_id', 'is_active']);
        });

        // 2. Setup Beds Table
        Schema::table('beds', function (Blueprint $table) {
            $table->foreignId('hospital_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->foreignId('ward_id')->nullable()->after('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('bed_number', 50)->nullable()->after('ward_id');
            $table->string('status', 30)->default('available')->after('bed_number'); // available, occupied, maintenance, reserved
            $table->decimal('daily_charge', 10, 2)->nullable()->after('status');
            $table->unsignedBigInteger('current_admission_id')->nullable()->after('daily_charge');
            $table->boolean('is_active')->default(true)->after('current_admission_id');

            $table->index(['hospital_id', 'ward_id', 'status']);
        });

        // 3. Setup IPD Admissions Table
        Schema::table('ipd_admissions', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('doctor_id')->constrained()->nullOnDelete();
            $table->foreignId('ward_id')->nullable()->after('department_id')->constrained()->nullOnDelete();
            $table->foreignId('bed_id')->nullable()->after('ward_id')->constrained()->nullOnDelete();

            $table->string('admission_type', 50)->default('planned')->after('ipd_number'); // planned, emergency, day_care, maternity, transfer
            $table->text('admission_reason')->nullable()->after('admission_type');
            $table->boolean('is_mlc')->default(false)->after('admission_reason');
            $table->text('mlc_details')->nullable()->after('is_mlc');

            $table->decimal('advance_deposit', 10, 2)->default(0)->after('status');
            $table->string('payment_status', 50)->default('pending')->after('advance_deposit'); // paid, partial, pending, waived
            $table->string('payment_method', 50)->nullable()->after('payment_status'); // cash, upi, card, insurance, split
            $table->string('payment_ref')->nullable()->after('payment_method');
            $table->json('payment_breakdown')->nullable()->after('payment_ref');

            $table->string('attendant_name')->nullable()->after('discharge_date');
            $table->string('attendant_relation', 50)->nullable()->after('attendant_name');
            $table->string('attendant_phone', 20)->nullable()->after('attendant_relation');
            $table->text('attendant_address')->nullable()->after('attendant_phone');

            $table->index(['hospital_id', 'status', 'admission_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ipd_admissions', function (Blueprint $table) {
            $table->dropColumn([
                'department_id', 'ward_id', 'bed_id', 'admission_type', 'admission_reason',
                'is_mlc', 'mlc_details', 'advance_deposit', 'payment_status', 'payment_method',
                'payment_ref', 'payment_breakdown', 'attendant_name', 'attendant_relation',
                'attendant_phone', 'attendant_address'
            ]);
        });

        Schema::table('beds', function (Blueprint $table) {
            $table->dropColumn(['hospital_id', 'ward_id', 'bed_number', 'status', 'daily_charge', 'current_admission_id', 'is_active']);
        });

        Schema::table('wards', function (Blueprint $table) {
            $table->dropColumn(['hospital_id', 'name', 'code', 'floor', 'gender_type', 'daily_charge', 'is_active']);
        });
    }
};
