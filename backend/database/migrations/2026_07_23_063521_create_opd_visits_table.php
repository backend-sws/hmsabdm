<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opd_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->foreignId('appointment_type_id')->nullable()->constrained()->nullOnDelete();

            $table->date('visit_date');
            $table->unsignedInteger('queue_token');       // Per-doctor daily token: 1, 2, 3...
            $table->enum('status', [
                'waiting',
                'called',
                'in_consultation',
                'done',
                'cancelled',
            ])->default('waiting');

            // Clinical
            $table->text('chief_complaint')->nullable();  // Reception note
            $table->text('diagnosis')->nullable();         // Doctor fills
            $table->text('notes')->nullable();             // Doctor internal note

            // Payment
            $table->decimal('fee_charged', 10, 2)->nullable();
            $table->enum('payment_status', ['pending', 'paid', 'waived'])->default('pending');
            $table->enum('payment_method', ['cash', 'card', 'upi', 'insurance'])->nullable();
            $table->string('payment_ref')->nullable();     // UPI txn ID, card last 4, etc.

            // Timestamps for queue tracking
            $table->timestamp('called_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            // Indexes for common queries
            $table->index(['doctor_id', 'visit_date', 'queue_token']);
            $table->index(['visit_date', 'department_id', 'status']);
            $table->index(['patient_id', 'visit_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opd_visits');
    }
};
