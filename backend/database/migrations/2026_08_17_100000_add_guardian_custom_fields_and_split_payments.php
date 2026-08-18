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
        // 1. Add Guardian, Photo, District, State, KYC, and Custom Fields to patients
        Schema::table('patients', function (Blueprint $table) {
            $table->string('guardian_name')->nullable()->after('name');
            $table->string('guardian_relation', 50)->nullable()->after('guardian_name');
            $table->string('guardian_phone', 20)->nullable()->after('guardian_relation');
            $table->text('photo')->nullable()->after('pincode');
            $table->string('district', 100)->nullable()->after('city');
            $table->string('state', 100)->nullable()->after('district');
            $table->boolean('kyc_verified')->default(false)->after('state');
            $table->json('custom_fields')->nullable()->after('kyc_verified');
        });

        // 2. Add Split Payment and Discount fields to opd_visits & loosen payment enums
        Schema::table('opd_visits', function (Blueprint $table) {
            $table->string('payment_status', 50)->default('pending')->change();
            $table->string('payment_method', 50)->nullable()->change();
            $table->decimal('discount', 10, 2)->default(0)->after('fee_charged');
            $table->decimal('amount_paid', 10, 2)->default(0)->after('discount');
            $table->json('payment_breakdown')->nullable()->after('payment_ref');
        });

        // 3. Create patient_field_configs for hospital-configurable dynamic patient fields
        Schema::create('patient_field_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('field_key', 100);
            $table->string('label', 255);
            $table->string('category', 50)->default('general'); // general, demographic, insurance, emergency
            $table->string('input_type', 50)->default('text');   // text, number, select, date, boolean, textarea
            $table->json('options')->nullable();                 // For select/multiselect
            $table->string('placeholder')->nullable();
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['hospital_id', 'field_key']);
            $table->index(['hospital_id', 'is_active', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_field_configs');

        Schema::table('opd_visits', function (Blueprint $table) {
            $table->dropColumn(['discount', 'amount_paid', 'payment_breakdown']);
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn([
                'guardian_name',
                'guardian_relation',
                'guardian_phone',
                'photo',
                'district',
                'state',
                'kyc_verified',
                'custom_fields',
            ]);
        });
    }
};
