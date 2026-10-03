<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;

use App\Http\Traits\HasApiResponse;
use App\Models\CounterQueue;
use App\Models\Patient;
use App\Services\Abdm\AbdmServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

#[\OpenApi\Attributes\Tag(
    name: "9. ABDM Webhooks",
    description: "Incoming Webhooks from ABDM (Scan & Share)"
)]
class AbdmWebhookController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected AbdmServiceInterface $abdmService
    ) {}

    #[OA\Post(
        path: "/api/webhook/abdm/v1/scan-and-share",
        summary: "ABDM Webhook — Receive Scan & Share Demographic Data",
        description: "Public Webhook hit by ABDM Gateway when a patient scans the hospital QR code in their ABHA App. Creates patient, auto-assigns UHID, and generates a 3-digit queue token.",
        tags: ["11. ABDM Webhooks"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "hipCode", type: "string", example: "BRIDGE-TEST-HIP", description: "Hospital HIP ID"),
                new OA\Property(
                    property: "profile",
                    type: "object",
                    properties: [
                        new OA\Property(
                            property: "patient",
                            type: "object",
                            properties: [
                                new OA\Property(property: "name", type: "string", example: "Aarav Sharma"),
                                new OA\Property(property: "gender", type: "string", example: "M"),
                                new OA\Property(property: "yearOfBirth", type: "string", example: "1994"),
                                new OA\Property(property: "mobile", type: "string", example: "9876543210"),
                                new OA\Property(property: "abhaNumber", type: "string", example: "91-2461-6423-7108"),
                                new OA\Property(property: "abhaAddress", type: "string", example: "aarav94@sbx"),
                                new OA\Property(property: "address", type: "string", example: "Flat 402, Green Valley Apartments"),
                                new OA\Property(property: "pincode", type: "string", example: "110001")
                            ]
                        )
                    ]
                )
            ]
        )
    )]
    #[OA\Response(
        response: 202,
        description: "Token generated successfully and returned to ABDM Gateway",
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "status", type: "string", example: "success"),
                new OA\Property(property: "message", type: "string", example: "Token generated"),
                new OA\Property(property: "token", type: "string", example: "482")
            ]
        )
    )]
    public function handleScanAndShare(Request $request)
    {
        Log::info('ABDM Scan and Share Webhook received', $request->all());

        try {
            // Decrypt demographic payload using HIP keys (Mocked or Real)
            // Payload typically contains: profile data + intent
            if (!$request->has('profile')) {
                return response()->json(['error' => 'Invalid or missing payload'], 400);
            }

            $payload = $request->input('profile.patient');
            if (!$payload) {
                // If encrypted, decrypt it. Assuming decrypted structure for now.
                $decrypted = $this->abdmService->decryptScanAndSharePayload($request->input('profile.encProfile', ''));
                $payload = $decrypted;
            }

            // Extract Patient details
            $abhaNumber = $payload['abhaNumber'] ?? null;
            $abhaAddress = $payload['abhaAddress'] ?? null;
            $mobile = $payload['mobile'] ?? null;

            if (!$abhaNumber) {
                return response()->json(['error' => 'Invalid payload'], 400);
            }

            // Resolve Hospital dynamically from incoming hipCode / abdm_hip_id
            $hipCode = $request->input('hipCode') ?? $request->input('hip_id') ?? $request->input('facilityId');
            $hospital = null;
            if ($hipCode) {
                $hospital = \App\Models\Hospital::where('abdm_hip_id', $hipCode)
                    ->orWhere('code', $hipCode)
                    ->first();
            }
            if (!$hospital) {
                $hospital = \App\Models\Hospital::first();
            }
            $hospitalId = $hospital?->id ?? 1;

            // Address resolution from ABDM payload
            $rawAddress = $payload['address'] ?? null;
            $addressStr = is_array($rawAddress) ? ($rawAddress['line'] ?? implode(', ', array_filter($rawAddress))) : $rawAddress;
            $district = $payload['district'] ?? $payload['districtName'] ?? ($rawAddress['district'] ?? null);
            $state = $payload['state'] ?? $payload['stateName'] ?? ($rawAddress['state'] ?? null);
            $pincode = $payload['pincode'] ?? ($rawAddress['pincode'] ?? null);

            $patient = Patient::where('hospital_id', $hospitalId)
                ->where(function ($q) use ($abhaNumber, $abhaAddress, $mobile) {
                    $q->where('abha_number', $abhaNumber);
                    if ($abhaAddress) $q->orWhere('abha_address', $abhaAddress);
                    if ($mobile) $q->orWhere('mobile', $mobile);
                })
                ->first();
            
            if (!$patient) {
                $patient = Patient::create([
                    'hospital_id'  => $hospitalId,
                    'name'         => $payload['name'] ?? 'Unknown',
                    'mobile'       => $mobile,
                    'abha_number'  => $abhaNumber,
                    'abha_address' => $abhaAddress,
                    'gender'       => isset($payload['gender']) ? strtoupper(substr($payload['gender'], 0, 1)) : 'O',
                    'dob'          => isset($payload['yearOfBirth']) ? "{$payload['yearOfBirth']}-01-01" : null,
                    'address'      => $addressStr,
                    'district'     => $district,
                    'state'        => $state,
                    'pincode'      => $pincode,
                    'kyc_verified' => true,
                ]);
            } else {
                // Update missing details if present in ABDM scan share
                $updates = [];
                if (empty($patient->abha_number) && $abhaNumber) $updates['abha_number'] = $abhaNumber;
                if (empty($patient->abha_address) && $abhaAddress) $updates['abha_address'] = $abhaAddress;
                if (empty($patient->address) && $addressStr) $updates['address'] = $addressStr;
                if (empty($patient->district) && $district) $updates['district'] = $district;
                if (empty($patient->state) && $state) $updates['state'] = $state;
                if (empty($patient->pincode) && $pincode) $updates['pincode'] = $pincode;
                if (!empty($updates)) {
                    $patient->update($updates);
                }
            }

            // Generate Queue Token for the Counter (Scan & Share token)
            $token = str_pad((string)random_int(1, 999), 3, '0', STR_PAD_LEFT);

            CounterQueue::create([
                'hospital_id' => $hospitalId,
                'patient_id' => $patient->id,
                'link_token' => $token,
                'counter_code' => $request->input('hipCode', 'HIP123'),
                'status' => 'waiting_confirmation',
                'expires_at' => now()->addMinutes(30),
            ]);

            // Respond successfully to ABDM Gateway
            return response()->json([
                'status' => 'success',
                'message' => 'Token generated',
                'token' => $token
            ], 202);

        } catch (\Exception $e) {
            Log::error('ABDM Webhook Error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }
}
