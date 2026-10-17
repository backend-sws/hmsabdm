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
        // 1. Blood Donors Master
        Schema::create('blood_donors', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->string('donor_number', 50)->index();
            $table->string('name', 150);
            $table->string('mobile', 20)->index();
            $table->string('email', 100)->nullable();
            $table->string('gender', 10)->default('M');
            $table->date('dob')->nullable();
            $table->integer('age')->default(25);
            $table->string('blood_group', 10)->index(); // A+, A-, B+, B-, AB+, AB-, O+, O-
            $table->string('donor_type', 30)->default('voluntary'); // voluntary, replacement
            $table->unsignedBigInteger('patient_id')->nullable()->index(); // if replacement
            $table->string('patient_uhid', 50)->nullable();
            $table->string('abha_number', 50)->nullable();
            $table->string('abha_address', 100)->nullable();
            $table->string('id_proof_type', 50)->nullable();
            $table->string('id_proof_number', 100)->nullable();
            $table->string('occupation', 100)->nullable();
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->integer('total_donations')->default(0);
            $table->date('last_donated_at')->nullable();
            $table->string('deferral_status', 30)->default('eligible'); // eligible, temporary_deferred, permanent_deferred
            $table->string('deferral_reason', 255)->nullable();
            $table->date('deferred_until')->nullable();
            $table->timestamps();

            $table->unique(['hospital_id', 'donor_number']);
        });

        // 2. Donor Health Screenings & Medical Questionnaire
        Schema::create('donor_screenings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->unsignedBigInteger('donor_id')->index();
            $table->decimal('weight_kg', 5, 2);
            $table->decimal('hemoglobin_g_dl', 4, 2); // Min 12.5 g/dL
            $table->integer('bp_systolic')->default(120);
            $table->integer('bp_diastolic')->default(80);
            $table->integer('pulse')->default(72);
            $table->decimal('temperature', 4, 2)->default(37.0);
            $table->json('medical_history_answers')->nullable(); // 20+ past diseases declaration
            $table->boolean('is_eligible')->default(false);
            $table->string('rejection_reason', 255)->nullable();
            $table->text('donor_signature_data')->nullable(); // Base64 signature
            $table->unsignedBigInteger('examined_by_user_id')->nullable();
            $table->timestamps();

            $table->foreign('donor_id')->references('id')->on('blood_donors')->onDelete('cascade');
        });

        // 3. Outdoor Blood Donation Camps
        Schema::create('blood_camps', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->string('camp_name', 150);
            $table->string('organizer_name', 150);
            $table->string('location', 255);
            $table->date('camp_date');
            $table->integer('target_units')->default(50);
            $table->integer('units_collected')->default(0);
            $table->string('coordinator_contact', 50)->nullable();
            $table->string('status', 30)->default('scheduled'); // scheduled, in_progress, completed, cancelled
            $table->timestamps();
        });

        // 4. Blood Units & Component Inventory (ISBT 128 Compliant)
        Schema::create('blood_units', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->unsignedBigInteger('donor_id')->nullable()->index();
            $table->unsignedBigInteger('screening_id')->nullable();
            $table->unsignedBigInteger('camp_id')->nullable()->index();
            $table->unsignedBigInteger('parent_unit_id')->nullable()->index(); // for split/aliquot
            $table->string('unit_barcode', 60)->index(); // ISBT 128 / BAG-YYYY-XXXXX
            $table->string('blood_group', 10)->index();
            $table->string('component_type', 30)->index(); // whole_blood, prbc, ffp, platelets, cryo, sdp
            $table->integer('volume_ml')->default(350);
            $table->string('bag_type', 30)->default('single'); // single, double, triple, quadruple, apheresis
            $table->dateTime('collection_date');
            $table->dateTime('expiry_date')->index();
            $table->string('storage_equipment', 50)->default('refrigerator'); // refrigerator, deep_freezer, platelet_agitator
            $table->string('storage_location', 100)->nullable(); // e.g. Fridge #1 - Shelf A2
            $table->string('tti_status', 30)->default('quarantine'); // quarantine, tested_safe, reactive_discarded
            $table->boolean('is_leukodepleted')->default(false);
            $table->boolean('is_irradiated')->default(false);
            $table->string('status', 30)->default('quarantine'); // quarantine, available, reserved, issued, discarded, expired
            $table->string('discard_reason', 255)->nullable();
            $table->dateTime('discard_date')->nullable();
            $table->unsignedBigInteger('discarded_by_user_id')->nullable();
            $table->timestamps();

            $table->unique(['hospital_id', 'unit_barcode']);
            $table->foreign('donor_id')->references('id')->on('blood_donors')->onDelete('set null');
        });

        // 5. TTI (Transfusion Transmitted Infections) & Confirmatory Testing
        Schema::create('blood_tti_tests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->unsignedBigInteger('blood_unit_id')->index();
            $table->string('hiv_result', 20)->default('non_reactive'); // non_reactive, reactive
            $table->string('hbv_result', 20)->default('non_reactive');
            $table->string('hcv_result', 20)->default('non_reactive');
            $table->string('syphilis_result', 20)->default('non_reactive');
            $table->string('malaria_result', 20)->default('non_reactive');
            $table->string('blood_group_confirmed', 10);
            $table->string('overall_status', 20)->default('passed'); // passed, failed
            $table->text('remarks')->nullable();
            $table->unsignedBigInteger('tested_by_user_id')->nullable();
            $table->unsignedBigInteger('authorized_by_pathologist_id')->nullable();
            $table->dateTime('tested_at')->nullable();
            $table->timestamps();

            $table->foreign('blood_unit_id')->references('id')->on('blood_units')->onDelete('cascade');
        });

        // 6. Blood Requisitions from OT / IPD / Emergency
        Schema::create('blood_requisitions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->string('requisition_number', 50)->index();
            $table->unsignedBigInteger('patient_id')->index();
            $table->unsignedBigInteger('admission_id')->nullable()->index();
            $table->unsignedBigInteger('doctor_id')->index();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->string('blood_group_needed', 10)->index();
            $table->string('component_needed', 30)->index();
            $table->integer('units_requested')->default(1);
            $table->integer('units_crossmatched')->default(0);
            $table->integer('units_issued')->default(0);
            $table->string('urgency', 40)->default('routine'); // routine, urgent, emergency_un_crossmatched, mtp
            $table->text('clinical_indication')->nullable();
            $table->decimal('hb_level', 4, 2)->nullable();
            $table->dateTime('date_needed')->nullable();
            $table->boolean('emergency_consultant_waiver_signed')->default(false);
            $table->string('status', 30)->default('pending'); // pending, sample_received, crossmatched, partially_issued, issued, cancelled
            $table->timestamps();

            $table->unique(['hospital_id', 'requisition_number']);
        });

        // 7. Cross-Matching & Issue Vouchers
        Schema::create('blood_crossmatches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->unsignedBigInteger('requisition_id')->index();
            $table->unsignedBigInteger('blood_unit_id')->index();
            $table->unsignedBigInteger('patient_id')->index();
            $table->string('method', 50)->default('gel_card'); // gel_card, tube_ahg, emergency_uncrossmatched
            $table->string('compatibility', 20)->default('compatible'); // compatible, incompatible, pending
            $table->unsignedBigInteger('crossmatched_by_user_id')->nullable();
            $table->dateTime('crossmatched_at')->nullable();
            $table->dateTime('reservation_valid_until')->nullable();
            $table->boolean('is_issued')->default(false);
            $table->dateTime('issued_at')->nullable();
            $table->string('issued_to_staff_name', 100)->nullable();
            $table->decimal('cold_box_temperature', 4, 2)->nullable();
            $table->decimal('service_charge', 10, 2)->default(1200.00);
            $table->unsignedBigInteger('invoice_id')->nullable();
            $table->timestamps();

            $table->foreign('requisition_id')->references('id')->on('blood_requisitions')->onDelete('cascade');
            $table->foreign('blood_unit_id')->references('id')->on('blood_units')->onDelete('cascade');
        });

        // 8. Hemovigilance (HvPI) Adverse Transfusion Reaction Reporting
        Schema::create('blood_transfusion_reactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hospital_id')->index();
            $table->unsignedBigInteger('blood_unit_id')->index();
            $table->unsignedBigInteger('patient_id')->index();
            $table->unsignedBigInteger('admission_id')->nullable()->index();
            $table->unsignedBigInteger('requisition_id')->nullable();
            $table->dateTime('transfusion_started_at')->nullable();
            $table->dateTime('reaction_occurred_at')->nullable();
            $table->integer('volume_transfused_ml')->nullable();
            $table->string('reaction_type', 50)->default('febrile_non_hemolytic'); // acute_hemolytic, febrile_non_hemolytic, allergic, anaphylactic, trali, taco, sepsis, other
            $table->string('severity', 30)->default('moderate'); // mild, moderate, severe, life_threatening, fatal
            $table->text('clinical_symptoms');
            $table->text('action_taken');
            $table->boolean('remnant_bag_returned')->default(true);
            $table->text('investigation_findings')->nullable();
            $table->string('investigation_status', 30)->default('reported'); // reported, under_investigation, resolved
            $table->unsignedBigInteger('reported_by_user_id')->nullable();
            $table->timestamps();

            $table->foreign('blood_unit_id')->references('id')->on('blood_units')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('blood_transfusion_reactions');
        Schema::dropIfExists('blood_crossmatches');
        Schema::dropIfExists('blood_requisitions');
        Schema::dropIfExists('blood_tti_tests');
        Schema::dropIfExists('blood_units');
        Schema::dropIfExists('blood_camps');
        Schema::dropIfExists('donor_screenings');
        Schema::dropIfExists('blood_donors');
    }
};
