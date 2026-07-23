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
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('hospital_id')->nullable()->constrained()->nullOnDelete();
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->foreignId('hospital_id')->nullable()->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['hospital_id']);
            $table->dropColumn('hospital_id');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropForeign(['hospital_id']);
            $table->dropColumn('hospital_id');
        });
    }
};
