<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Laboratory Result Entry & Order Audit Logs.
     */
    public function up(): void
    {
        Schema::create('lab_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('lab_orders')->cascadeOnDelete();
            $table->foreignId('order_item_id')->nullable()->constrained('lab_order_items')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 50); // 'result_entered', 'result_modified', 'test_approved', 'test_revoked', 'report_authorized', 'authorization_revoked', 'bill_updated'
            $table->text('description');
            $table->json('previous_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['hospital_id', 'order_id']);
            $table->index(['order_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lab_audit_logs');
    }
};
