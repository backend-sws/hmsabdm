<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;

use App\Http\Traits\HasApiResponse;
use App\Services\Abdm\AbdmServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "2. ABHA — Mobile Login",
    description: "Flow A — Patient has existing ABHA (Verify via Mobile OTP)"
)]
#[OA\Tag(
    name: "3. ABHA — Aadhaar Enrolment",
    description: "Flow B — Create New ABHA (Enrolment via Aadhaar OTP)"
)]
class AbhaController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected AbdmServiceInterface $abdmService
    ) {}

    #[OA\Post(
        path: "/api/v1/abha/generate-otp",
        summary: "Step A1 — Send Mobile OTP",
        description: "Initiates the ABHA login flow. Sends a 6-digit OTP to the user's mobile number registered with ABHA.",
        security: [["bearerAuth" => []]],
        tags: ["2. ABHA — Mobile Login"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "mobile", type: "string", example: "9876543210")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "OTP Sent")]
    public function generateOtp(Request $request)
    {
        $request->validate(['mobile' => 'required|digits:10']);
        
        $scopes = ['abha-login', 'mobile-verify'];
        $response = $this->abdmService->generateOtp(
            $request->mobile,
            'mobile',
            $scopes,
            'abdm'
        );
        
        return $this->successResponse($response, 'OTP Sent Successfully');
    }

    #[OA\Post(
        path: "/api/v1/abha/verify-otp",
        summary: "Step A2 — Verify Mobile OTP",
        description: "Verifies the OTP received by the user. Requires the txnId returned in Step A1.",
        security: [["bearerAuth" => []]],
        tags: ["2. ABHA — Mobile Login"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "txnId", type: "string"),
                new OA\Property(property: "otp", type: "string", example: "123456")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "OTP Verified")]
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'txnId' => 'required|string',
            'otp' => 'required|string',
        ]);

        $scopes = ['abha-login', 'mobile-verify'];
        $response = $this->abdmService->verifyOtp(
            $request->txnId,
            $request->otp,
            $scopes
        );

        $transferToken = $response['token'] ?? null;
        $accounts = $response['accounts'] ?? [];
        $txnId = $response['txnId'] ?? $request->txnId;

        // In ABDM V3 Mobile Login, verifyOtp returns a 5-minute Transfer token (typ: Transfer) and linked accounts.
        // To get the actual 30-minute Account Token (typ: Transaction) and download the authentic ABHA card,
        // we exchange the Transfer token via POST /v3/profile/login/verify/user for the primary/first account.
        if (!empty($transferToken) && !empty($accounts) && is_array($accounts)) {
            $firstAccount = $accounts[0];
            $selectedAbhaNumber = $firstAccount['ABHANumber'] ?? $firstAccount['abha_number'] ?? null;

            if (!empty($selectedAbhaNumber)) {
                try {
                    $userRes = $this->abdmService->verifyUser($transferToken, $txnId, $selectedAbhaNumber);
                    if (!empty($userRes['token'])) {
                        // Replace Transfer token with authentic Transaction token
                        $response['token'] = $userRes['token'];
                        $response['accounts'][0]['token'] = $userRes['token'];
                        $response['account_token'] = $userRes['token'];
                        $response['transfer_token'] = $transferToken;
                        \Illuminate\Support\Facades\Log::info("verifyOtp: successfully exchanged Transfer token for Account token for {$selectedAbhaNumber}");
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning("verifyOtp: automatic verifyUser exchange failed: " . $e->getMessage());
                }
            }
        }

        // Extract user token from response (now the Transaction token)
        $userToken = $response['token'] 
            ?? $response['tokens']['token'] 
            ?? $response['jwtResponse'] 
            ?? $response['accounts'][0]['token'] 
            ?? $response['accounts'][0]['tokens']['token'] 
            ?? $response['accounts'][0]['jwtResponse']
            ?? $response['authResult']['token']
            ?? null;

        if (!empty($userToken)) {
            try {
                $cardRes = $this->abdmService->downloadAbhaCard($userToken);
                if (!empty($cardRes['data'])) {
                    $response['abha_card_base64'] = $cardRes['data'];
                    \Illuminate\Support\Facades\Log::info("verifyOtp: official ABHA card successfully fetched (" . strlen($cardRes['data']) . " bytes)");
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("verifyOtp: auto-download card failed: " . $e->getMessage());
            }
        }

        // Auto-save to patient record in DB if found
        $abhaNumber = $response['accounts'][0]['ABHANumber'] 
            ?? $response['accounts'][0]['abha_number'] 
            ?? $response['ABHAProfile']['ABHANumber'] 
            ?? $response['abha_number'] 
            ?? null;

        if (!empty($abhaNumber) && !empty($response['abha_card_base64'])) {
            $patient = \App\Models\Patient::where('abha_number', $abhaNumber)->first();
            if ($patient) {
                $patient->update(['abha_card_pdf' => $response['abha_card_base64']]);
                \Illuminate\Support\Facades\Log::info("verifyOtp: official ABHA card auto-saved to DB for patient ID {$patient->id}");
            }
        }
        
        return $this->successResponse($response, 'OTP Verified Successfully');
    }

    #[OA\Post(
        path: "/api/v1/abha/verify-user",
        summary: "Exchange Transfer token for Account token by selecting ABHA number",
        description: "Exchanges Transfer token (from mobile login) for Account token and fetches the official ABHA card.",
        security: [["bearerAuth" => []]],
        tags: ["3. ABHA — Mobile Login"]
    )]
    #[OA\Response(response: 200, description: "Account token exchanged successfully")]
    public function verifyUser(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'txnId' => 'required|string',
            'abhaNumber' => 'required|string',
        ]);

        $response = $this->abdmService->verifyUser(
            $request->token,
            $request->txnId,
            $request->abhaNumber
        );

        $accountToken = $response['token'] ?? null;
        if (!empty($accountToken)) {
            try {
                $cardRes = $this->abdmService->downloadAbhaCard($accountToken);
                if (!empty($cardRes['data'])) {
                    $response['abha_card_base64'] = $cardRes['data'];
                    
                    // Auto-save to patient in DB if exists
                    $patient = \App\Models\Patient::where('abha_number', $request->abhaNumber)->first();
                    if ($patient) {
                        $patient->update(['abha_card_pdf' => $cardRes['data']]);
                        \Illuminate\Support\Facades\Log::info("verifyUser: official ABHA card auto-saved to DB for patient ID {$patient->id}");
                    }
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("verifyUser: auto-download card failed: " . $e->getMessage());
            }
        }

        return $this->successResponse($response, 'ABHA Account Verified Successfully');
    }

    #[OA\Post(
        path: "/api/v1/abha/enrol/aadhaar-otp",
        summary: "Step B1 — Send Aadhaar OTP",
        description: "Initiates the ABHA Enrolment flow by sending an OTP to the mobile linked with Aadhaar.",
        security: [["bearerAuth" => []]],
        tags: ["3. ABHA — Aadhaar Enrolment"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "aadhaar", type: "string", example: "123456789012")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Aadhaar OTP Sent")]
    public function generateAadhaarOtp(Request $request)
    {
        $request->validate(['aadhaar' => 'required|digits:12']);
        
        $response = $this->abdmService->generateAadhaarOtp($request->aadhaar);
        
        return $this->successResponse($response, 'Aadhaar OTP Sent Successfully');
    }

    #[OA\Post(
        path: "/api/v1/abha/enrol/verify-aadhaar",
        summary: "Step B2 — Verify Aadhaar OTP",
        description: "Verifies Aadhaar OTP. Pass the txnId from Step B1. If verified, ABDM links the provided mobile number.",
        security: [["bearerAuth" => []]],
        tags: ["3. ABHA — Aadhaar Enrolment"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "txnId", type: "string"),
                new OA\Property(property: "otp", type: "string", example: "123456"),
                new OA\Property(property: "mobile", type: "string", example: "9876543210")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Aadhaar OTP Verified")]
    public function verifyAadhaarOtp(Request $request)
    {
        $request->validate([
            'txnId'  => 'required|string',
            'otp'    => 'required|string',
            'mobile' => 'required|digits:10',
        ], [
            'mobile.required' => 'Communication mobile number is required by ABDM to link with the new ABHA account.',
            'mobile.digits'   => 'Communication mobile must be a valid 10-digit number.',
        ]);

        $response = $this->abdmService->verifyAadhaarOtp(
            $request->txnId,
            $request->otp,
            $request->mobile
        );
        
        return $this->successResponse($response, 'Aadhaar OTP Verified Successfully');
    }

    #[OA\Post(
        path: "/api/v1/abha/enrol/mobile-otp",
        summary: "Step B3 — Send Mobile OTP (Linking)",
        description: "Sends a secondary OTP to verify the mobile number for linking with the newly created ABHA.",
        security: [["bearerAuth" => []]],
        tags: ["3. ABHA — Aadhaar Enrolment"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "txnId", type: "string"),
                new OA\Property(property: "mobile", type: "string", example: "9876543210")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Mobile OTP Sent")]
    public function generateMobileOtpForLinking(Request $request)
    {
        $request->validate([
            'txnId' => 'required|string',
            'mobile' => 'required|digits:10'
        ]);
        
        $response = $this->abdmService->generateMobileOtpForLinking(
            $request->mobile,
            $request->txnId
        );
        
        return $this->successResponse($response, 'Mobile OTP for linking Sent Successfully');
    }

    #[OA\Post(
        path: "/api/v1/abha/enrol/verify-mobile",
        summary: "Step B4 — Verify Mobile OTP (Linking)",
        description: "Verifies the Mobile OTP from Step B3 to finalize linking.",
        security: [["bearerAuth" => []]],
        tags: ["3. ABHA — Aadhaar Enrolment"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "txnId", type: "string"),
                new OA\Property(property: "otp", type: "string", example: "123456")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Mobile OTP Verified")]
    public function verifyMobileOtpForLinking(Request $request)
    {
        $request->validate([
            'txnId' => 'required|string',
            'otp' => 'required|string',
        ]);

        $response = $this->abdmService->verifyMobileOtpForLinking(
            $request->txnId,
            $request->otp
        );
        
        return $this->successResponse($response, 'Mobile Linked Successfully');
    }

    #[OA\Get(
        path: "/api/v1/abha/enrol/suggest-address",
        summary: "Step B5 — Get ABHA Address Suggestions",
        description: "Fetches a list of available ABHA addresses (usernames) based on user's Aadhaar data.",
        security: [["bearerAuth" => []]],
        tags: ["3. ABHA — Aadhaar Enrolment"]
    )]
    #[OA\Parameter(name: "txnId", in: "query", required: true, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "token", in: "query", required: true, schema: new OA\Schema(type: "string"), description: "X-Token from verify step")]
    #[OA\Response(response: 200, description: "Suggestions retrieved")]
    public function suggestAbhaAddress(Request $request)
    {
        $request->validate([
            'txnId' => 'required|string',
            'token' => 'required|string',
        ]);

        $response = $this->abdmService->suggestAbhaAddress($request->txnId, $request->token);
        
        return $this->successResponse($response, 'ABHA Address Suggestions retrieved');
    }

    #[OA\Post(
        path: "/api/v1/abha/enrol/create-address",
        summary: "Step B6 — Select ABHA Address",
        description: "Finalizes the ABHA enrolment by selecting one of the suggested ABHA addresses.",
        security: [["bearerAuth" => []]],
        tags: ["3. ABHA — Aadhaar Enrolment"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "txnId", type: "string"),
                new OA\Property(property: "token", type: "string", description: "X-Token from verify step"),
                new OA\Property(property: "abhaAddress", type: "string", example: "rohit123@abdm")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Address Created")]
    public function createAbhaAddress(Request $request)
    {
        $request->validate([
            'txnId' => 'required|string',
            'abhaAddress' => 'required|string',
            'token' => 'required|string',
        ]);

        // NHA CRT_ABHA_112 Validation
        $handle = explode('@', $request->abhaAddress)[0];
        if (
            strlen($handle) < 8 || 
            strlen($handle) > 18 || 
            !preg_match('/^[a-zA-Z0-9]+([._][a-zA-Z0-9]+)*$/', $handle) ||
            substr_count($handle, '.') > 1 ||
            substr_count($handle, '_') > 1
        ) {
            return $this->errorResponse(
                'ABHA address handle must be 8-18 characters, alphanumeric, with at most one dot (.) or underscore (_) not at start/end (NHA CRT_ABHA_112).',
                null,
                422
            );
        }

        $response = $this->abdmService->createAbhaAddress(
            $request->txnId,
            $request->abhaAddress,
            $request->token
        );
        
        return $this->successResponse($response, 'ABHA Address Created Successfully');
    }

    #[OA\Get(
        path: "/api/v1/abha/profile",
        summary: "Step B7 — Fetch Aadhaar Profile Details",
        description: "Fetches full ABHA profile details (name, gender, dob, photo, address) using the X-Token from Aadhaar Enrolment verify step (Step B2).",
        security: [["bearerAuth" => []]],
        tags: ["3. ABHA — Aadhaar Enrolment"]
    )]
    #[OA\Parameter(name: "token", in: "query", required: true, schema: new OA\Schema(type: "string"), description: "X-Token from Step B2 (verify-aadhaar)")]
    #[OA\Response(response: 200, description: "Profile details")]
    public function getProfile(Request $request)
    {
        $token = $request->query('token') ?? $request->header('X-Abha-Token') ?? $request->input('token');
        if (empty($token)) {
            return $this->errorResponse('Token is required.', null, 422);
        }

        $response = $this->abdmService->getProfile($token);
        
        return $this->successResponse($response, 'Profile fetched successfully');
    }

    #[OA\Post(
        path: "/api/v1/abha/search",
        summary: "Step A0 — Search ABHA by Mobile",
        description: "Searches for ABHA records linked to a specific mobile number before sending login OTP.",
        security: [["bearerAuth" => []]],
        tags: ["2. ABHA — Mobile Login"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "mobile", type: "string", example: "9876543210")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Search Results")]
    public function searchAbha(Request $request)
    {
        $request->validate([
            'mobile' => 'required|digits:10',
        ]);

        $response = $this->abdmService->searchAbha($request->mobile);
        
        return $this->successResponse($response, 'ABHA Search Results');
    }

    #[OA\Get(
        path: "/api/v1/abha/card",
        summary: "Step B8 — Download ABHA Card (PDF/Image)",
        description: "Downloads the official ABHA card base64 image/PDF using the X-Token from Step B2. Optionally pass patient_id or abha_number to auto-save the card to DB.",
        security: [["bearerAuth" => []]],
        tags: ["3. ABHA — Aadhaar Enrolment"]
    )]
    #[OA\Parameter(name: "token", in: "query", required: true, schema: new OA\Schema(type: "string"), description: "X-Token from Step B2 (verify-aadhaar)")]
    #[OA\Parameter(name: "patient_id", in: "query", required: false, schema: new OA\Schema(type: "string"), description: "Optional: Hospital patient ID to auto-save card to DB")]
    #[OA\Parameter(name: "abha_number", in: "query", required: false, schema: new OA\Schema(type: "string"), description: "Optional: ABHA number to auto-save card to DB")]
    #[OA\Response(response: 200, description: "Card downloaded")]
    public function downloadCard(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $token = $request->token;
        // Check if token is a Transfer token and auto-exchange if txnId and abha_number are provided
        $rawToken = trim(str_replace('Bearer ', '', $token));
        $jwtParts = explode('.', $rawToken);
        if (count($jwtParts) === 3) {
            $jwtPayload = json_decode(base64_decode(strtr($jwtParts[1], '-_', '+/')), true);
            if (($jwtPayload['typ'] ?? '') === 'Transfer') {
                $txnId = $request->query('txnId') ?? $request->query('txn_id') ?? $request->input('txnId');
                $abhaNumber = $request->query('abha_number') ?? $request->query('ABHANumber') ?? $request->input('abha_number');
                if (!empty($txnId) && !empty($abhaNumber)) {
                    try {
                        $verifyUserRes = $this->abdmService->verifyUser($rawToken, $txnId, $abhaNumber);
                        if (!empty($verifyUserRes['token'])) {
                            $token = $verifyUserRes['token'];
                            \Illuminate\Support\Facades\Log::info("downloadCard: auto-exchanged Transfer token for Account token for {$abhaNumber}");
                        }
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::warning("downloadCard: automatic Transfer token exchange failed: " . $e->getMessage());
                    }
                }
            }
        }

        $response = $this->abdmService->downloadAbhaCard($token);
        $base64 = $response['data'] ?? '';

        // Auto-save base64 card to DB if patient identifier is provided
        if (!empty($base64)) {
            $patient = null;

            if ($request->filled('patient_id')) {
                $pid = $request->query('patient_id');
                $patient = \App\Models\Patient::where('id', is_numeric($pid) ? (int)$pid : 0)
                    ->orWhere('uhid', $pid)
                    ->first();
            }

            if (!$patient && $request->filled('abha_number')) {
                $patient = \App\Models\Patient::where('abha_number', $request->query('abha_number'))->first();
            }

            if (!$patient && $request->filled('mobile')) {
                $patient = \App\Models\Patient::where('mobile', $request->query('mobile'))->first();
            }

            if ($patient) {
                // Ensure it's valid base64 string
                if (!preg_match('~^[a-zA-Z0-9+/=\s]+$~', $base64)) {
                    $base64 = base64_encode($base64);
                }
                // Normalise: unwrap accidental double-encoding
                $binary = base64_decode($base64, true);
                if ($binary !== false && (str_starts_with($binary, 'JVBER') || str_starts_with($binary, '"JVBER') || str_starts_with($binary, 'iVBOR'))) {
                    $base64 = trim($binary, '"');
                }
                $patient->update(['abha_card_pdf' => $base64]);
                \Illuminate\Support\Facades\Log::info("ABHA card auto-saved to DB for patient {$patient->id}");
            }
        }

        // If client requests raw binary PDF (format=pdf or Accept: application/pdf)
        if ($request->query('format') === 'pdf' || $request->header('Accept') === 'application/pdf') {
            $binary = base64_decode($base64);
            // In case of double encoding:
            if (str_starts_with($binary, 'JVBER') || str_starts_with($binary, '"JVBER')) {
                $binary = base64_decode(trim($binary, '"'));
            }

            if (str_starts_with($binary, '%PDF')) {
                return response($binary, 200, [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => 'attachment; filename="official_abha_card.pdf"',
                ]);
            }

            // If binary is an authentic government image (PNG/JPEG), convert to 1-page PDF
            $mime = str_starts_with($binary, "\x89PNG") ? 'image/png' : 'image/jpeg';
            $b64Img = base64_encode($binary);
            $html = '<!DOCTYPE html><html><head><style>@page { margin: 0; size: 500pt 315pt; } body { margin: 0; padding: 0; background: #ffffff; text-align: center; } img { width: 100%; height: auto; display: block; }</style></head><body><img src="data:' . $mime . ';base64,' . $b64Img . '" /></body></html>';

            $options = new \Dompdf\Options();
            $options->set('isRemoteEnabled', true);
            $dompdf = new \Dompdf\Dompdf($options);
            $dompdf->loadHtml($html);
            $dompdf->setPaper([0, 0, 500, 315], 'portrait');
            $dompdf->render();

            return response($dompdf->output(), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="official_abha_card.pdf"',
            ]);
        }

        return $this->successResponse(['data' => $base64], 'ABHA Card downloaded');
    }

    #[OA\Get(
        path: "/api/v1/abha/qr-code",
        summary: "Step B9 — Download ABHA QR Code",
        description: "Downloads the ABHA QR Code image using the X-Token from Step B2.",
        security: [["bearerAuth" => []]],
        tags: ["3. ABHA — Aadhaar Enrolment"]
    )]
    #[OA\Parameter(name: "token", in: "query", required: true, schema: new OA\Schema(type: "string"), description: "X-Token from Step B2 (verify-aadhaar)")]
    #[OA\Response(response: 200, description: "QR Code downloaded")]
    public function downloadQrCode(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $response = $this->abdmService->downloadQrCode($request->token);
        $base64 = $response['data'] ?? '';

        if ($request->query('format') === 'png' || $request->header('Accept') === 'image/png') {
            $binary = base64_decode($base64);
            return response($binary, 200, [
                'Content-Type' => 'image/png',
                'Content-Disposition' => 'attachment; filename="abha_qr.png"',
            ]);
        }
        
        return $this->successResponse(['data' => $base64], 'ABHA QR Code downloaded');
    }
}
