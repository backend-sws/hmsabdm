# Plan 05 — ABDM M1 Edge Cases (Complete Reference)

> ABDM integration में हर possible edge case का documented handling।
> यह file production-ready code लिखने से पहले पढ़ो।

---

## Edge Case Categories

1. Gateway Auth (Token)
2. OTP Flow Edge Cases
3. Scan & Share Webhook Edge Cases
4. Patient Data Edge Cases
5. Reception Flow Edge Cases
6. Network & Timeout Edge Cases
7. Sandbox vs Production Differences

---

## Category 1: Gateway Auth Token Edge Cases

### EC-1.1: Token Expire (401 on any ABDM API call)

**क्या होता है:** `getAccessToken()` cache (~100 min) expire हो जाए, या ABDM ने revoke कर दिया।

**Detection:** Any ABDM API call returns `HTTP 401`

**Handling:**
```php
protected function callWithRetry(callable $apiCall): array
{
    $response = $apiCall($this->getAccessToken());

    if ($response->status() === 401) {
        // Cache flush करो, naya token lo, once retry
        Cache::forget('abdm_access_token');
        $response = $apiCall($this->getAccessToken());
    }

    return $response->json();
}

// Usage:
public function generateOtp(string $mobile): array
{
    return $this->callWithRetry(function (string $token) use ($mobile) {
        return Http::withToken($token)
            ->post("{$this->abhaUrl}/v3/enrollment/request/otp", [
                'scope'     => ['abha-enrol'],
                'loginHint' => 'mobile',
                'loginId'   => $mobile,
                'otpSystem' => 'abdm',
            ]);
    });
}
```

**User को दिखाओ:** कुछ मत दिखाओ — यह internal retry है। अगर retry भी fail हो तो: "ABDM service temporarily unavailable. Please try again in a few minutes."

---

### EC-1.2: Credentials गलत / Account disabled

**HTTP Response:** `400` with `{"code": "ABDM-1009", "message": "Invalid credentials"}`

**Handling:**
- Log करो (critical alert)
- User को दिखाओ: "ABDM service currently unavailable. Please contact admin."
- Reception staff को बताओ: Skip Flow (bina ABHA) use karo

---

## Category 2: OTP Flow Edge Cases

### EC-2.1: OTP 3 बार गलत (Lockout)

**ABDM Response:** `HTTP 422` / `{"code": "ABDM-1004", "message": "Maximum OTP attempts exceeded"}`

**Backend Handling:**
```php
// verifyOtp response check:
if ($result['code'] ?? null === 'ABDM-1004') {
    return response()->json([
        'error' => 'otp_locked',
        'message' => 'OTP 3 bar galat dala. Kuch der baad try karein.',
        'retry_after_minutes' => 30
    ], 422);
}
```

**Frontend Handling:**
- OTP input disable करो
- Message: "OTP 3 बार गलत डाला। 30 मिनट बाद try करें।"
- "Resend OTP" button hide करो (lockout period में naya OTP bhi block hai)
- "पुनः प्रयास करें" button दिखाओ जो नया mobile OTP flow restart करे

---

### EC-2.2: OTP Expire (~3 minutes)

**ABDM Response:** `HTTP 422` / `{"code": "ABDM-1003", "message": "OTP expired"}`

**Backend:**
```php
if ($result['code'] ?? null === 'ABDM-1003') {
    return response()->json([
        'error' => 'otp_expired',
        'message' => 'OTP expire ho gaya. Naya OTP mangwayein.'
    ], 422);
}
```

**Frontend:**
- Countdown timer दिखाओ (3:00 → 0:00)
- Timer expire होने पर "Resend OTP" button enable
- "Resend OTP" click पर: नया `generateOtp` call, नया `txnId` save, purana discard

```jsx
// OTP Timer component
const [seconds, setSeconds] = useState(180); // 3 min
const [canResend, setCanResend] = useState(false);

useEffect(() => {
    const interval = setInterval(() => {
        setSeconds(prev => {
            if (prev <= 1) { setCanResend(true); clearInterval(interval); return 0; }
            return prev - 1;
        });
    }, 1000);
    return () => clearInterval(interval);
}, [txnId]); // txnId change hone par reset
```

---

### EC-2.3: Aadhaar-linked mobile बंद है / patient ke paas nahi

**Problem:** Patient ka Aadhaar दूसरे number से linked है जो अभी available नहीं।

**Flow:**
```
Mobile OTP fail → Ask patient:
  "Kya aapke paas koi aur mobile hai jo Aadhaar se linked ho?"
  [Naya mobile try karo] [Skip — Bina ABHA Register karo]
```

**No API for this** — receptionist decision लेता है। UI में fallback option दिखाओ।

---

### EC-2.4: Multiple ABHA same mobile se linked

**ABDM Response:** `verifyOtp` success लेकिन response में `accounts` array आती है:
```json
{
    "accounts": [
        { "ABHANumber": "91-1111-...", "name": "Rajesh Kumar", "gender": "M" },
        { "ABHANumber": "91-2222-...", "name": "Rajesh R Kumar", "gender": "M" }
    ]
}
```

**Backend:**
```php
if (isset($result['accounts']) && count($result['accounts']) > 1) {
    return response()->json([
        'error' => 'multiple_abha',
        'accounts' => $result['accounts'],
        'message' => 'Is mobile se multiple ABHA linked hain. Patient select karein.'
    ], 200); // 200 — not an error, needs user input
}
```

**Frontend:**
```
Multiple ABHA milein!
┌─────────────────────────────────┐
│ Kaun sa ABHA patient ka hai?   │
│                                 │
│ ○ Rajesh Kumar — 91-1111-xxxx  │
│ ○ Rajesh R Kumar — 91-2222-xxxx│
│                                 │
│      [ Confirm ]                │
└─────────────────────────────────┘
```

---

### EC-2.5: Mobile number ABDM mein registered nahi (No ABHA exists)

**ABDM Response:** `HTTP 404` or specific error code

**Handling:**
```php
return response()->json([
    'error' => 'abha_not_found',
    'message' => 'Is number se koi ABHA nahi mila.',
    'suggestion' => 'new_abha_or_skip'
], 404);
```

**Frontend:**
```
ABHA nahi mila is number pe.
─────────────────────────────
[Naya ABHA Banao (Aadhaar se)] [Bina ABHA Register Karo]
```

---

### EC-2.6: Duplicate ABHA — Aadhaar se pehle hi ABHA bana hua hai

**ABDM Response:** `enrol/byAadhaar` call karo → `{"code": "HIS-001", "message": "ABHA already exists"}`

**Handling:**
```php
if (($result['code'] ?? null) === 'HIS-001') {
    return response()->json([
        'error' => 'abha_already_exists',
        'message' => 'Aadhar se pehle hi ABHA bana hua hai. Login flow use karein.',
        'redirect' => 'login_flow'
    ], 409);
}
```

**Frontend:** "ABHA already exists" → switch to Login flow (mobile OTP se existing ABHA verify karo)

---

## Category 3: Scan & Share Webhook Edge Cases

### EC-3.1: Duplicate Webhook (same link_token twice)

**Problem:** ABDM Gateway kabhi kabhi same webhook twice bhejta hai (retry on timeout).

**Handling (already in plan):**
```php
CounterQueue::firstOrCreate(
    ['link_token' => $payload['token']],  // WHERE clause
    [/* insert data */]                    // Only on CREATE
);
// `firstOrCreate` idempotent hai — second call same record return karega
```

**Always return 200** even on duplicate — taaki ABDM retry karna band kare.

---

### EC-3.2: Webhook Payload Missing Required Fields

**Problem:** ABDM ne incomplete data bheja (rare but possible).

```php
public function handleShareProfile(Request $request)
{
    $payload = $request->all();

    // Log everything for debugging
    Log::info('ABDM Webhook received', ['payload' => $payload]);

    $patient = $payload['profile']['patient'] ?? null;
    $token   = $payload['token'] ?? null;

    if (!$patient || !$token) {
        Log::warning('ABDM Webhook: missing required fields', $payload);
        return response()->json(['status' => 'ignored'], 200);
        // 200 return karo — 400 se ABDM retry karta hai infinitely
    }

    // Process...
}
```

---

### EC-3.3: Patient Cancel Kare (No Webhook Arrives)

**Problem:** Patient ne ABHA app mein QR scan kiya, share nahi kiya.

**Detection:** Reception pe koi webhook nahi aaya — `link_token` se kuch nahi milta.

**Frontend Handling:**
- Reception screen pe timeout दिखाओ (30 seconds after clicking "Token Enter Karo")
- Message: "Patient ne share nahi kiya. Dobara scan karwayein ya dusra option use karein."
- Fallback buttons: [Dobara Token Try Karo] [Naya ABHA] [Bina ABHA]

---

### EC-3.4: Webhook aaya but Patient DB mein pehle se hai

**Scenario:** Same patient pehle bhi aaya था, uska record DB mein hai।

```php
$patient = Patient::firstOrCreate(
    ['abha_number' => $patientData['healthIdNumber']],  // Match by ABHA
    [
        'name'         => $patientData['name'],
        'gender'       => $patientData['gender'] ?? null,
        'abha_address' => $patientData['healthId'] ?? null,
        'hospital_id'  => $hospitalId,
    ]
);
// Existing patient found → just create new CounterQueue entry
// Do NOT update patient data from webhook (user may have manually corrected it)
```

---

### EC-3.5: Token Expire Hone ke Baad Reception Enter Kare

**Scenario:** Webhook aaya, patient ne 20 min baad token bataya, `expires_at` past में है।

```php
public function findByToken(Request $request)
{
    $entry = CounterQueue::with('patient')
        ->where('link_token', $request->token)
        ->where('status', 'waiting_confirmation')
        ->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now()); // Not yet expired
        })
        ->latest()
        ->first();

    if (!$entry) {
        return response()->json([
            'error' => 'token_expired_or_invalid',
            'message' => 'Token expire ho gaya ya galat hai. Patient se dobara scan karwayein.'
        ], 404);
    }
    // ...
}
```

**Frontend:**
- Error message: "Token expire हो गया (15 मिनट से ज़्यादा पुराना है)"
- Button: "Dobara Token Try Karo" / "Naya ABHA Banao"

---

### EC-3.6: Webhook ABDM Hospital Mismatch (wrong hipId)

**Problem:** Webhook kisi aur hospital ke liye aaya।

```php
// hipId check (agar tumne multi-hospital setup rakha hai):
$hipId = $payload['hipId'] ?? null;
$hospital = Hospital::where('abdm_hip_id', $hipId)->first();

if (!$hospital) {
    Log::error('ABDM Webhook: unknown hipId', ['hipId' => $hipId]);
    return response()->json(['status' => 'unknown_hip'], 200); // Still 200
}
```

---

## Category 4: Patient Data Edge Cases

### EC-4.1: ABHA Data Mismatch (Webhook vs DB)

**Problem:** Same ABHA number hai but name/gender different.

**Rule:** Webhook data se **existing patient update mat karo**. Manual data correction preserve karo.

```php
// CORRECT: firstOrCreate (only create, never update on webhook)
$patient = Patient::firstOrCreate(['abha_number' => $abhaNumber], $patientData);

// WRONG: updateOrCreate (would overwrite manual corrections)
// $patient = Patient::updateOrCreate(['abha_number' => $abhaNumber], $patientData);
```

---

### EC-4.2: Patient ne Bina ABHA Register Karaya, Baad Mein ABHA Bataya

**Scenario:** Patient pehle bina ABHA aaya, ab usi visit pe ya agli baar ABHA se aaya।

**Solution:** Patient merge / ABHA link API:
```
PUT /api/v1/patients/{id}/link-abha
Body: { "abha_number": "91-xxxx...", "verified_token": "..." }
```

**DB Update:**
```php
$patient->update([
    'abha_number' => $verifiedAbhaNumber,
    'abha_address' => $abhaAddress,
]);
```

---

### EC-4.3: Same Mobile se Different Names (Family Members)

**Problem:** Ek mobile pe bhai-bhai, pati-patni dono register karna chahte hain।

**Solution:** `mobile` field unique constraint नहीं होनी चाहिए patients table में।
Multiple patients can share same mobile number.
ABHA number unique रहेगा।

---

## Category 5: Reception Flow Edge Cases

### EC-5.1: Doctor ka Slot Full (max_patients reached)

**Check in createVisit:**
```php
$schedule = DoctorSchedule::where('doctor_id', $request->doctor_id)
    ->where('day_of_week', now()->dayOfWeek)
    ->first();

$todayCount = OpdVisit::where('doctor_id', $request->doctor_id)
    ->whereDate('visit_date', today())
    ->whereNotIn('status', ['cancelled'])
    ->count();

if ($schedule && $todayCount >= $schedule->max_patients) {
    return response()->json([
        'error' => 'doctor_full',
        'message' => "Dr. {$doctor->name} ke aaj ke {$schedule->max_patients} slots full ho gaye hain.",
        'today_count' => $todayCount
    ], 422);
}
```

**Frontend:** Warning दिखाओ + दूसरा doctor suggest करो (same dept, available)

---

### EC-5.2: Same Patient Same Doctor Same Day Double Visit

**Business Rule:** Generally ek patient ek doctor se ek din mein ek hi baar jaata hai।

```php
$existing = OpdVisit::where('patient_id', $request->patient_id)
    ->where('doctor_id', $request->doctor_id)
    ->whereDate('visit_date', today())
    ->whereNotIn('status', ['cancelled'])
    ->first();

if ($existing) {
    return response()->json([
        'error' => 'duplicate_visit',
        'message' => 'Yeh patient aaj pehle se is doctor ke paas visit karein.',
        'existing_token' => $existing->queue_token
    ], 409);
}
```

---

### EC-5.3: Race Condition — Two Receptions Same Token

**Problem:** 2 reception desks simultaneously same doctor pe visit create karein।

**Solution:** DB-level lock (already planned):
```php
DB::transaction(function () use ($request) {
    $lastToken = OpdVisit::where('doctor_id', $request->doctor_id)
        ->whereDate('visit_date', today())
        ->lockForUpdate()  // PostgreSQL row lock
        ->max('queue_token');
    
    $nextToken = ($lastToken ?? 0) + 1;
    
    return OpdVisit::create([...
        'queue_token' => $nextToken,
    ]);
});
```

---

## Category 6: Network & Timeout Edge Cases

### EC-6.1: ABDM API Timeout

```php
protected function httpClient(): \Illuminate\Http\Client\PendingRequest
{
    return Http::timeout(10)          // 10 second timeout
        ->retry(2, 500)               // 2 retries, 500ms gap
        ->withHeaders([
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ]);
}
```

**User ko दिखाओ:** "ABDM server se connect nahi ho paa raha. Please try again." + fallback to Skip flow

---

### EC-6.2: Webhook Verify Karna (Security)

**Problem:** Koi bhi `/abdm/callback/share-profile` pe kuch bhi POST kar sakta hai।

**ABDM Signature Verification:**
```php
public function handleShareProfile(Request $request)
{
    // ABDM X-HIP-ID header verify karo
    $hipId = $request->header('X-HIP-ID');
    if ($hipId !== config('services.abdm.hip_id')) {
        Log::warning('ABDM webhook: invalid HIP ID', ['received' => $hipId]);
        return response()->json(['status' => 'unauthorized'], 401);
    }

    // Optional: IP whitelist (ABDM gateway IPs only)
    // ABDM ke sandbox IPs ke liye docs check karo
}
```

---

## Category 7: Sandbox vs Production Differences

| Feature | Sandbox | Production |
|---|---|---|
| OTP | Always `123456` | Real SMS |
| ABHA Numbers | Fake (91-1111-...) | Real Aadhaar-linked |
| Gateway URL | `https://dev.abdm.gov.in` | `https://apis.abdm.gov.in` |
| ABHA URL | `https://abhasbx.abdm.gov.in` | `https://abha.abdm.gov.in` |
| Webhook callback | ngrok/public URL needed | Real HTTPS domain |
| Rate Limits | Relaxed | Strict (100 req/min per client) |
| ABHA address suffix | `@sbx` | `@abdm` or custom |

---

## Full ABDM Error Code Reference

| Code | Meaning | Action |
|---|---|---|
| ABDM-1001 | Invalid mobile format | Validate 10-digit on frontend |
| ABDM-1003 | OTP expired | Show resend button |
| ABDM-1004 | Max OTP attempts | Lock 30 min, show message |
| ABDM-1009 | Invalid credentials | Alert admin, use skip flow |
| HIS-001 | ABHA already exists | Redirect to login flow |
| HIS-002 | ABHA not found | Show create/skip options |
| HTTP-401 | Token expired | Auto-retry with fresh token |
| HTTP-429 | Rate limit hit | Backoff 60s, retry |
| HTTP-503 | ABDM down | Show maintenance message |

---

## RealAbdmService — Complete Error Handling Template

```php
public function verifyOtp(string $txnId, string $otp): array
{
    $result = $this->callWithRetry(function (string $token) use ($txnId, $otp) {
        return Http::withToken($token)
            ->timeout(10)
            ->post("{$this->abhaUrl}/v3/enrollment/auth/byAbdm", [
                'authData' => ['otp' => ['txnId' => $txnId, 'otpValue' => $otp]],
            ]);
    });

    // Map ABDM errors to structured responses:
    $code = $result['code'] ?? null;

    return match (true) {
        $code === 'ABDM-1003' => ['error' => 'otp_expired',    'message' => 'OTP expire ho gaya.'],
        $code === 'ABDM-1004' => ['error' => 'otp_locked',     'message' => 'Bahut baar galat OTP.'],
        isset($result['accounts']) && count($result['accounts']) > 1
                              => ['error' => 'multiple_abha',  'accounts' => $result['accounts']],
        isset($result['ABHAProfile'])
                              => ['success' => true, 'profile' => $result['ABHAProfile']],
        default               => ['error' => 'unknown',        'message' => 'ABDM error. Try again.'],
    };
}
```

---

## Frontend Error → User Message Mapping

```js
// src/utils/abdmErrors.js
export const ABDM_ERROR_MESSAGES = {
    otp_expired:            'OTP expire हो गया। नया OTP मंगाएं।',
    otp_locked:             'OTP 3 बार गलत। 30 मिनट बाद try करें।',
    multiple_abha:          'एक से ज़्यादा ABHA मिले। सही ABHA चुनें।',
    abha_not_found:         'ABHA नहीं मिला। नया बनाएं या Skip करें।',
    abha_already_exists:    'ABHA पहले से बना है। Login से verify करें।',
    token_expired_or_invalid:'Token expire हो गया। दोबारा scan करें।',
    doctor_full:            'Doctor के सभी slots भर गए।',
    duplicate_visit:        'यह patient आज पहले से visit में है।',
    abdm_unavailable:       'ABDM service temporarily unavailable।',
    network_error:          'Network error। Internet check करें।',
};

export function getAbdmErrorMessage(error) {
    return ABDM_ERROR_MESSAGES[error?.response?.data?.error]
        || error?.response?.data?.message
        || ABDM_ERROR_MESSAGES.network_error;
}
```

---

## Testing All Edge Cases (Postman/Manual)

| Edge Case | Test Method |
|---|---|
| EC-1.1 Token expire | Cache flush + API call |
| EC-2.1 OTP locked | Mock: return ABDM-1004 |
| EC-2.2 OTP expired | Mock: return ABDM-1003 |
| EC-2.4 Multiple ABHA | Mock: return accounts array |
| EC-3.1 Duplicate webhook | POST same payload twice |
| EC-3.5 Token expired | Set `expires_at` = past, try findByToken |
| EC-5.1 Doctor slot full | Set `max_patients`=0 in schedule |
| EC-5.2 Same patient twice | Create 2nd visit same patient+doctor+day |
| EC-5.3 Race condition | Concurrent requests (load test) |
| EC-6.2 Fake webhook | POST to webhook without valid HIP header |
