<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PharmacyBatch;
use Carbon\Carbon;

class CheckPharmacyExpiry extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pharmacy:check-expiry {--hospital= : Specific Hospital ID to process}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Daily surveillance of medicine batches to flag near-expiry (<90d, <30d) and expired batches, auto-locking expired drugs from POS dispensing';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $hospitalId = $this->option('hospital') ? (int) $this->option('hospital') : null;
        $today      = Carbon::today();
        $in30Days   = Carbon::today()->addDays(30);
        $in90Days   = Carbon::today()->addDays(90);

        $this->info('Starting Pharmacy Batch Expiry Surveillance Engine...');

        $query = PharmacyBatch::query();
        if ($hospitalId) {
            $query->where('hospital_id', $hospitalId);
        }

        // Only process batches not already quarantined
        $query->where(function ($q) {
            $q->whereNull('expiry_status')
              ->orWhere('expiry_status', '!=', 'QUARANTINED');
        });

        $batches = $query->get();

        $expiredCount  = 0;
        $criticalCount = 0;
        $nearExpCount  = 0;
        $goodCount     = 0;

        foreach ($batches as $batch) {
            $expiry = Carbon::parse($batch->expiry_date);

            if ($expiry->lt($today)) {
                $batch->update([
                    'expiry_status' => 'EXPIRED',
                    'is_active'     => false, // Lock from dispensing
                ]);
                $expiredCount++;
            } elseif ($expiry->lte($in30Days)) {
                $batch->update([
                    'expiry_status' => 'CRITICAL',
                ]);
                $criticalCount++;
            } elseif ($expiry->lte($in90Days)) {
                $batch->update([
                    'expiry_status' => 'NEAR_EXPIRY',
                ]);
                $nearExpCount++;
            } else {
                $batch->update([
                    'expiry_status' => 'GOOD',
                ]);
                $goodCount++;
            }
        }

        $this->info("Expiry check completed successfully:");
        $this->line("- Expired & Locked: {$expiredCount}");
        $this->line("- Critical (<30d): {$criticalCount}");
        $this->line("- Near Expiry (<90d): {$nearExpCount}");
        $this->line("- Good (>90d): {$goodCount}");

        return Command::SUCCESS;
    }
}
