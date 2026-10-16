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
        Schema::table('ipd_admissions', function (Blueprint $table) {
            $table->string('discharge_type', 30)->nullable()->default('normal')->after('discharge_date'); // 'normal', 'lama', 'transfer', 'referred', 'absconded', 'death'
            $table->text('discharge_summary')->nullable()->after('discharge_type');
            $table->text('discharge_advice')->nullable()->after('discharge_summary');
            $table->text('final_diagnosis')->nullable()->after('discharge_advice');
            $table->foreignId('discharged_by_user_id')->nullable()->after('final_diagnosis')->constrained('users')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->after('discharged_by_user_id')->constrained('invoices')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ipd_admissions', function (Blueprint $table) {
            $table->dropForeign(['discharged_by_user_id']);
            $table->dropForeign(['invoice_id']);
            $table->dropColumn([
                'discharge_type',
                'discharge_summary',
                'discharge_advice',
                'final_diagnosis',
                'discharged_by_user_id',
                'invoice_id',
            ]);
        });
    }
};
