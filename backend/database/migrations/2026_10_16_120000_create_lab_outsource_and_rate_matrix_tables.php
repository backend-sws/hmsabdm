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
        // 1. External Reference Labs (Vendors)
        if (!Schema::hasTable('lab_external_vendors')) {
            Schema::create('lab_external_vendors', function (Blueprint $table) {
                $table->id();
                $table->foreignId('hospital_id')->nullable()->constrained()->cascadeOnDelete();
                $table->string('vendor_code', 50)->index(); // 'LAL-PATH', 'THYROCARE', 'METROPOLIS'
                $table->string('name', 255);
                $table->string('contact_person', 150)->nullable();
                $table->string('phone', 50)->nullable();
                $table->string('email', 150)->nullable();
                $table->text('address')->nullable();
                $table->string('pickup_schedule', 255)->nullable(); // e.g. 'Daily 2:00 PM and 7:00 PM'
                $table->string('default_courier', 150)->nullable();
                $table->string('account_number', 100)->nullable(); // Hospital Client / B2B Code
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['hospital_id', 'is_active']);
            });
        }

        // 2. Outsource Manifests (Dispatch Batches)
        if (!Schema::hasTable('lab_outsource_manifests')) {
            Schema::create('lab_outsource_manifests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('hospital_id')->nullable()->constrained()->cascadeOnDelete();
                $table->foreignId('vendor_id')->constrained('lab_external_vendors')->cascadeOnDelete();
                $table->string('manifest_number', 50)->unique(); // 'MAN-202610-0001'
                $table->string('status', 30)->default('dispatched'); // 'draft', 'dispatched', 'in_transit', 'delivered', 'completed'
                $table->string('temperature_condition', 50)->default('cold_chain'); // 'ambient', 'cold_chain', 'frozen', 'formalin'
                $table->string('courier_name', 150)->nullable();
                $table->string('courier_phone', 50)->nullable();
                $table->string('courier_tracking_no', 100)->nullable();
                $table->integer('total_samples')->default(0);
                $table->timestamp('dispatched_at')->nullable();
                $table->foreignId('dispatched_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('received_at_vendor_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['hospital_id', 'status']);
                $table->index(['vendor_id', 'created_at']);
            });
        }

        // 3. Alter lab_test_templates (Costing & fulfillment mode)
        if (Schema::hasTable('lab_test_templates')) {
            Schema::table('lab_test_templates', function (Blueprint $table) {
                if (!Schema::hasColumn('lab_test_templates', 'fulfillment_type')) {
                    $table->string('fulfillment_type', 30)->default('in_house')->after('category'); // 'in_house', 'outsourced', 'hybrid'
                }
                if (!Schema::hasColumn('lab_test_templates', 'default_vendor_id')) {
                    $table->foreignId('default_vendor_id')->nullable()->after('fulfillment_type')->constrained('lab_external_vendors')->nullOnDelete();
                }
                if (!Schema::hasColumn('lab_test_templates', 'b2b_cost')) {
                    $table->decimal('b2b_cost', 10, 2)->default(0.00)->after('standard_price');
                }
                if (!Schema::hasColumn('lab_test_templates', 'reagent_cost')) {
                    $table->decimal('reagent_cost', 10, 2)->default(0.00)->after('b2b_cost');
                }
            });
        }

        // 4. Alter lab_order_items (Sample Outsource Tracking & external report)
        if (Schema::hasTable('lab_order_items')) {
            Schema::table('lab_order_items', function (Blueprint $table) {
                if (!Schema::hasColumn('lab_order_items', 'fulfillment_type')) {
                    $table->string('fulfillment_type', 30)->default('in_house')->after('status');
                }
                if (!Schema::hasColumn('lab_order_items', 'outsource_status')) {
                    $table->string('outsource_status', 30)->nullable()->after('fulfillment_type'); // 'pending_dispatch', 'dispatched', 'in_transit', 'received', 'verified'
                }
                if (!Schema::hasColumn('lab_order_items', 'external_vendor_id')) {
                    $table->foreignId('external_vendor_id')->nullable()->after('outsource_status')->constrained('lab_external_vendors')->nullOnDelete();
                }
                if (!Schema::hasColumn('lab_order_items', 'outsource_manifest_id')) {
                    $table->foreignId('outsource_manifest_id')->nullable()->after('external_vendor_id')->constrained('lab_outsource_manifests')->nullOnDelete();
                }
                if (!Schema::hasColumn('lab_order_items', 'b2b_cost')) {
                    $table->decimal('b2b_cost', 10, 2)->default(0.00)->after('rate');
                }
                if (!Schema::hasColumn('lab_order_items', 'external_accession_no')) {
                    $table->string('external_accession_no', 100)->nullable()->after('outsource_manifest_id');
                }
                if (!Schema::hasColumn('lab_order_items', 'external_report_file')) {
                    $table->string('external_report_file', 255)->nullable()->after('external_accession_no');
                }
                if (!Schema::hasColumn('lab_order_items', 'outsourced_at')) {
                    $table->timestamp('outsourced_at')->nullable()->after('external_report_file');
                }
                if (!Schema::hasColumn('lab_order_items', 'outsource_received_at')) {
                    $table->timestamp('outsource_received_at')->nullable()->after('outsourced_at');
                }
            });
        }

        // 5. Multi-Tier Rate Lists & Rate Cards
        if (!Schema::hasTable('lab_rate_lists')) {
            Schema::create('lab_rate_lists', function (Blueprint $table) {
                $table->id();
                $table->foreignId('hospital_id')->nullable()->constrained()->cascadeOnDelete();
                $table->string('name', 150); // 'Standard OPD', 'Inpatient (IPD)', 'TPA / Cashless', 'Partner Clinic B2B'
                $table->string('code', 50)->index();
                $table->string('description', 255)->nullable();
                $table->boolean('is_default')->default(false);
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['hospital_id', 'is_active']);
            });
        }

        if (!Schema::hasTable('lab_rate_list_items')) {
            Schema::create('lab_rate_list_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('rate_list_id')->constrained('lab_rate_lists')->cascadeOnDelete();
                $table->foreignId('test_template_id')->constrained('lab_test_templates')->cascadeOnDelete();
                $table->decimal('patient_price', 10, 2);
                $table->decimal('b2b_cost', 10, 2)->default(0.00);
                $table->timestamps();

                $table->unique(['rate_list_id', 'test_template_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lab_rate_list_items');
        Schema::dropIfExists('lab_rate_lists');

        if (Schema::hasTable('lab_order_items')) {
            Schema::table('lab_order_items', function (Blueprint $table) {
                $table->dropForeign(['external_vendor_id']);
                $table->dropForeign(['outsource_manifest_id']);
                $table->dropColumn([
                    'fulfillment_type',
                    'outsource_status',
                    'external_vendor_id',
                    'outsource_manifest_id',
                    'b2b_cost',
                    'external_accession_no',
                    'external_report_file',
                    'outsourced_at',
                    'outsource_received_at',
                ]);
            });
        }

        if (Schema::hasTable('lab_test_templates')) {
            Schema::table('lab_test_templates', function (Blueprint $table) {
                $table->dropForeign(['default_vendor_id']);
                $table->dropColumn([
                    'fulfillment_type',
                    'default_vendor_id',
                    'b2b_cost',
                    'reagent_cost',
                ]);
            });
        }

        Schema::dropIfExists('lab_outsource_manifests');
        Schema::dropIfExists('lab_external_vendors');
    }
};
