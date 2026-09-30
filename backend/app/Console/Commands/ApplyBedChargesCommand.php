<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\Billing\BedBillingEngine;

class ApplyBedChargesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hospital:apply-bed-charges {--hospital= : Specific Hospital ID to process}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Calculates and auto-posts bed rent and nursing charges for all active inpatients based on hospital customizable policy';

    /**
     * Execute the console command.
     */
    public function handle(BedBillingEngine $engine): int
    {
        $hospitalId = $this->option('hospital') ? (int) $this->option('hospital') : null;

        $this->info('Starting automated bed charging engine...');

        $results = $engine->run($hospitalId);

        foreach ($results as $hId => $summary) {
            $this->line("Hospital #{$hId} [Policy: {$summary['policy']}]: Checked {$summary['admissions_checked']} admissions, Posted {$summary['charges_posted']} charges, Total: ₹{$summary['total_amount']}");
        }

        $this->info('Bed charges processed successfully.');
        return 0;
    }
}
