<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;

use App\Http\Traits\HasApiResponse;
use App\Services\Abdm\AbdmServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "2. ABHA — Mobile Login",
    description: "Flow A — मरीज़ के पास ABHA पहले से है (Mobile OTP से verify)"
)]
#[OA\Tag(
    name: "3. ABHA — Aadhaar Enrolment",
    description: "Flow B — नया ABHA बनाना (Aadhaar OTP से enrolment)"
)]
class AbhaController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected AbdmServiceInterface $abdmService
    ) {}

    #[OA\Post(
        path: "/api/v1/abha/generate-otp",
        summary: "Step A1 — Mobile OTP भेजो",
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
        summary: "Step A2 — Mobile OTP Verify करो",
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
        
        return $this->successResponse($response, 'OTP Verified Successfully');
    }

    #[OA\Post(
        path: "/api/v1/abha/enrol/aadhaar-otp",
        summary: "Step B1 — Aadhaar OTP भेजो",
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
        summary: "Step B2 — Aadhaar OTP Verify करो",
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
            'txnId' => 'required|string',
            'otp' => 'required|string',
            'mobile' => 'required|digits:10',
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
        summary: "Step B3 — Mobile OTP भेजो (Linking)",
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
        summary: "Step B4 — Mobile OTP Verify करो (Linking)",
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
        summary: "Step B5 — ABHA Address Suggestions लो",
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
        summary: "Step B6 — ABHA Address Choose करो",
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

        $response = $this->abdmService->createAbhaAddress(
            $request->txnId,
            $request->abhaAddress,
            $request->token
        );
        
        return $this->successResponse($response, 'ABHA Address Created Successfully');
    }

    #[OA\Get(
        path: "/api/v1/abha/profile",
        summary: "Step A3 — Profile Fetch करो",
        description: "Fetches full ABHA profile details (name, gender, dob, photo) using the X-Token from verify step.",
        security: [["bearerAuth" => []]],
        tags: ["2. ABHA — Mobile Login"]
    )]
    #[OA\Parameter(name: "token", in: "query", required: true, schema: new OA\Schema(type: "string"), description: "X-Token from verify step")]
    #[OA\Response(response: 200, description: "Profile details")]
    public function getProfile(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $response = $this->abdmService->getProfile($request->token);
        
        return $this->successResponse($response, 'Profile fetched successfully');
    }

    #[OA\Post(
        path: "/api/v1/abha/search",
        summary: "Mobile से ABHA खोजो",
        description: "Searches for ABHA records linked to a specific mobile number.",
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
        summary: "ABHA Card (PDF) Download करो",
        security: [["bearerAuth" => []]],
        tags: ["2. ABHA — Mobile Login"]
    )]
    #[OA\Parameter(name: "token", in: "query", required: true, schema: new OA\Schema(type: "string"), description: "X-Token from verify step")]
    #[OA\Response(response: 200, description: "Card downloaded")]
    public function downloadCard(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $response = $this->abdmService->downloadAbhaCard($request->token);
        
        return $this->successResponse($response, 'ABHA Card downloaded');
    }

    #[OA\Get(
        path: "/api/v1/abha/qr-code",
        summary: "ABHA QR Code Download करो",
        security: [["bearerAuth" => []]],
        tags: ["2. ABHA — Mobile Login"]
    )]
    #[OA\Parameter(name: "token", in: "query", required: true, schema: new OA\Schema(type: "string"), description: "X-Token from verify step")]
    #[OA\Response(response: 200, description: "QR Code downloaded")]
    public function downloadQrCode(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $response = $this->abdmService->downloadQrCode($request->token);
        
        return $this->successResponse($response, 'ABHA QR Code downloaded');
    }
}
