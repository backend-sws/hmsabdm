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
        Schema::create('icd10_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique();                // e.g. "A000"
            $table->string('code_with_separator', 12)->index();  // e.g. "A00.0"
            $table->string('short_description', 500);
            $table->text('long_description')->nullable();
            $table->boolean('is_billable')->default(false);      // true = leaf code (has dot)
            $table->boolean('is_header')->default(false);        // true = category block header
            $table->string('category_code', 10)->nullable();     // parent e.g. "A00"
            $table->timestamps();
        });

        // PostgreSQL GIN full-text index for lightning-fast search
        \DB::statement("CREATE INDEX icd10_fts_idx ON icd10_codes USING gin(to_tsvector('english', short_description))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('icd10_codes');
    }
};
