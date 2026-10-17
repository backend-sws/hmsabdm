<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Icd10Code;
use App\Models\MedicineMaster;

class ImportMasterCatalogCommand extends Command
{
    protected $signature = 'hms:import-master-catalog {--force : Force re-import even if data exists}';
    protected $description = 'Import 94,000+ ICD-10 codes and 200,000+ Indian Medicines master catalog';

    const ICD10_URL = 'https://raw.githubusercontent.com/Bobrovskiy/ICD-10-CSV/master/2020/diagnosis.csv';
    const MEDICINE_URL = 'https://raw.githubusercontent.com/junioralive/Indian-Medicine-Dataset/main/DATA/indian_medicine_data.csv';

    public function handle(): int
    {
        $this->info('=== HMS Master Catalog Importer ===');

        $this->importIcd10();
        $this->importMedicines();

        $this->info('=== Master Catalog Import Complete ===');
        $this->line('ICD-10 Codes: ' . Icd10Code::count());
        $this->line('Medicines Master: ' . MedicineMaster::count());

        return 0;
    }

    private function importIcd10(): void
    {
        $count = Icd10Code::count();
        if ($count > 1000 && !$this->option('force')) {
            $this->info("ICD-10 codes already populated ({$count} records). Skipping. (Use --force to re-import)");
            return;
        }

        $this->info('Downloading and streaming ICD-10 codes from GitHub...');
        $handle = @fopen(self::ICD10_URL, 'r');
        if (!$handle) {
            $this->warn('Could not open ICD-10 URL. Skipping remote download.');
            return;
        }

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return;
        }

        $codeIdx = array_search('Code', $header);
        $descIdx = array_search('ShortDescription', $header);
        $longIdx = array_search('LongDescription', $header);
        $sepIdx = array_search('CodeWithSeparator', $header);

        $chunk = [];
        $total = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $code = trim($row[$codeIdx] ?? '');
            $desc = trim($row[$descIdx] ?? '');
            if (!$code || !$desc) continue;

            $sep = !empty($row[$sepIdx]) ? trim($row[$sepIdx]) : $code;
            $isHeader = !str_contains($sep, '.');
            $catCode = $isHeader ? null : substr($code, 0, 3);
            $longDesc = !empty($row[$longIdx]) ? trim($row[$longIdx]) : null;

            $chunk[] = [
                'code'                => $code,
                'code_with_separator' => $sep,
                'short_description'   => substr($desc, 0, 499),
                'long_description'    => $longDesc,
                'is_billable'         => !$isHeader,
                'is_header'           => $isHeader,
                'category_code'       => $catCode,
                'created_at'          => now(),
                'updated_at'          => now(),
            ];

            if (count($chunk) >= 500) {
                DB::table('icd10_codes')->upsert($chunk, ['code'], ['code_with_separator', 'short_description', 'long_description', 'is_billable', 'is_header', 'category_code', 'updated_at']);
                $total += count($chunk);
                $chunk = [];
                $this->output->write("\r  Inserted {$total} ICD-10 codes...");
            }
        }

        if (count($chunk) > 0) {
            DB::table('icd10_codes')->upsert($chunk, ['code'], ['code_with_separator', 'short_description', 'long_description', 'is_billable', 'is_header', 'category_code', 'updated_at']);
            $total += count($chunk);
        }

        fclose($handle);
        $this->newLine();
        $this->info("Successfully imported {$total} ICD-10 codes.");
    }

    private function importMedicines(): void
    {
        $count = MedicineMaster::count();
        if ($count > 1000 && !$this->option('force')) {
            $this->info("Medicines master already populated ({$count} records). Skipping. (Use --force to re-import)");
            return;
        }

        $this->info('Downloading and streaming Indian Medicines dataset from GitHub...');
        $handle = @fopen(self::MEDICINE_URL, 'r');
        if (!$handle) {
            $this->warn('Could not open Medicine URL. Skipping remote download.');
            return;
        }

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return;
        }

        $chunk = [];
        $total = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $data = array_combine($header, $row);
            if (!$data) continue;

            $brand = trim($data['name'] ?? $data['Product Name'] ?? '');
            if (!$brand) continue;

            $salt1 = trim($data['short_composition1'] ?? '');
            $salt2 = trim($data['short_composition2'] ?? '');
            $salt = trim(implode(' + ', array_filter([$salt1, $salt2])));
            if (!$salt) {
                $salt = trim($data['salt'] ?? $data['Salt Composition'] ?? '');
            }

            $generic = $brand;
            if ($salt) {
                $parts = array_map(function ($p) {
                    return trim(preg_replace('/\(.*?\)/', '', $p));
                }, explode('+', $salt));
                $generic = substr(implode(' + ', array_filter($parts)), 0, 254);
            }

            $mfr = substr(trim($data['manufacturer_name'] ?? $data['manufacturer'] ?? ''), 0, 254);
            $mrp = (float) ($data['price(₹)'] ?? $data['mrp'] ?? 0);
            $cat = substr(trim($data['type'] ?? $data['therapeutic_class'] ?? ''), 0, 254);

            $form = 'Tablet';
            $text = strtolower($brand . ' ' . ($data['pack_size_label'] ?? ''));
            if (str_contains($text, 'syrup') || str_contains($text, 'suspension')) $form = 'Syrup';
            elseif (str_contains($text, 'injection') || str_contains($text, 'inj')) $form = 'Injection';
            elseif (str_contains($text, 'cream') || str_contains($text, 'ointment') || str_contains($text, 'gel')) $form = 'Topical';
            elseif (str_contains($text, 'drop')) $form = 'Drops';
            elseif (str_contains($text, 'capsule') || str_contains($text, 'cap')) $form = 'Capsule';
            elseif (str_contains($text, 'powder') || str_contains($text, 'sachet')) $form = 'Powder';
            elseif (str_contains($text, 'inhaler') || str_contains($text, 'respules')) $form = 'Inhaler';

            $chunk[] = [
                'brand_name'           => substr($brand, 0, 254),
                'generic_name'         => substr($generic ?: $brand, 0, 254),
                'salt_composition'     => $salt ?: null,
                'dosage_form'          => $form,
                'manufacturer'         => $mfr ?: null,
                'therapeutic_category' => $cat ?: null,
                'prescription_type'    => 'Rx',
                'mrp'                  => $mrp > 0 ? $mrp : null,
                'is_generic'           => false,
                'is_active'            => true,
                'created_at'           => now(),
                'updated_at'           => now(),
            ];

            if (count($chunk) >= 500) {
                DB::table('medicines_master')->insert($chunk);
                $total += count($chunk);
                $chunk = [];
                $this->output->write("\r  Inserted {$total} Medicines...");
                if ($total >= 200000) break;
            }
        }

        if (count($chunk) > 0 && $total < 200000) {
            DB::table('medicines_master')->insert($chunk);
            $total += count($chunk);
        }

        fclose($handle);
        $this->newLine();
        $this->info("Successfully imported {$total} medicines.");
    }
}
