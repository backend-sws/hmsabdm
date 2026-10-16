<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to add phlebotomy queue token, calling console, and rejection tracking.
     */
    public function up(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            // Phlebotomy Token Queue System
            $table->string('token_number', 30)->nullable()->after('order_number')->index();
            $table->timestamp('token_called_at')->nullable()->after('token_number');
            $table->string('booth_number', 50)->nullable()->after('token_called_at');
            $table->boolean('is_called')->default(false)->after('booth_number');

            // Sample Rejection & Recollection Workflow
            $table->string('rejection_reason', 150)->nullable()->after('sample_notes');
            $table->text('rejection_notes')->nullable()->after('rejection_reason');
            $table->timestamp('rejected_at')->nullable()->after('rejection_notes');
            $table->foreignId('rejected_by_user_id')->nullable()->after('rejected_at')->constrained('users')->nullOnDelete();
            $table->boolean('is_recollected')->default(false)->after('rejected_by_user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->dropForeign(['rejected_by_user_id']);
            $table->dropColumn([
                'token_number',
                'token_called_at',
                'booth_number',
                'is_called',
                'rejection_reason',
                'rejection_notes',
                'rejected_at',
                'rejected_by_user_id',
                'is_recollected',
            ]);
        });
    }
};
