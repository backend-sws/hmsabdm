<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class AbdmBridgeSetupCommand extends Command
{
    protected $signature = 'abdm:bridge-setup 
                            {--url= : Your public HTTPS backend URL (e.g. https://xyz.ngrok-free.app)}
                            {--hip-id= : Your HIP Service ID (e.g. IN2710001234 or BRIDGE-TEST-HIP)}
                            {--hip-name= : Your Hospital Name (e.g. City Care Hospital)}';

    protected $description = 'Automate ABDM Gateway Session, Bridge URL update, and HIP Service registration';

    public function handle(): int
    {
        $gatewayUrl = config('services.abdm.gateway_url', env('ABDM_GATEWAY_URL', 'https://dev.abdm.gov.in'));
        $clientId = config('services.abdm.client_id', env('ABDM_CLIENT_ID', 'SBXID_062377'));
        $clientSecret = config('services.abdm.client_secret', env('ABDM_CLIENT_SECRET', '775bd3a4-3a5c-4d4d-bddb-804e50f73d4d'));

        $this->info("==================================================");
        $this->info("🏥 ABDM Gateway & Bridge Setup Utility");
        $this->info("==================================================");
        $this->line("Client ID : <comment>{$clientId}</comment>");
        $this->line("Gateway   : <comment>{$gatewayUrl}</comment>");
        $this->newLine();

        // 1. Authenticate with Gateway
        $this->info("🔄 Step 1: Authenticating with ABDM Gateway...");
        $authResponse = Http::post("{$gatewayUrl}/gateway/v0.5/sessions", [
            'clientId'     => $clientId,
            'clientSecret' => $clientSecret,
        ]);

        if (!$authResponse->successful()) {
            $this->error("❌ Gateway Authentication Failed!");
            $this->error("Status: " . $authResponse->status());
            $this->error($authResponse->body());
            return Command::FAILURE;
        }

        $accessToken = $authResponse->json('accessToken');
        if (!$accessToken) {
            $this->error("❌ No accessToken returned in response.");
            return Command::FAILURE;
        }

        $this->info("✅ Gateway Authenticated successfully!");
        $this->line("Token (first 30 chars): <comment>" . substr($accessToken, 0, 30) . "...</comment>");
        $this->newLine();

        // 2. Update Bridge URL
        $bridgeUrl = $this->option('url');
        if (!$bridgeUrl) {
            $bridgeUrl = $this->ask('Enter your Public HTTPS URL (e.g. https://your-domain.com or ngrok URL)', env('APP_URL'));
        }

        if ($bridgeUrl && str_starts_with($bridgeUrl, 'https://')) {
            $this->info("🔄 Step 2: Updating Bridge URL to {$bridgeUrl}...");
            $patchResponse = Http::withToken($accessToken)
                ->withHeaders([
                    'X-CM-ID'      => 'sbx',
                    'Accept'       => '*/*',
                    'Content-Type' => 'application/json',
                ])
                ->patch("{$gatewayUrl}/gateway/v1/bridges", [
                    'url' => $bridgeUrl
                ]);

            if ($patchResponse->successful() || $patchResponse->status() === 200) {
                $this->info("✅ Bridge URL updated successfully!");
            } else {
                $this->warn("⚠️ Bridge URL update status {$patchResponse->status()}: " . $patchResponse->body());
            }
        } else {
            $this->warn("⚠️ Skipping Bridge URL update (URL must start with https://).");
        }
        $this->newLine();

        // 3. Add/Update HIP Services
        $hipId = $this->option('hip-id') ?: env('ABDM_HIP_ID', 'BRIDGE-TEST-HIP');
        $hipName = $this->option('hip-name') ?: 'Hospital Information System HIP';

        $registerService = $this->confirm("Do you want to register HIP Service [{$hipId} - {$hipName}] on ABDM Gateway?", true);
        if ($registerService) {
            $this->info("🔄 Step 3: Registering HIP Service...");
            
            $endpointAddress = rtrim($bridgeUrl, '/') . '/api/webhook/abdm/v1/scan-and-share';

            $servicePayload = [
                [
                    'id'        => $hipId,
                    'name'      => $hipName,
                    'type'      => 'HIP',
                    'active'    => true,
                    'alias'     => [$hipId],
                    'endpoints' => [
                        [
                            'address'        => $endpointAddress,
                            'connectionType' => 'https',
                            'use'            => 'registration'
                        ]
                    ]
                ]
            ];

            $serviceResponse = Http::withToken($accessToken)
                ->withHeaders([
                    'X-CM-ID'      => 'sbx',
                    'Accept'       => '*/*',
                    'Content-Type' => 'application/json',
                ])
                ->post("{$gatewayUrl}/gateway/v1/bridges/addUpdateServices", $servicePayload);

            if ($serviceResponse->successful() || $serviceResponse->status() === 200) {
                $this->info("✅ HIP Service registered successfully!");
            } else {
                $this->warn("⚠️ HIP Service registration returned {$serviceResponse->status()}: " . $serviceResponse->body());
            }
        }
        $this->newLine();

        // 4. Get Registered Services
        $this->info("🔄 Step 4: Fetching registered Bridge Services...");
        $getServicesResponse = Http::withToken($accessToken)
            ->withHeaders([
                'X-CM-ID' => 'sbx',
                'Accept'  => 'application/json',
            ])
            ->get("{$gatewayUrl}/gateway/v1/bridges/getServices");

        if ($getServicesResponse->successful()) {
            $this->info("✅ Registered Bridge Services on Gateway:");
            $this->line(json_encode($getServicesResponse->json(), JSON_PRETTY_PRINT));
        } else {
            $this->warn("⚠️ Failed to fetch services: " . $getServicesResponse->body());
        }

        $this->newLine();
        $this->info("🎉 ABDM Bridge Setup Completed!");
        return Command::SUCCESS;
    }
}
