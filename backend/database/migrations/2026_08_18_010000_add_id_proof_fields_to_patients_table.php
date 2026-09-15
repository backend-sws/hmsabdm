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
        Schema::table('patients', function (Blueprint $table) {
            $table->string('id_proof_type', 50)->nullable()->after('guardian_phone'); // aadhaar, pan, voter_id, driving_license, passport, ration_card, other
            $table->string('id_proof_number', 100)->nullable()->after('id_proof_type');

            $table->index(['hospital_id', 'id_proof_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex(['hospital_id', 'id_proof_number']);
            $table->dropColumn(['id_proof_type', 'id_proof_number']);
        });
    }
};
