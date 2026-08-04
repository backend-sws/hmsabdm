<?php

namespace App\Services\Abdm;

use App\Exceptions\AbdmApiException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class RealAbdmService implements AbdmServiceInterface
{
    protected string $gatewayUrl;
    protected string $abhaUrl;
    protected string $clientId;
    protected string $clientSecret;

    public function __construct()
    {
        $this->gatewayUrl = config('services.abdm.gateway_url');
        $this->abhaUrl = config('services.abdm.abha_url');
        $this->clientId = config('services.abdm.client_id');
        $this->clientSecret = config('services.abdm.client_secret');
    }

    public function getGatewayToken(): string
    {
        return Cache::remember('abdm_gateway_token', 1100, function () {
            // NHA v3 sessions API for Gateway tokens
            $response = Http::withHeaders([
                'REQUEST-ID' => (string) Str::uuid(),
                'TIMESTAMP' => now()->setTimezone('UTC')->format('Y-m-d\TH:i:s.u\Z'),
                'X-CM-ID' => 'sbx'
            ])->post("{$this->gatewayUrl}/api/hiecm/gateway/v3/sessions", [
                'clientId' => $this->clientId,
                'clientSecret' => $this->clientSecret,
                'grantType' => 'client_credentials'
            ]);

            if ($response->failed()) {
                throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to get gateway token']);
            }

            return $response->json('accessToken');
        });
    }

    protected function getGatewayHeaders(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->getGatewayToken(),
            'X-CM-ID' => 'sbx',
            'REQUEST-ID' => (string) Str::uuid(),
            'TIMESTAMP' => now()->setTimezone('UTC')->format('Y-m-d\TH:i:s.u\Z'),
            'Content-Type' => 'application/json'
        ];
    }

    protected function httpClient()
    {
        // Handling Edge Cases (Timeout and Retry logic)
        return Http::timeout(10)->retry(2, 500, function (\Exception $exception, $request) {
            // If we get a 401 Unauthorized from ABDM, the token might be expired.
            // Clear the cache so the next request gets a fresh token.
            if ($exception instanceof \Illuminate\Http\Client\RequestException && $exception->response->status() === 401) {
                Cache::forget('abdm_gateway_token');
                // We cannot modify the headers of the retried request easily here, 
                // but clearing the cache ensures the next user action will succeed.
                // We return false to not retry immediately since the headers are already set.
                return false; 
            }
            return $exception instanceof \Illuminate\Http\Client\ConnectionException;
        });
    }

    public function getPublicKey(): string
    {
        return Cache::remember('abdm_public_key', 86400, function () {
            $response = $this->httpClient()
                ->withHeaders($this->getGatewayHeaders())
                ->get("{$this->abhaUrl}/v3/profile/public/certificate");

            if ($response->failed()) {
                throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to fetch public key']);
            }

            $body = $response->body();
            $json = json_decode($body, true);

            // ABDM returns publicKey as raw base64 string (without PEM headers)
            $rawKey = $json['publicKey'] ?? $body;

            return $this->normalizeToPem($rawKey);
        });
    }

    /**
     * Converts raw base64 key or existing PEM to a valid PEM public key.
     * ABDM's /v3/profile/public/certificate returns a bare base64 DER-encoded key.
     */
    protected function normalizeToPem(string $key): string
    {
        $key = trim($key);

        // Already a valid PEM — return as is
        if (str_contains($key, '-----BEGIN')) {
            return $key;
        }

        // Strip any accidental whitespace from the base64
        $key = preg_replace('/\s+/', '', $key);

        // Wrap to 64-char lines and add PEM headers
        $wrapped = chunk_split($key, 64, "\n");
        return "-----BEGIN PUBLIC KEY-----\n" . $wrapped . "-----END PUBLIC KEY-----\n";
    }

    public function encryptData(string $data): string
    {
        $pemKey = $this->getPublicKey();

        // Validate the key before use
        $keyResource = openssl_pkey_get_public($pemKey);
        if ($keyResource === false) {
            // Public key is corrupted or invalid — clear cache and retry once
            Cache::forget('abdm_public_key');
            $pemKey = $this->getPublicKey();
            $keyResource = openssl_pkey_get_public($pemKey);

            if ($keyResource === false) {
                throw new \App\Exceptions\AbdmApiException(
                    'ABDM public key is invalid. Could not encrypt data.',
                    'CRYPTO_ERROR',
                    [],
                    500
                );
            }
        }

        // ABDM requires RSA/ECB/OAEPWithSHA-1AndMGF1Padding
        // PHP equivalent: OPENSSL_PKCS1_OAEP_PADDING
        $success = openssl_public_encrypt($data, $encrypted, $keyResource, OPENSSL_PKCS1_OAEP_PADDING);

        if (!$success || empty($encrypted)) {
            throw new \App\Exceptions\AbdmApiException(
                'RSA encryption failed. Please check the ABDM public key.',
                'CRYPTO_ERROR',
                [],
                500
            );
        }

        return base64_encode($encrypted);
    }

    public function generateOtp(string $loginId, string $loginHint, array $scopes, string $otpSystem): array
    {
        // Enrolment and Login endpoints are slightly different in v3
        $endpoint = in_array('abha-login', $scopes) 
            ? "{$this->abhaUrl}/v3/profile/login/request/otp"
            : "{$this->abhaUrl}/v3/enrollment/request/otp";

        try {
            $response = $this->httpClient()
                ->withHeaders($this->getGatewayHeaders())
                ->post($endpoint, [
                    'scope' => $scopes,
                    'loginHint' => $loginHint,
                    'loginId' => $this->encryptData($loginId),
                    'otpSystem' => $otpSystem
                ]);

            if ($response->failed()) {
                throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to generate OTP']);
            }

            return $response->json();
        } catch (\Illuminate\Http\Client\RequestException $e) {
            throw AbdmApiException::fromResponse($e->response->json() ?? ['message' => 'Failed to generate OTP: ' . $e->getMessage()]);
        }
    }

    public function verifyOtp(string $txnId, string $otpValue, array $scopes): array
    {
        $endpoint = in_array('abha-login', $scopes)
            ? "{$this->abhaUrl}/v3/profile/login/verify"
            : "{$this->abhaUrl}/v3/enrollment/enrol/byAadhaar";

        // M1 spec requires the OTP to be encrypted
        $encryptedOtp = $this->encryptData($otpValue);

        $payload = [
            'scope' => $scopes,
            'authData' => [
                'authMethods' => ['otp'],
                'otp' => [
                    'txnId' => $txnId,
                    'otpValue' => $encryptedOtp,
                ]
            ]
        ];

        $response = $this->httpClient()
            ->withHeaders($this->getGatewayHeaders())
            ->post($endpoint, $payload);

        $responseData = $response->json();

        // Handle 200 OK but with authResult = failed
        if (isset($responseData['authResult']) && strtolower($responseData['authResult']) === 'failed') {
            throw AbdmApiException::fromResponse($responseData, 400);
        }

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($responseData ?? ['message' => 'Failed to verify OTP']);
        }

        return $responseData;
    }

    public function generateAadhaarOtp(string $aadhaar, array $scopes = ['abha-enrol']): array
    {
        try {
            $response = $this->httpClient()
                ->withHeaders($this->getGatewayHeaders())
                ->post("{$this->abhaUrl}/v3/enrollment/request/otp", [
                    'scope' => $scopes,
                    'loginHint' => 'aadhaar',
                    'loginId' => $this->encryptData($aadhaar),
                    'otpSystem' => 'aadhaar'
                ]);

            if ($response->failed()) {
                throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to generate Aadhaar OTP']);
            }

            return $response->json();
        } catch (\Illuminate\Http\Client\RequestException $e) {
            throw AbdmApiException::fromResponse($e->response->json() ?? ['message' => 'Failed to generate Aadhaar OTP: ' . $e->getMessage()]);
        }
    }

    public function verifyAadhaarOtp(string $txnId, string $otpValue, string $mobile, array $scopes = ['abha-enrol']): array
    {
        $encryptedOtp = $this->encryptData($otpValue);

        $payload = [
            'authData' => [
                'authMethods' => ['otp'],
                'otp' => [
                    'txnId' => $txnId,
                    'otpValue' => $encryptedOtp,
                    'mobile' => $mobile
                ]
            ],
            'consent' => [
                'code' => 'abha-enrollment',
                'version' => '1.4'
            ]
        ];

        $response = $this->httpClient()
            ->withHeaders($this->getGatewayHeaders())
            ->post("{$this->abhaUrl}/v3/enrollment/enrol/byAadhaar", $payload);

        $responseData = $response->json();

        // Handle 200 OK but with authResult = failed
        if (isset($responseData['authResult']) && strtolower($responseData['authResult']) === 'failed') {
            throw AbdmApiException::fromResponse($responseData, 400);
        }

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($responseData ?? ['message' => 'Failed to verify Aadhaar OTP']);
        }

        return $responseData;
    }

    public function getProfile(string $token): array
    {
        $response = Http::withToken($token)
            ->withHeaders([
                'X-CM-ID' => 'sbx'
            ])
            ->get("{$this->abhaUrl}/v3/profile/account");

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to fetch profile']);
        }

        return $response->json();
    }

    public function decryptScanAndSharePayload(string $encryptedPayload): array
    {
        // For Sandbox M1, Scan and Share webhook decryption uses HIP private key (out of scope for ABHA creation APIs)
        return [];
    }

    public function generateMobileOtpForLinking(string $mobile, string $txnId, array $scopes = ['abha-enrol', 'mobile-verify']): array
    {
        $response = $this->httpClient()
            ->withHeaders($this->getGatewayHeaders())
            ->post("{$this->abhaUrl}/v3/enrollment/request/otp", [
                'scope' => $scopes,
                'loginHint' => 'mobile',
                'loginId' => $this->encryptData($mobile),
                'otpSystem' => 'abdm'
            ]);

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to generate Mobile OTP']);
        }

        return $response->json();
    }

    public function verifyMobileOtpForLinking(string $txnId, string $otpValue, array $scopes = ['abha-enrol', 'mobile-verify']): array
    {
        $payload = [
            'scope' => $scopes,
            'authData' => [
                'authMethods' => ['otp'],
                'otp' => [
                    'txnId' => $txnId,
                    'otpValue' => $this->encryptData($otpValue)
                ]
            ]
        ];

        $response = $this->httpClient()
            ->withHeaders($this->getGatewayHeaders())
            ->post("{$this->abhaUrl}/v3/enrollment/enrol/auth/byAbdm", $payload);

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to verify Mobile OTP']);
        }

        return $response->json();
    }

    public function suggestAbhaAddress(string $txnId): array
    {
        $response = $this->httpClient()
            ->withHeaders($this->getGatewayHeaders())
            ->get("{$this->abhaUrl}/v3/enrollment/enrol/suggestion?transactionId={$txnId}");

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to fetch suggestions']);
        }

        return $response->json();
    }

    public function createAbhaAddress(string $txnId, string $abhaAddress): array
    {
        $response = $this->httpClient()
            ->withHeaders($this->getGatewayHeaders())
            ->post("{$this->abhaUrl}/v3/enrollment/enrol/abha-address", [
                'transactionId' => $txnId,
                'abhaAddress' => $abhaAddress
            ]);

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to create ABHA Address']);
        }

        return $response->json();
    }

    public function searchAbha(string $mobile): array
    {
        $response = $this->httpClient()
            ->withHeaders($this->getGatewayHeaders())
            ->post("{$this->abhaUrl}/v3/profile/account/abha/search", [
                'scope' => ['search-abha'],
                'mobile' => $this->encryptData($mobile)
            ]);

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to search ABHA']);
        }

        return $response->json();
    }

    public function downloadAbhaCard(string $token): array
    {
        $headers = $this->getGatewayHeaders();
        $headers['X-Token'] = "Bearer {$token}";

        $response = $this->httpClient()
            ->withHeaders($headers)
            ->get("{$this->abhaUrl}/v3/profile/account/abha-card");

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to download ABHA card']);
        }

        return ['data' => base64_encode($response->body())];
    }

    public function downloadQrCode(string $token): array
    {
        $headers = $this->getGatewayHeaders();
        $headers['X-Token'] = "Bearer {$token}";

        $response = $this->httpClient()
            ->withHeaders($headers)
            ->get("{$this->abhaUrl}/v3/profile/account/qr-code");

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to download QR code']);
        }

        return ['data' => base64_encode($response->body())];
    }
}
