<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Dedicated Key-Value Settings table per Hospital
        Schema::create('hospital_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('group', 50)->default('general'); // 'uhid', 'general', 'billing', 'opd', 'notifications'
            $table->string('key', 100);                      // e.g. 'uhid_prefix', 'uhid_format'
            $table->text('value')->nullable();               // Stored value
            $table->string('type', 20)->default('string');   // 'string', 'integer', 'boolean', 'json'
            $table->timestamps();

            $table->unique(['hospital_id', 'key']);
            $table->index(['hospital_id', 'group']);
        });

        // 2. Add uhid column to patients table
        Schema::table('patients', function (Blueprint $table) {
            $table->string('uhid', 50)->nullable()->after('hospital_id');
            $table->index(['hospital_id', 'uhid']);
            $table->index('uhid');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex(['hospital_id', 'uhid']);
            $table->dropIndex(['uhid']);
            $table->dropColumn('uhid');
        });

        Schema::dropIfExists('hospital_settings');
    }
};
