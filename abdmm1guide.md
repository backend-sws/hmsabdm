# ABDM M1 — Combined Reference: Reception Panel + APIs + Scan & Share Token Flow

## Part 1 — Overview & Architecture

M1 ka poora scope: **ABHA create/verify karna, aur scan-and-share token flow se fast reception registration.**

```
[Patient] --scan QR--> [ABHA App/Eka Care/DRiefcase] --share--> [ABDM Gateway]
                                                                       │
                                                          (webhook push, background)
                                                                       ▼
                                                          [Tumhara Backend — webhook receiver]
                                                                       │
                                                          Patient + Token DB mein save
                                                                       │
Patient apni app screen pe TOKEN dekhta hai (jaise "482") ◄───────────┘
        │
        ▼
Reception "482" type karta hai
        │
        ▼
Turant match (data pehle se hai) → Dept/Doctor select → Receipt print
```

Do parallel paths hote hain M1 mein:
- **Naya patient** → mobile OTP se khud ABHA banao (reception operated)
- **Purana patient (ABHA already hai)** → Scan & Share + Token flow (sabse fast, government hospitals isी se chalte hain)
- **Patient ke paas kuch nahi (no phone)** → Skip, bina ABHA register karo

---

## Part 2 — Base URLs & Auth

| Environment | ABHA APIs | Gateway (session) |
|---|---|---|
| Sandbox | `https://abhasbx.abdm.gov.in/abha/api` | `https://dev.abdm.gov.in` |
| Production | `https://abha.abdm.gov.in/api/abha` | `https://apis.abdm.gov.in` |

### `POST /api/hiecm/gateway/v3/sessions` — Sabse Pehli API
```json
{ "clientId": "...", "clientSecret": "...", "grantType": "client_credentials" }
```
Token ~100 min valid — cache karo, har request pe naya mat mangao.

---

## Part 3 — Full M1 API List

### A) ABHA Creation — Via Aadhaar
| Step | API | Kaam |
|---|---|---|
| 1 | `POST /v3/enrollment/request/otp` | Aadhaar OTP bhejo |
| 2 | `POST /v3/enrollment/enrol/byAadhaar` | OTP verify, ABHA create |
| 3 | `POST /v3/enrollment/auth/byAbdm` | Current mobile link (optional) |
| 4 | `GET /v3/enrollment/enrol/suggestion` | ABHA address suggestions |
| 5 | `POST /v3/enrollment/enrol/abha-address` | Final address set karo |

### B) ABHA Creation — Via Mobile Only (reception mein sabse common)
| Step | API | Kaam |
|---|---|---|
| 1 | `POST /v3/enrollment/request/otp` (`loginHint: mobile`) | OTP bhejo |
| 2 | `POST /v3/enrollment/auth/byAbdm` | OTP verify, ABHA create |

### C) ABHA Creation — Via Document (rare, last fallback)
| Step | API | Kaam |
|---|---|---|
| 1 | `POST /v3/enrollment/enrol/byDocument` | Driving License se |

### D) Login/Verify Existing ABHA
| Step | API | Kaam |
|---|---|---|
| 1 | `POST /v3/profile/login/request/otp` | Mobile/ABHA number/address se OTP |
| 2 | `POST /v3/profile/login/verify` | OTP verify, profile milta hai |

### E) Others
| API | Kaam |
|---|---|
| `GET /v3/profile/public/certificate` | RSA key — Aadhaar encryption ke liye |
| `POST /v3/profile/account/request/emailVerificationLink` | Optional email verify |

### F) Scan & Share (Webhook — Asli Fast Flow)
| Direction | Endpoint | Kaam |
|---|---|---|
| Incoming (ABDM → tum) | Tumhara registered callback URL | Patient profile + token push hota hai |
| Setup | Bridge registration ke time NHA ko diya gaya callback URL | One-time |

---

## Part 4 — Edge Cases (Har API Ke Liye)

- **Token expire (auth)** → 401 aaye to naya token lo, ek retry karo
- **Aadhaar-linked mobile band hai** → mobile-only ya document-based fallback do
- **OTP 3x galat** → temporary lockout, user ko "thodi der baad try karein" bolo
- **OTP expire (~3 min)** → naya OTP mangwane ka button do, purana `txnId` reuse mat karo
- **Duplicate ABHA (Aadhaar pehle se registered)** → Create ki jagah Login flow pe switch karo
- **Sandbox mein OTP hamesha fix (`123456`)** → yeh normal hai, bug nahi
- **Multiple ABHA ek mobile se linked** → list aayegi, dropdown do "kaunsa aapka hai"
- **Scan & Share — patient cancel kare** → koi webhook nahi aayega, UI mein timeout dikhao
- **Scan & Share — webhook fail/duplicate** → idempotency check (`link_token` unique constraint)
- **Reception token expire ho jaaye (patient der se bataye)** → "Token invalid/expired, dobara scan karwayein" error do
- **Local development mein webhook nahi aayega** → `ngrok` se localhost ko public URL do, wahi callback URL mein daalo

---

## Part 5 — Database Schema

```php
// patients table
Schema::create('patients', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('mobile')->nullable();
    $table->date('dob')->nullable();
    $table->string('gender')->nullable();
    $table->string('abha_number')->nullable()->unique();
    $table->string('abha_address')->nullable();
    $table->timestamps();
});

// counter_queues table — webhook se aaya data yahan hold hota hai jab tak reception confirm na kare
Schema::create('counter_queues', function (Blueprint $table) {
    $table->id();
    $table->string('counter_code')->nullable();
    $table->foreignId('patient_id')->constrained();
    $table->string('link_token')->unique(); // duplicate-webhook se bachne ke liye unique
    $table->string('status')->default('waiting_confirmation'); // waiting_confirmation | confirmed | expired
    $table->timestamps();
});

// departments, doctors, opd_visits — pehle jaise hi
Schema::create('departments', function (Blueprint $table) {
    $table->id();
    $table->string('name');
});

Schema::create('doctors', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->foreignId('department_id')->constrained();
    $table->string('hpr_id')->nullable();
});

Schema::create('opd_visits', function (Blueprint $table) {
    $table->id();
    $table->foreignId('patient_id')->constrained();
    $table->foreignId('doctor_id')->constrained();
    $table->foreignId('department_id')->constrained();
    $table->unsignedInteger('queue_token');
    $table->date('visit_date');
    $table->timestamps();
});
```

---

## Part 6 — Backend Code (Laravel)

### 6.1 Contract

```php
// app/Contracts/AbdmServiceInterface.php
namespace App\Contracts;

interface AbdmServiceInterface
{
    public function generateMobileOtp(string $mobile): array;
    public function verifyMobileOtp(string $otp, string $txnId): array;
}
```

### 6.2 Mock Service (credentials aane tak isse chalao)

```php
// app/Services/MockAbdmService.php
namespace App\Services;

use App\Contracts\AbdmServiceInterface;

class MockAbdmService implements AbdmServiceInterface
{
    public function generateMobileOtp(string $mobile): array
    {
        return ['txnId' => 'mock-txn-' . uniqid(), 'message' => 'OTP sent (MOCK — use 123456)'];
    }

    public function verifyMobileOtp(string $otp, string $txnId): array
    {
        if ($otp !== '123456') return ['error' => 'Invalid OTP'];

        return [
            'ABHAProfile' => [
                'ABHANumber'  => '91-' . rand(1000, 9999) . '-' . rand(1000, 9999) . '-' . rand(1000, 9999),
                'abhaAddress' => 'patient' . rand(100, 999) . '@sbx',
                'name'        => 'Mock Patient',
                'gender'      => 'M',
                'yearOfBirth' => '1990',
                'mobile'      => $mobile,
            ],
        ];
    }
}
```

### 6.3 Real Service (skeleton — credentials aane pe activate)

```php
// app/Services/RealAbdmService.php
namespace App\Services;

use App\Contracts\AbdmServiceInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class RealAbdmService implements AbdmServiceInterface
{
    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.abdm.base_url');
    }

    protected function getAccessToken(): string
    {
        return Cache::remember('abdm_access_token', 100 * 60, function () {
            $response = Http::post("{$this->baseUrl}/api/hiecm/gateway/v3/sessions", [
                'clientId'     => config('services.abdm.client_id'),
                'clientSecret' => config('services.abdm.client_secret'),
                'grantType'    => 'client_credentials',
            ]);
            return $response->json('accessToken');
        });
    }

    public function generateMobileOtp(string $mobile): array
    {
        return Http::withToken($this->getAccessToken())
            ->post("{$this->baseUrl}/v3/enrollment/request/otp", [
                'scope' => ['abha-enrol'], 'loginHint' => 'mobile', 'loginId' => $mobile, 'otpSystem' => 'abdm',
            ])->json();
    }

    public function verifyMobileOtp(string $otp, string $txnId): array
    {
        return Http::withToken($this->getAccessToken())
            ->post("{$this->baseUrl}/v3/enrollment/auth/byAbdm", [
                'authData' => ['otp' => ['txnId' => $txnId, 'otpValue' => $otp]],
            ])->json();
    }
}
```

### 6.4 Provider — Mock ↔ Real Switch

```php
// app/Providers/AppServiceProvider.php
namespace App\Providers;

use App\Contracts\AbdmServiceInterface;
use App\Services\MockAbdmService;
use App\Services\RealAbdmService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AbdmServiceInterface::class, function ($app) {
            return config('services.abdm.mock_mode') ? new MockAbdmService() : new RealAbdmService();
        });
    }
}
```

```php
// config/services.php mein add karo
'abdm' => [
    'mock_mode'     => env('ABDM_MOCK_MODE', true),
    'base_url'      => env('ABDM_BASE_URL', 'https://dev.abdm.gov.in'),
    'client_id'     => env('ABDM_CLIENT_ID'),
    'client_secret' => env('ABDM_CLIENT_SECRET'),
],
```

### 6.5 Webhook Receiver — Scan & Share (Asli Fast-Flow Ka Core)

```php
// app/Http/Controllers/AbdmWebhookController.php
namespace App\Http\Controllers;

use App\Models\CounterQueue;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AbdmWebhookController extends Controller
{
    public function handleShareProfile(Request $request)
    {
        $payload = $request->all();
        $patientData = $payload['profile']['patient'] ?? null;

        if (!$patientData) {
            Log::warning('ABDM webhook: profile missing', $payload);
            return response()->json(['status' => 'error'], 400);
        }

        $patient = Patient::firstOrCreate(
            ['abha_number' => $patientData['healthIdNumber']],
            [
                'name'         => $patientData['name'],
                'gender'       => $patientData['gender'] ?? null,
                'abha_address' => $patientData['healthId'] ?? null,
            ]
        );

        // Idempotent — same link_token dobara aaye to duplicate mat banao
        CounterQueue::firstOrCreate(
            ['link_token' => $payload['token']],
            [
                'counter_code' => $payload['profile']['hipCode'] ?? null,
                'patient_id'   => $patient->id,
                'status'       => 'waiting_confirmation',
            ]
        );

        return response()->json(['status' => 'success']); // ABDM ko turant 200 do
    }
}
```

### 6.6 Reception Controller — Sabhi Flows (Token-lookup + Naya ABHA + Skip)

```php
// app/Http/Controllers/ReceptionController.php
namespace App\Http\Controllers;

use App\Contracts\AbdmServiceInterface;
use App\Models\CounterQueue;
use App\Models\Department;
use App\Models\OpdVisit;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceptionController extends Controller
{
    public function __construct(protected AbdmServiceInterface $abdm) {}

    // FLOW A: Patient ne ABHA app se scan+share kiya, screen pe token dekha, reception ko bataya
    public function findByToken(Request $request)
    {
        $request->validate(['token' => 'required|string']);

        $entry = CounterQueue::with('patient')
            ->where('link_token', $request->token)
            ->where('status', 'waiting_confirmation')
            ->latest()->first();

        if (!$entry) {
            return response()->json(['error' => 'Token nahi mila ya expire ho gaya, dobara scan karwayein'], 404);
        }

        $entry->update(['status' => 'confirmed']);
        return $this->patientReadyResponse($entry->patient);
    }

    // FLOW B: Naya ABHA — reception khud mobile OTP se banata hai
    public function generateOtp(Request $request)
    {
        $request->validate(['mobile' => 'required|digits:10']);
        return response()->json($this->abdm->generateMobileOtp($request->mobile));
    }

    public function verifyOtp(Request $request)
    {
        $request->validate(['otp' => 'required|string', 'txnId' => 'required|string', 'mobile' => 'required|digits:10']);

        $result = $this->abdm->verifyMobileOtp($request->otp, $request->txnId);
        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 422);
        }

        $profile = $result['ABHAProfile'];
        $patient = Patient::updateOrCreate(
            ['abha_number' => $profile['ABHANumber']],
            [
                'name' => $profile['name'], 'gender' => $profile['gender'] ?? null,
                'dob' => isset($profile['yearOfBirth']) ? $profile['yearOfBirth'] . '-01-01' : null,
                'mobile' => $request->mobile, 'abha_address' => $profile['abhaAddress'] ?? null,
            ]
        );

        return $this->patientReadyResponse($patient);
    }

    // FLOW C: Bina ABHA — skip
    public function registerWithoutAbha(Request $request)
    {
        $request->validate(['name' => 'required|string', 'mobile' => 'nullable|digits:10']);
        $patient = Patient::create(['name' => $request->name, 'mobile' => $request->mobile]);
        return $this->patientReadyResponse($patient);
    }

    protected function patientReadyResponse(Patient $patient)
    {
        return response()->json([
            'patient_id'  => $patient->id,
            'name'        => $patient->name,
            'gender'      => $patient->gender,
            'abha_number' => $patient->abha_number,
            'departments' => Department::with('doctors')->get(['id', 'name']),
        ]);
    }

    // Final step: department/doctor select karke token + receipt
    public function createVisit(Request $request)
    {
        $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'department_id' => 'required|exists:departments,id',
            'doctor_id' => 'required|exists:doctors,id',
        ]);

        $nextToken = DB::transaction(function () use ($request) {
            $last = OpdVisit::whereDate('visit_date', today())
                ->where('department_id', $request->department_id)
                ->lockForUpdate()->max('queue_token');
            return ($last ?? 0) + 1;
        });

        $visit = OpdVisit::create([
            'patient_id' => $request->patient_id, 'doctor_id' => $request->doctor_id,
            'department_id' => $request->department_id, 'queue_token' => $nextToken, 'visit_date' => today(),
        ]);

        return response()->json([
            'queue_token' => $visit->queue_token, 'patient' => $visit->patient->name,
            'abha_number' => $visit->patient->abha_number, 'doctor' => $visit->doctor->name,
            'department' => $visit->department->name, 'date' => $visit->visit_date->format('d-m-Y'),
        ]);
    }
}
```

### 6.7 Routes

```php
// routes/api.php
use App\Http\Controllers\{ReceptionController, AbdmWebhookController};

// Webhook — ABDM Gateway isko call karega (public, no auth middleware)
Route::post('/abdm/callback/share-profile', [AbdmWebhookController::class, 'handleShareProfile']);

// Reception panel — staff-authenticated area mein rakhna
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/reception/find-by-token', [ReceptionController::class, 'findByToken']);
    Route::post('/reception/generate-otp', [ReceptionController::class, 'generateOtp']);
    Route::post('/reception/verify-otp', [ReceptionController::class, 'verifyOtp']);
    Route::post('/reception/register-without-abha', [ReceptionController::class, 'registerWithoutAbha']);
    Route::post('/reception/create-visit', [ReceptionController::class, 'createVisit']);
});
```

---

## Part 7 — React Reception Panel

```jsx
// src/api/reception.js
import axios from 'axios';
const API = axios.create({ baseURL: 'http://localhost:8000/api' });

export const findByToken = (token) => API.post('/reception/find-by-token', { token });
export const generateOtp = (mobile) => API.post('/reception/generate-otp', { mobile });
export const verifyOtp = (mobile, otp, txnId) => API.post('/reception/verify-otp', { mobile, otp, txnId });
export const registerWithoutAbha = (name, mobile) => API.post('/reception/register-without-abha', { name, mobile });
export const createVisit = (patient_id, department_id, doctor_id) =>
  API.post('/reception/create-visit', { patient_id, department_id, doctor_id });
```

```jsx
// src/components/ReceptionDashboard.jsx
import { useState } from 'react';
import { findByToken, generateOtp, verifyOtp, registerWithoutAbha, createVisit } from '../api/reception';

export default function ReceptionDashboard() {
  const [mode, setMode] = useState('choose'); // choose | token | new-abha | skip
  const [patient, setPatient] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [deptId, setDeptId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  // Flow A — ABHA app se mila token
  const [token, setToken] = useState('');
  const handleTokenSubmit = async () => {
    setError('');
    try {
      const res = await findByToken(token);
      setPatient(res.data); setDepartments(res.data.departments);
    } catch (e) { setError(e.response?.data?.error || 'Token invalid'); }
  };

  // Flow B — naya ABHA
  const [mobile, setMobile] = useState('');
  const [txnId, setTxnId] = useState(null);
  const [otp, setOtp] = useState('');
  const handleGenerateOtp = async () => {
    const res = await generateOtp(mobile);
    setTxnId(res.data.txnId);
  };
  const handleVerifyOtp = async () => {
    setError('');
    try {
      const res = await verifyOtp(mobile, otp, txnId);
      setPatient(res.data); setDepartments(res.data.departments);
    } catch (e) { setError(e.response?.data?.error || 'OTP galat'); }
  };

  // Flow C — skip
  const [skipName, setSkipName] = useState('');
  const [skipMobile, setSkipMobile] = useState('');
  const handleSkip = async () => {
    const res = await registerWithoutAbha(skipName, skipMobile);
    setPatient(res.data); setDepartments(res.data.departments);
  };

  const availableDoctors = departments.find(d => d.id === Number(deptId))?.doctors || [];
  const handleCreateVisit = async () => {
    const res = await createVisit(patient.patient_id, deptId, doctorId);
    setReceipt(res.data);
  };

  const resetAll = () => {
    setMode('choose'); setPatient(null); setDepartments([]); setDeptId(''); setDoctorId('');
    setReceipt(null); setError(''); setToken(''); setMobile(''); setTxnId(null); setOtp('');
    setSkipName(''); setSkipMobile('');
  };

  if (receipt) return (
    <div style={{ padding: 20, border: '1px solid #ccc', maxWidth: 400 }}>
      <h2>Receipt</h2>
      <p>Token No: <b>{receipt.queue_token}</b></p>
      <p>Patient: {receipt.patient}</p>
      <p>ABHA: {receipt.abha_number || 'N/A'}</p>
      <p>Department: {receipt.department}</p>
      <p>Doctor: {receipt.doctor}</p>
      <p>Date: {receipt.date}</p>
      <button onClick={() => window.print()}>Print</button>
      <button onClick={resetAll}>Next Patient</button>
    </div>
  );

  if (patient) return (
    <div style={{ padding: 20 }}>
      <h3>{patient.name} {patient.abha_number ? `(ABHA: ${patient.abha_number})` : '(No ABHA)'}</h3>
      <select value={deptId} onChange={e => { setDeptId(e.target.value); setDoctorId(''); }}>
        <option value="">Select Department</option>
        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select value={doctorId} onChange={e => setDoctorId(e.target.value)} disabled={!deptId}>
        <option value="">Select Doctor</option>
        {availableDoctors.map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
      </select>
      <button disabled={!deptId || !doctorId} onClick={handleCreateVisit}>Generate Token & Print</button>
    </div>
  );

  if (mode === 'choose') return (
    <div style={{ padding: 20 }}>
      <h2>Reception — Patient Registration</h2>
      <button onClick={() => setMode('token')}>ABHA App Se Mila Token</button>
      <button onClick={() => setMode('new-abha')}>Naya ABHA Banao</button>
      <button onClick={() => setMode('skip')}>Skip — Bina ABHA</button>
    </div>
  );

  if (mode === 'token') return (
    <div style={{ padding: 20 }}>
      <h3>Patient Ne Jo Token Bataya, Woh Daalein</h3>
      <input value={token} onChange={e => setToken(e.target.value)} placeholder="Token" />
      <button onClick={handleTokenSubmit}>Fetch Patient</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={resetAll}>Back</button>
    </div>
  );

  if (mode === 'new-abha') return (
    <div style={{ padding: 20 }}>
      <h3>Naya ABHA — Mobile OTP</h3>
      <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Mobile Number" />
      <button onClick={handleGenerateOtp}>Send OTP</button>
      {txnId && <>
        <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="OTP (mock: 123456)" />
        <button onClick={handleVerifyOtp}>Verify & Create ABHA</button>
      </>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={resetAll}>Back</button>
    </div>
  );

  if (mode === 'skip') return (
    <div style={{ padding: 20 }}>
      <h3>Bina ABHA — Direct Register</h3>
      <input value={skipName} onChange={e => setSkipName(e.target.value)} placeholder="Patient Name" />
      <input value={skipMobile} onChange={e => setSkipMobile(e.target.value)} placeholder="Mobile (optional)" />
      <button onClick={handleSkip}>Register</button>
      <button onClick={resetAll}>Back</button>
    </div>
  );

  return null;
}
```

---

## Part 8 — Local Development Setup (Webhook Ke Liye Zaroori)

ABDM Gateway `localhost` ko call nahi kar sakta — testing ke liye:

```bash
ngrok http 8000
```

Jo public URL mile (jaise `https://abc123.ngrok.io`), usko sandbox/Bridge settings mein Callback URL ki jagah daalo:
```
https://abc123.ngrok.io/api/abdm/callback/share-profile
```

Real webhook test karne ke liye tum Postman se bhi manually is URL par ek sample payload POST kar sakte ho (jab tak real ABHA app se test na kar paao):
```json
{
  "token": "482",
  "hipId": "your-hip-id",
  "profile": {
    "hipCode": "COUNTER-1",
    "patient": {
      "healthId": "test@sbx",
      "healthIdNumber": "91-1111-1111-1111",
      "name": "Test Patient",
      "gender": "M"
    }
  }
}
```

---

## Part 9 — Testing Checklist

- [ ] Naya patient — mobile OTP se ABHA (mock: OTP `123456`)
- [ ] Purana patient — token-lookup flow (Postman se webhook simulate karke)
- [ ] Duplicate webhook aaye — `link_token` unique constraint check
- [ ] Token expire/invalid — error message dikhe
- [ ] Bina ABHA — skip flow
- [ ] Department/Doctor select ke bina "Generate" button disabled rahe
- [ ] Receipt print sahi se ho