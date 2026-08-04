<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 20);        // e.g. "CARD", "GEN"
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['hospital_id', 'code']);
            $table->index(['hospital_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
