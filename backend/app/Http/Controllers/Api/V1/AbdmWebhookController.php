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

    /**
     * @OA\Post(
     *     path="/api/webhook/abdm/v1/scan-and-share",
     *     summary="Receive Scan & Share Demographic Data",
     *     tags={"ABDM Webhooks"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             type="object"
     *         )
     *     ),
     *     @OA\Response(
     *         response=202,
     *         description="Accepted callback"
     *     )
     * )
     */
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

            // Find or Create Patient based on ABHA
            // Using a system default hospital ID for webhook parsing, or extracting from payload
            $hospitalId = 1; // Assuming Tenant Middleware or payload contains counter mapping

            $patient = Patient::where('abha_number', $abhaNumber)->first();
            
            if (!$patient) {
                $patient = Patient::create([
                    'hospital_id' => $hospitalId,
                    'name' => $payload['name'] ?? 'Unknown',
                    'mobile' => $mobile,
                    'abha_number' => $abhaNumber,
                    'abha_address' => $abhaAddress,
                    'gender' => isset($payload['gender']) ? strtoupper(substr($payload['gender'], 0, 1)) : 'O',
                    'dob' => isset($payload['yearOfBirth']) ? "{$payload['yearOfBirth']}-01-01" : null,
                ]);
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
