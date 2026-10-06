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

        try {
            $response = $this->httpClient()
                ->withHeaders($this->getGatewayHeaders())
                ->post($endpoint, $payload);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            $response = $e->response;
        }

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

        try {
            $response = $this->httpClient()
                ->withHeaders($this->getGatewayHeaders())
                ->post("{$this->abhaUrl}/v3/enrollment/enrol/byAadhaar", $payload);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            $response = $e->response;
        }

        $responseData = $response->json();

        // Handle 200 OK but with authResult = failed
        if (isset($responseData['authResult']) && strtolower($responseData['authResult']) === 'failed') {
            throw AbdmApiException::fromResponse($responseData, 400);
        }

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($responseData ?? ['message' => 'Failed to verify Aadhaar OTP']);
        }

        // 1. Extract Token safely across ABDM response variations
        $jwtToken = $responseData['token'] 
            ?? $responseData['tokens']['token'] 
            ?? $responseData['jwtResponse'] 
            ?? null;
        $responseData['token'] = $jwtToken;

        // 2. Decode JWT payload if available
        $jwtPayload = $jwtToken ? $this->decodeJwtPayload($jwtToken) : [];
        if ($jwtPayload) {
            \Illuminate\Support\Facades\Log::info('ABDM byAadhaar JWT Payload:', [
                'preferredAbhaAddress' => $jwtPayload['preferredAbhaAddress'] ?? null,
                'abhaNumber' => $jwtPayload['abhaNumber'] ?? null,
                'name' => $jwtPayload['name'] ?? null,
            ]);
        }

        // 3. Try fetching full verified account profile from ABDM /v3/profile/account
        $fetchedProfile = [];
        if ($jwtToken) {
            try {
                $fetchedProfile = $this->getProfile($jwtToken);
                \Illuminate\Support\Facades\Log::info('ABDM byAadhaar Fetched Profile Successfully', [
                    'name' => $fetchedProfile['name'] ?? null,
                    'preferredAbhaAddress' => $fetchedProfile['preferredAbhaAddress'] ?? null,
                    'ABHANumber' => $fetchedProfile['ABHANumber'] ?? null,
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('ABDM byAadhaar: Profile fetch note: ' . $e->getMessage());
            }
        }

        // 4. Resolve Real Patient Name
        $name = $fetchedProfile['name'] 
            ?? $responseData['ABHAProfile']['name'] 
            ?? $responseData['name'] 
            ?? $jwtPayload['name'] 
            ?? null;

        if (!$name) {
            $fName = $fetchedProfile['firstName'] ?? $responseData['ABHAProfile']['firstName'] ?? $jwtPayload['firstName'] ?? '';
            $mName = $fetchedProfile['middleName'] ?? $responseData['ABHAProfile']['middleName'] ?? $jwtPayload['middleName'] ?? '';
            $lName = $fetchedProfile['lastName'] ?? $responseData['ABHAProfile']['lastName'] ?? $jwtPayload['lastName'] ?? '';
            $assembledName = trim("{$fName} {$mName} {$lName}");
            if (!empty($assembledName)) {
                $name = $assembledName;
            }
        }

        // 5. Resolve ABHA Number (14-digit)
        $abhaNumber = $fetchedProfile['ABHANumber'] 
            ?? $fetchedProfile['abhaNumber'] 
            ?? $fetchedProfile['healthIdNumber'] 
            ?? $responseData['ABHANumber'] 
            ?? $responseData['abhaNumber'] 
            ?? $responseData['ABHAProfile']['ABHANumber'] 
            ?? $responseData['ABHAProfile']['abhaNumber'] 
            ?? $jwtPayload['abhaNumber'] 
            ?? $jwtPayload['healthIdNumber'] 
            ?? null;

        // 6. Resolve Preferred ABHA Address Handle (e.g. user@sbx)
        $preferredAbhaAddress = $fetchedProfile['preferredAbhaAddress'] 
            ?? $fetchedProfile['abhaAddress'] 
            ?? $responseData['preferredAbhaAddress'] 
            ?? $responseData['abhaAddress'] 
            ?? $responseData['ABHAProfile']['preferredAbhaAddress'] 
            ?? $responseData['ABHAProfile']['abhaAddress'] 
            ?? $jwtPayload['preferredAbhaAddress'] 
            ?? $jwtPayload['abhaAddress'] 
            ?? null;

        // 7. Resolve Gender & DOB
        $gender = $fetchedProfile['gender'] 
            ?? $responseData['ABHAProfile']['gender'] 
            ?? $responseData['gender'] 
            ?? $jwtPayload['gender'] 
            ?? null;

        $dob = $fetchedProfile['dob'] 
            ?? $responseData['ABHAProfile']['dob'] 
            ?? $responseData['dob'] 
            ?? $jwtPayload['dob'] 
            ?? null;

        if (!$dob) {
            $yob = $fetchedProfile['yearOfBirth'] ?? $responseData['ABHAProfile']['yearOfBirth'] ?? $jwtPayload['yearOfBirth'] ?? null;
            $mob = $fetchedProfile['monthOfBirth'] ?? $responseData['ABHAProfile']['monthOfBirth'] ?? $jwtPayload['monthOfBirth'] ?? '01';
            $dobDay = $fetchedProfile['dayOfBirth'] ?? $responseData['ABHAProfile']['dayOfBirth'] ?? $jwtPayload['dayOfBirth'] ?? '01';
            if ($yob) {
                $dob = sprintf('%04d-%02d-%02d', (int)$yob, (int)$mob, (int)$dobDay);
            }
        }

        // 8. Determine if patient already has an existing ABHA
        $isNew = $responseData['isNew'] ?? (empty($preferredAbhaAddress) && empty($abhaNumber));
        $hasExistingAbha = !empty($preferredAbhaAddress) || ($isNew === false);

        $responseData['hasExistingAbha'] = $hasExistingAbha;
        $responseData['isNew'] = $isNew;
        $responseData['preferredAbhaAddress'] = $preferredAbhaAddress;
        $responseData['abhaAddress'] = $preferredAbhaAddress;
        $responseData['abhaNumber'] = $abhaNumber;
        $responseData['ABHANumber'] = $abhaNumber;
        $responseData['name'] = $name;

        // Resolve robust demographics & photo across ABDM response structures
        $photo = $fetchedProfile['profilePhoto'] 
            ?? $fetchedProfile['photo'] 
            ?? $responseData['ABHAProfile']['profilePhoto'] 
            ?? $responseData['ABHAProfile']['photo'] 
            ?? $responseData['profilePhoto'] 
            ?? $responseData['photo'] 
            ?? null;

        $address = $fetchedProfile['address'] 
            ?? $fetchedProfile['addressLine'] 
            ?? $responseData['ABHAProfile']['address'] 
            ?? $responseData['ABHAProfile']['addressLine'] 
            ?? $responseData['address'] 
            ?? null;

        $district = $fetchedProfile['districtName'] 
            ?? $fetchedProfile['district'] 
            ?? $responseData['ABHAProfile']['districtName'] 
            ?? $responseData['ABHAProfile']['district'] 
            ?? $responseData['districtName'] 
            ?? $responseData['district'] 
            ?? null;

        $state = $fetchedProfile['stateName'] 
            ?? $fetchedProfile['state'] 
            ?? $responseData['ABHAProfile']['stateName'] 
            ?? $responseData['ABHAProfile']['state'] 
            ?? $responseData['stateName'] 
            ?? $responseData['state'] 
            ?? null;

        $pincode = $fetchedProfile['pincode'] 
            ?? $fetchedProfile['pinCode'] 
            ?? $responseData['ABHAProfile']['pincode'] 
            ?? $responseData['ABHAProfile']['pinCode'] 
            ?? $responseData['pincode'] 
            ?? null;

        // Build standard profile object
        $profileData = [
            'name'                 => $name,
            'abhaNumber'           => $abhaNumber,
            'ABHANumber'           => $abhaNumber,
            'abhaAddress'          => $preferredAbhaAddress,
            'preferredAbhaAddress' => $preferredAbhaAddress,
            'gender'               => $gender,
            'dob'                  => $dob,
            'mobile'               => $mobile,
            'address'              => $address,
            'district'             => $district,
            'districtName'         => $district,
            'state'                => $state,
            'stateName'            => $state,
            'pincode'              => $pincode,
            'photo'                => $photo,
            'profilePhoto'         => $photo,
            'hasExistingAbha'      => $hasExistingAbha,
        ];

        $responseData['photo']        = $photo;
        $responseData['profilePhoto'] = $photo;
        $responseData['address']      = $address;
        $responseData['district']     = $district;
        $responseData['state']        = $state;
        $responseData['pincode']      = $pincode;
        $responseData['profile']      = $profileData;
        $responseData['ABHAProfile']  = $profileData;

        return $responseData;
    }

    public function getProfile(string $token): array
    {
        $rawToken = trim(str_replace('Bearer ', '', $token));
        $bearerToken = "Bearer {$rawToken}";
        $url = "{$this->abhaUrl}/v3/profile/account";

        // Headers matching ABDM Milestone 1 Postman Collection exactly:
        $baseHeaders = [
            'Authorization' => 'Bearer ' . $this->getGatewayToken(),
            'REQUEST-ID' => (string) Str::uuid(),
            'TIMESTAMP' => now()->setTimezone('UTC')->format('Y-m-d\TH:i:s.u\Z'),
            'Content-Type' => 'application/json',
        ];

        $attempts = [
            array_merge($baseHeaders, ['X-token' => $bearerToken]),
            array_merge($baseHeaders, ['X-token' => $rawToken]),
            array_merge($baseHeaders, ['X-token' => $bearerToken, 'X-Token' => $bearerToken]),
        ];

        $response = null;
        $lastFailure = null;
        foreach ($attempts as $hdrs) {
            try {
                $resp = $this->httpClient()->withHeaders($hdrs)->get($url);
                if ($resp && $resp->successful()) {
                    $response = $resp;
                    break;
                }
                $lastFailure = $resp;
            } catch (\Illuminate\Http\Client\RequestException $e) {
                $lastFailure = $e->response;
                \Illuminate\Support\Facades\Log::warning("getProfile RequestException", ['url' => $url, 'status' => $e->response?->status(), 'body' => $e->response?->body()]);
            } catch (\GuzzleHttp\Exception\RequestException $e) {
                if ($e->hasResponse()) {
                    $lastFailure = new \Illuminate\Http\Client\Response($e->getResponse());
                }
                \Illuminate\Support\Facades\Log::warning("getProfile GuzzleException", ['url' => $url, 'error' => $e->getMessage()]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("getProfile exception", ['url' => $url, 'error' => $e->getMessage()]);
            }
        }

        if (!$response || $response->failed()) {
            $errData = $lastFailure ? ($lastFailure->json() ?? ['message' => $lastFailure->body()]) : ['message' => 'Failed to fetch profile'];
            $msg = $errData['message'] ?? '';
            if (stripos($msg, 'expired') !== false || stripos($msg, 'ABDM-1094') !== false || ($lastFailure && $lastFailure->status() === 401)) {
                $errData['message'] = 'ABDM Session / OTP token has expired (ABDM-1094). Please verify Mobile OTP again to retrieve the profile.';
            }
            throw AbdmApiException::fromResponse($errData);
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
        try {
            $response = $this->httpClient()
                ->withHeaders($this->getGatewayHeaders())
                ->post("{$this->abhaUrl}/v3/enrollment/request/otp", [
                    'txnId' => $txnId,
                    'scope' => $scopes,
                    'loginHint' => 'mobile',
                    'loginId' => $this->encryptData($mobile),
                    'otpSystem' => 'abdm'
                ]);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            $response = $e->response;
        }

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

        try {
            $response = $this->httpClient()
                ->withHeaders($this->getGatewayHeaders())
                ->post("{$this->abhaUrl}/v3/enrollment/auth/byAbdm", $payload);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            $response = $e->response;
        }

        if ($response->failed()) {
            throw AbdmApiException::fromResponse($response->json() ?? ['message' => 'Failed to verify Mobile OTP']);
        }

        return $response->json();
    }

    public function suggestAbhaAddress(string $txnId, string $token): array
    {
        $headers = $this->getGatewayHeaders();
        $bearerToken = str_starts_with($token, 'Bearer ') ? $token : "Bearer {$token}";
        $headers['X-Token'] = $bearerToken;
        $headers['X-token'] = $bearerToken;
        $headers['Transaction_Id'] = $txnId;

        $rawToken = str_starts_with($token, 'Bearer ') ? substr($token, 7) : $token;
        $jwtPayload = $this->decodeJwtPayload($rawToken);

        try {
            $response = $this->httpClient()
                ->withHeaders($headers)
                ->get("{$this->abhaUrl}/v3/enrollment/enrol/suggestion?transactionId={$txnId}");
        } catch (\Illuminate\Http\Client\RequestException $e) {
            $response = $e->response;
        }

        if ($response && $response->successful()) {
            $data = $response->json();
            $list = $data['abhaAddressList'] ?? $data['abhaAddresses'] ?? [];
            return [
                'txnId' => $txnId,
                'abhaAddresses' => $list,
                'abhaAddressList' => $list,
            ];
        }

        // Edge Case: If ABDM returns error (e.g. ABDM-1220 or 404) because ABHA already exists,
        // extract the existing preferred address from the transaction JWT so frontend receives it seamlessly.
        if (!empty($jwtPayload['preferredAbhaAddress'])) {
            \Illuminate\Support\Facades\Log::info('ABDM Suggestion: User already has existing ABHA address.', [
                'preferredAbhaAddress' => $jwtPayload['preferredAbhaAddress']
            ]);

            return [
                'txnId' => $txnId,
                'abhaAddresses' => [$jwtPayload['preferredAbhaAddress']],
                'abhaAddressList' => [$jwtPayload['preferredAbhaAddress']],
                'preferredAbhaAddress' => $jwtPayload['preferredAbhaAddress'],
                'abhaNumber' => $jwtPayload['abhaNumber'] ?? null,
                'hasExistingAbha' => true,
                'message' => 'ABHA address already exists for this Aadhaar'
            ];
        }

        $errorData = $response ? $response->json() : ['message' => 'Failed to fetch suggestions'];
        throw AbdmApiException::fromResponse($errorData);
    }

    public function createAbhaAddress(string $txnId, string $abhaAddress, string $token): array
    {
        $headers = $this->getGatewayHeaders();
        $bearerToken = str_starts_with($token, 'Bearer ') ? $token : "Bearer {$token}";
        $headers['X-Token'] = $bearerToken;
        $headers['X-token'] = $bearerToken;

        $rawToken = str_starts_with($token, 'Bearer ') ? substr($token, 7) : $token;
        $jwtPayload = $this->decodeJwtPayload($rawToken);

        try {
            $response = $this->httpClient()
                ->withHeaders($headers)
                ->post("{$this->abhaUrl}/v3/enrollment/enrol/abha-address", [
                    'txnId' => $txnId,
                    'abhaAddress' => $abhaAddress,
                    'preferred' => 1
                ]);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            $response = $e->response;
        }

        if ($response && $response->successful()) {
            $resData = $response->json();
            $profile = null;
            try {
                $profile = $this->getProfile($rawToken);
            } catch (\Exception $e) {
                // Profile fetch is non-fatal here
            }

            if ($profile) {
                $resData['profile'] = $profile;
                $resData['name'] = $profile['name'] ?? null;
                $resData['ABHANumber'] = $profile['ABHANumber'] ?? $profile['abhaNumber'] ?? null;
                $resData['gender'] = $profile['gender'] ?? null;
                $resData['dob'] = $profile['dob'] ?? null;
            } elseif ($jwtPayload) {
                $resData['name'] = $jwtPayload['name'] ?? null;
                $resData['ABHANumber'] = $jwtPayload['abhaNumber'] ?? null;
            }

            return $resData;
        }

        // Edge Case: If already created with this address
        if (!empty($jwtPayload['preferredAbhaAddress']) && $jwtPayload['preferredAbhaAddress'] === $abhaAddress) {
            return [
                'txnId' => $txnId,
                'abhaAddress' => $abhaAddress,
                'alreadyAssigned' => true,
                'message' => 'ABHA address is already assigned to this account'
            ];
        }

        $errorData = $response ? $response->json() : ['message' => 'Failed to create ABHA Address'];
        throw AbdmApiException::fromResponse($errorData);
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
        $rawToken = trim(str_replace('Bearer ', '', $token));
        $bearerToken = "Bearer {$rawToken}";
        $url = "{$this->abhaUrl}/v3/profile/account/abha-card";

        $jwtData = $this->decodeJwtPayload($rawToken);
        if (($jwtData['typ'] ?? '') === 'Transfer') {
            \Illuminate\Support\Facades\Log::warning("downloadAbhaCard: received a Transfer token (typ=Transfer) instead of Account token (typ=Transaction). Token must be exchanged via verifyUser first.");
        }

        // Headers strictly matching ABDM Milestone 1 Postman Collection:
        // Authorization: Bearer <gateway_token>
        // REQUEST-ID: <uuid>
        // TIMESTAMP: <isoTimestamp>
        // Content-Type: application/json
        // X-token: ...
        $baseHeaders = [
            'Authorization' => 'Bearer ' . $this->getGatewayToken(),
            'REQUEST-ID' => (string) Str::uuid(),
            'TIMESTAMP' => now()->setTimezone('UTC')->format('Y-m-d\TH:i:s.u\Z'),
            'Content-Type' => 'application/json',
        ];

        $attempts = [
            array_merge($baseHeaders, ['X-token' => $bearerToken]),
            array_merge($baseHeaders, ['X-token' => $rawToken]),
            array_merge($baseHeaders, ['X-token' => $bearerToken, 'X-Token' => $bearerToken]),
            array_merge($baseHeaders, ['X-token' => $rawToken, 'X-Token' => $rawToken]),
        ];

        $response = null;
        $lastFailure = null;
        foreach ($attempts as $hdrs) {
            try {
                $resp = $this->httpClient()->withHeaders($hdrs)->get($url);
                if ($resp && $resp->successful()) {
                    $response = $resp;
                    break;
                }
                $lastFailure = $resp;
                \Illuminate\Support\Facades\Log::warning("downloadAbhaCard attempt failed", [
                    'url' => $url,
                    'status' => $resp?->status(),
                    'body' => substr($resp?->body() ?? '', 0, 300),
                ]);
            } catch (\Illuminate\Http\Client\RequestException $e) {
                $lastFailure = $e->response;
                \Illuminate\Support\Facades\Log::warning("downloadAbhaCard RequestException", ['url' => $url, 'status' => $e->response?->status(), 'body' => $e->response?->body()]);
            } catch (\GuzzleHttp\Exception\RequestException $e) {
                if ($e->hasResponse()) {
                    $lastFailure = new \Illuminate\Http\Client\Response($e->getResponse());
                }
                \Illuminate\Support\Facades\Log::warning("downloadAbhaCard GuzzleException", ['url' => $url, 'error' => $e->getMessage()]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("downloadAbhaCard exception", ['url' => $url, 'error' => $e->getMessage()]);
            }
        }

        if (!$response || $response->failed()) {
            $errData = $lastFailure ? ($lastFailure->json() ?? ['message' => $lastFailure->body()]) : ['message' => 'Failed to download ABHA card'];
            $msg = $errData['message'] ?? '';
            if (stripos($msg, 'expired') !== false || stripos($msg, 'ABDM-1094') !== false || ($lastFailure && $lastFailure->status() === 401)) {
                $errData['message'] = 'ABDM Session / OTP token has expired (ABDM-1094). Please verify Mobile OTP again to retrieve the official card.';
            }
            throw AbdmApiException::fromResponse($errData);
        }

        $body = $response->body();
        $json = $response->json();

        // NHA ABDM API may return base64 string directly, or inside JSON { "data": "..." } or { "card": "..." }
        $payload = null;
        if (is_array($json)) {
            $payload = $json['data'] ?? $json['card'] ?? null;
        }
        if (!$payload) {
            $payload = $body;
        }

        // If $payload is raw binary bytes (e.g. starts with PNG signature \x89PNG, JPEG \xFF\xD8, PDF %PDF,
        // or contains non-base64 characters like nulls/high bytes):
        if (
            str_starts_with($payload, "\x89PNG") || 
            str_starts_with($payload, "\xFF\xD8") || 
            str_starts_with($payload, '%PDF') ||
            !preg_match('/^[a-zA-Z0-9+\/=\s]+$/', trim($payload))
        ) {
            return ['data' => base64_encode($payload)];
        }

        $trimmed = trim($payload, "\"\n\r \t");

        // Check if double base64 encoded
        $decoded = base64_decode($trimmed, true);
        if ($decoded !== false && strlen($decoded) > 10) {
            $secondDecoded = base64_decode($decoded, true);
            if ($secondDecoded !== false && (
                str_starts_with($secondDecoded, '%PDF') ||
                str_starts_with($secondDecoded, "\x89PNG") ||
                str_starts_with($secondDecoded, "\xFF\xD8")
            )) {
                return ['data' => $decoded];
            }
        }

        return ['data' => $trimmed];
    }

    public function downloadQrCode(string $token): array
    {
        $rawToken = trim(str_replace('Bearer ', '', $token));
        $bearerToken = "Bearer {$rawToken}";
        $url = "{$this->abhaUrl}/v3/profile/account/qrCode";

        $baseHeaders = [
            'Authorization' => 'Bearer ' . $this->getGatewayToken(),
            'REQUEST-ID' => (string) Str::uuid(),
            'TIMESTAMP' => now()->setTimezone('UTC')->format('Y-m-d\TH:i:s.u\Z'),
            'Content-Type' => 'application/json',
        ];

        $attempts = [
            array_merge($baseHeaders, ['X-token' => $bearerToken]),
            array_merge($baseHeaders, ['X-token' => $rawToken]),
            array_merge($baseHeaders, ['X-token' => $bearerToken, 'X-Token' => $bearerToken]),
        ];

        $response = null;
        $lastFailure = null;
        foreach ($attempts as $hdrs) {
            try {
                $resp = $this->httpClient()->withHeaders($hdrs)->get($url);
                if ($resp && $resp->successful()) {
                    $response = $resp;
                    break;
                }
                $lastFailure = $resp;
            } catch (\Illuminate\Http\Client\RequestException $e) {
                $lastFailure = $e->response;
                \Illuminate\Support\Facades\Log::warning("downloadQrCode RequestException", ['url' => $url, 'status' => $e->response?->status(), 'body' => $e->response?->body()]);
            } catch (\GuzzleHttp\Exception\RequestException $e) {
                if ($e->hasResponse()) {
                    $lastFailure = new \Illuminate\Http\Client\Response($e->getResponse());
                }
                \Illuminate\Support\Facades\Log::warning("downloadQrCode GuzzleException", ['url' => $url, 'error' => $e->getMessage()]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("downloadQrCode exception", ['url' => $url, 'error' => $e->getMessage()]);
            }
        }

        if (!$response || $response->failed()) {
            $errData = $lastFailure ? ($lastFailure->json() ?? ['message' => $lastFailure->body()]) : ['message' => 'Failed to download QR code'];
            $msg = $errData['message'] ?? '';
            if (stripos($msg, 'expired') !== false || stripos($msg, 'ABDM-1094') !== false || ($lastFailure && $lastFailure->status() === 401)) {
                $errData['message'] = 'ABDM Session / OTP token has expired (ABDM-1094). Please verify Mobile OTP again to retrieve the QR code.';
            }
            throw AbdmApiException::fromResponse($errData);
        }

        $body = $response->body();
        $json = $response->json();

        $payload = null;
        if (is_array($json)) {
            $payload = $json['data'] ?? $json['qrCode'] ?? null;
        }
        if (!$payload) {
            $payload = $body;
        }

        if (
            str_starts_with($payload, "\x89PNG") || 
            str_starts_with($payload, "\xFF\xD8") || 
            !preg_match('/^[a-zA-Z0-9+\/=\s]+$/', trim($payload))
        ) {
            return ['data' => base64_encode($payload)];
        }

        return ['data' => trim($payload, "\"\n\r \t")];
    }

    /**
     * Complete Login verification by selecting ABHA number / account
     * POST /v3/profile/login/verify/user
     * Exchanges Transfer token (T-token) for an Account/Transaction token (X-token)
     */
    public function verifyUser(string $transferToken, string $txnId, string $abhaNumber): array
    {
        $rawToken = trim(str_replace('Bearer ', '', $transferToken));
        $bearerToken = "Bearer {$rawToken}";
        $url = "{$this->abhaUrl}/v3/profile/login/verify/user";

        $baseHeaders = [
            'Authorization' => 'Bearer ' . $this->getGatewayToken(),
            'REQUEST-ID' => (string) Str::uuid(),
            'TIMESTAMP' => now()->setTimezone('UTC')->format('Y-m-d\TH:i:s.u\Z'),
            'Content-Type' => 'application/json',
        ];

        $payload = [
            'txnId' => $txnId,
            'ABHANumber' => $abhaNumber,
        ];

        $attempts = [
            array_merge($baseHeaders, ['T-token' => $bearerToken]),
            array_merge($baseHeaders, ['T-token' => $rawToken]),
            array_merge($baseHeaders, ['T-token' => $bearerToken, 't-token' => $bearerToken]),
            array_merge($baseHeaders, ['T-token' => $rawToken, 't-token' => $rawToken]),
        ];

        $response = null;
        $lastFailure = null;
        foreach ($attempts as $hdrs) {
            try {
                $resp = $this->httpClient()->withHeaders($hdrs)->post($url, $payload);
                if ($resp && $resp->successful()) {
                    $response = $resp;
                    break;
                }
                $lastFailure = $resp;
                \Illuminate\Support\Facades\Log::warning("verifyUser attempt failed", [
                    'url' => $url,
                    'status' => $resp?->status(),
                    'body' => substr($resp?->body() ?? '', 0, 300),
                ]);
            } catch (\Illuminate\Http\Client\RequestException $e) {
                $lastFailure = $e->response;
                \Illuminate\Support\Facades\Log::warning("verifyUser RequestException", ['url' => $url, 'status' => $e->response?->status(), 'body' => $e->response?->body()]);
            } catch (\GuzzleHttp\Exception\RequestException $e) {
                if ($e->hasResponse()) {
                    $lastFailure = new \Illuminate\Http\Client\Response($e->getResponse());
                }
                \Illuminate\Support\Facades\Log::warning("verifyUser GuzzleException", ['url' => $url, 'error' => $e->getMessage()]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("verifyUser exception", ['url' => $url, 'error' => $e->getMessage()]);
            }
        }

        if (!$response || $response->failed()) {
            $errData = $lastFailure ? ($lastFailure->json() ?? ['message' => $lastFailure->body()]) : ['message' => 'Failed to verify ABHA user account'];
            throw AbdmApiException::fromResponse($errData);
        }

        return $response->json() ?? [];
    }

    /**
     * Decode JWT Payload without cryptographic verification to extract enrollment state
     */
    protected function decodeJwtPayload(string $jwt): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) >= 2) {
            $payload = base64_decode(strtr($parts[1], '-_', '+/'));
            return json_decode($payload, true);
        }
        return null;
    }
}
