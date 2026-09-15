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
        Schema::create('medicines_master', function (Blueprint $table) {
            $table->id();
            $table->string('brand_name')->index();         // "Crocin 500mg"
            $table->string('generic_name')->index();       // "Paracetamol"
            $table->text('salt_composition')->nullable();  // "Paracetamol (500mg)"
            $table->string('dosage_form', 100)->nullable();  // "Tablet", "Syrup", "Injection"
            $table->string('manufacturer', 255)->nullable(); // "GSK", "Cipla"
            $table->string('therapeutic_category', 255)->nullable(); // "Analgesics"
            $table->string('prescription_type', 10)->nullable(); // "Rx", "OTC"
            $table->decimal('mrp', 10, 2)->nullable();    // Max retail price
            $table->boolean('is_generic')->default(false); // Jan Aushadhi / generic flag
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Full-text search on brand_name + generic_name for prescription writer
        \DB::statement("CREATE INDEX medicines_fts_idx ON medicines_master USING gin(to_tsvector('simple', brand_name || ' ' || generic_name))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medicines_master');
    }
};
