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
        // 1. Operation Theatres Master
        Schema::create('operation_theatres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('code', 50)->nullable();
            $table->string('floor', 50)->nullable();
            $table->enum('status', ['available', 'in_use', 'cleaning', 'maintenance'])->default('available');
            $table->text('equipment_notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['hospital_id', 'is_active']);
        });

        // 2. OT Schedules / Surgical Bookings
        Schema::create('ot_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('booking_number', 50)->index();
            $table->foreignId('operation_theatre_id')->nullable()->constrained('operation_theatres')->nullOnDelete();
            $table->foreignId('ipd_admission_id')->nullable()->constrained('ipd_admissions')->nullOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('primary_surgeon_id')->constrained('doctors')->cascadeOnDelete();
            $table->foreignId('assistant_surgeon_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->foreignId('anesthetist_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->foreignId('surgical_department_id')->nullable()->constrained('departments')->nullOnDelete();

            $table->string('procedure_name');
            $table->string('procedure_code', 50)->nullable();
            $table->date('surgery_date')->index();
            $table->string('scheduled_start_time', 20)->nullable();
            $table->string('scheduled_end_time', 20)->nullable();
            $table->dateTime('actual_start_time')->nullable();
            $table->dateTime('actual_end_time')->nullable();

            $table->string('anesthesia_type', 50)->default('ga'); // ga, spinal, epidural, local, mac, regional_block, other
            $table->enum('priority', ['elective', 'urgent', 'emergency'])->default('elective');
            $table->enum('status', ['booked', 'pre_op_ready', 'in_theatre', 'recovery', 'completed', 'postponed', 'cancelled'])->default('booked');

            $table->text('pre_op_diagnosis')->nullable();
            $table->text('post_op_diagnosis')->nullable();
            $table->string('scrub_nurse_name', 100)->nullable();
            $table->string('circulating_nurse_name', 100)->nullable();
            $table->integer('blood_required_units')->default(0);
            $table->text('special_instruments')->nullable();
            $table->text('surgeon_notes')->nullable();
            $table->text('recovery_notes')->nullable();
            $table->dateTime('pacu_discharge_time')->nullable();

            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['hospital_id', 'surgery_date', 'status']);
        });

        // 3. WHO / NABH Surgical Safety Checklist Records
        Schema::create('ot_checklist_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ot_schedule_id')->constrained('ot_schedules')->cascadeOnDelete();

            // Sign In
            $table->boolean('sign_in_completed')->default(false);
            $table->dateTime('sign_in_completed_at')->nullable();
            $table->string('sign_in_nurse_name', 100)->nullable();
            $table->string('sign_in_anesthetist_name', 100)->nullable();
            $table->json('sign_in_checks')->nullable();

            // Time Out
            $table->boolean('time_out_completed')->default(false);
            $table->dateTime('time_out_completed_at')->nullable();
            $table->json('time_out_checks')->nullable();

            // Sign Out
            $table->boolean('sign_out_completed')->default(false);
            $table->dateTime('sign_out_completed_at')->nullable();
            $table->string('sign_out_nurse_name', 100)->nullable();
            $table->json('sign_out_checks')->nullable();

            $table->timestamps();

            $table->unique(['hospital_id', 'ot_schedule_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ot_checklist_records');
        Schema::dropIfExists('ot_schedules');
        Schema::dropIfExists('operation_theatres');
    }
};
