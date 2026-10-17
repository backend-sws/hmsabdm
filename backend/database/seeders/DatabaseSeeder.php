<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class DatabaseSeeder extends Seeder
{
    /**
     * Master Database Seeder with automated Seeder Tracking history.
     * 
     * Key Capabilities:
     * 1. On `php artisan migrate:fresh --seed`: Executes all master and module seeders fresh in dependency order.
     * 2. On subsequent `php artisan db:seed`: Automatically skips previously executed seeders and executes ONLY
     *    new seeders added to the $seeders registry, preventing duplicate records or foreign key issues.
     */
    public function run(): void
    {
        $this->ensureSeedersHistoryTable();

        $seeders = [
            SuperAdminSeeder::class,
            RolesAndPermissionsSeeder::class,
            DoctorDepartmentSeeder::class,
            WardBedSeeder::class,
            ChargeMasterSeeder::class,
            InsuranceMasterSeeder::class,
            OperationTheatreSeeder::class,
            LabMasterSeeder::class,
            Icd10MasterSeeder::class,
            MedicineMasterSeeder::class,
            BloodBankMasterSeeder::class,
            EmergencyMasterSeeder::class,
            DemoHospitalClinicalSeeder::class,
        ];

        $currentBatch = (int) (DB::table('seeders_history')->max('batch') ?? 0) + 1;
        $executedCount = 0;
        $skippedCount = 0;

        $this->command->info("Starting Database Seeder (Batch #{$currentBatch})...");

        foreach ($seeders as $seederClass) {
            $alreadyRan = DB::table('seeders_history')
                ->where('seeder_class', $seederClass)
                ->exists();

            if ($alreadyRan) {
                $this->command->line("  <fg=gray;options=bold>[-] SKIP:</> <fg=gray>{$seederClass}</> (already seeded)");
                $skippedCount++;
                continue;
            }

            $this->command->line("  <fg=green;options=bold>[+] SEEDING:</> <fg=white;options=bold>{$seederClass}</>");
            $startTime = microtime(true);

            $this->call($seederClass);

            $elapsed = round((microtime(true) - $startTime) * 1000);

            DB::table('seeders_history')->insert([
                'seeder_class' => $seederClass,
                'batch'        => $currentBatch,
                'ran_at'       => now(),
            ]);

            $this->command->line("      <fg=cyan>Completed in {$elapsed}ms</>");
            $executedCount++;
        }

        $this->command->newLine();
        $this->command->info("Seeding finished: {$executedCount} executed, {$skippedCount} skipped.");
    }

    /**
     * Ensure the seeders_history tracking table exists.
     */
    private function ensureSeedersHistoryTable(): void
    {
        if (!Schema::hasTable('seeders_history')) {
            Schema::create('seeders_history', function (Blueprint $table) {
                $table->id();
                $table->string('seeder_class', 255)->unique();
                $table->integer('batch')->default(1);
                $table->timestamp('ran_at');
            });
        }
    }
}
