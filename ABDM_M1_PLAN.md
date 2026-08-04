# ABDM M1 — Complete Implementation Plan (Phase-wise)

> **यह file permanently project root में रहेगी।**
> जब भी M1 का काम आगे बढ़ाना हो, यहाँ आकर current status check करो।

---

## Current Status (जो पहले से बन चुका है)

| चीज़ | Status |
|---|---|
| `AbdmServiceInterface` | ✅ बना हुआ (`App\Services\Abdm`) |
| `MockAbdmService` | ✅ बना हुआ (OTP mock `123456`) |
| Patients migration | ✅ बन गई (`abha_number`, `abha_address` columns हैं) |
| CounterQueues migration | ✅ बन गई (`link_token` unique) |
| `Patient` model | ✅ बना हुआ |
| `CounterQueue` model | ✅ बना हुआ |
| `AuthController` | ✅ Login/Logout/Me |
| `PatientController` | ✅ Basic index + store |
| `StorageController` | ✅ Presigned URLs |
| Multi-tenancy middleware | ✅ `TenantContextMiddleware` |
| `RealAbdmService` | ❌ नहीं बना |
| `AbdmWebhookController` | ❌ नहीं बना |
| `ReceptionController` | ❌ नहीं बना |
| Reception API routes | ❌ नहीं जोड़े |
| Frontend Reception Panel | ❌ नहीं बना |
| ngrok / Webhook testing setup | ❌ नहीं किया |

---

## Architecture (जो follow हो रहा है)

```
[Patient ABHA App] ──scan QR──► [ABDM Gateway]
                                      │ webhook push
                                      ▼
                          [AbdmWebhookController]
                                      │ firstOrCreate patient
                                      ▼
                              [CounterQueue] (status: waiting_confirmation)
                                      │
Reception token type करता है          │
                                      ▼
                          [ReceptionController::findByToken]
                                      │ confirmed
                                      ▼
                     Dept + Doctor select ► OpdVisit create ► Receipt
```

**Service Pattern:** Controller → Service (Interface) → Real/Mock impl  
**Mock/Real switch:** `.env` में `ABDM_MOCK_MODE=true/false`

---

## Phase 1 — Backend Core (ABDM Service + Config) 🏗️

**Goal:** Real ABDM API call करने की क्षमता, mock/real switch, gateway token caching.

### Tasks:
- [ ] `config/services.php` में `abdm` block add करो:
  ```php
  'abdm' => [
      'mock_mode'     => env('ABDM_MOCK_MODE', true),
      'base_url'      => env('ABDM_BASE_URL', 'https://dev.abdm.gov.in'),
      'abha_url'      => env('ABDM_ABHA_URL', 'https://abhasbx.abdm.gov.in/abha/api'),
      'client_id'     => env('ABDM_CLIENT_ID'),
      'client_secret' => env('ABDM_CLIENT_SECRET'),
  ],
  ```
- [ ] `.env` / `.env.example` में ABDM variables add करो
- [ ] `RealAbdmService.php` बनाओ (`App\Services\Abdm\`) — इन methods के साथ:
  - `getAccessToken()` — Cache में 100 min store, `POST /api/hiecm/gateway/v3/sessions`
  - `generateOtp(string $mobile)` — `POST /v3/enrollment/request/otp`
  - `verifyOtp(string $txnId, string $otp)` — `POST /v3/enrollment/auth/byAbdm`
  - `createAbha(array $data)` — `POST /v3/enrollment/enrol/byAadhaar`
  - `processScanAndShare(array $payload)` — local processing (no API call)
- [ ] `ServiceBindingProvider` में binding update करो (mock/real switch)
- [ ] 401 auto-retry logic add करो (token expire होने पर cache flush + retry)

**Files:**
- `app/Services/Abdm/RealAbdmService.php` [NEW]
- `config/services.php` [MODIFY]
- `.env.example` [MODIFY]
- `app/Providers/ServiceBindingProvider.php` [MODIFY]

---

## Phase 2 — Backend API: Webhook Receiver (Scan & Share) 📥

**Goal:** ABDM Gateway से आने वाला webhook receive करो, patient + counter_queue save करो।

### Tasks:
- [ ] `AbdmWebhookController.php` बनाओ (`Api/V1/AbdmWebhookController`):
  - `POST /api/v1/abdm/callback/share-profile` — public route (no auth)
  - `Patient::firstOrCreate` by `abha_number`
  - `CounterQueue::firstOrCreate` by `link_token` (idempotency)
  - Log करो unknown payloads
  - हमेशा 200 return करो ABDM को
- [ ] `routes/api.php` में webhook route add करो (middleware के बाहर)
- [ ] `CounterQueue` model में `patient` relationship check करो
- [ ] Webhook payload validation (basic — `profile.patient` का existence check)

**Files:**
- `app/Http/Controllers/Api/V1/AbdmWebhookController.php` [NEW]
- `routes/api.php` [MODIFY]

---

## Phase 3 — Backend API: Reception Controller (तीनों Flows) 👨‍💼

**Goal:** Reception desk के तीनों registration flows के API endpoints बनाओ।

### Flows:
1. **Flow A (Token):** Patient ने ABHA app से scan किया → token screen पर दिखा → reception ने type किया
2. **Flow B (New ABHA):** नया patient, mobile OTP से ABHA बनाओ
3. **Flow C (Skip):** कोई phone नहीं, बिना ABHA सीधा register

### Tasks:
- [ ] `ReceptionController.php` बनाओ (`Api/V1/ReceptionController`):
  - `POST /reception/find-by-token` — Flow A
  - `POST /reception/generate-otp` — Flow B step 1
  - `POST /reception/verify-otp` — Flow B step 2
  - `POST /reception/register-without-abha` — Flow C
  - `POST /reception/create-visit` — Final step (dept + doctor + OPD token)
- [ ] `patientReadyResponse()` helper — patient + departments with doctors
- [ ] `OpdVisit` create with `lockForUpdate` (race condition से बचने के लिए daily queue token)
- [ ] Form Request validation classes बनाओ
- [ ] `routes/api.php` में reception routes add करो (`auth:sanctum` के अंदर)

**Files:**
- `app/Http/Controllers/Api/V1/ReceptionController.php` [NEW]
- `routes/api.php` [MODIFY]

---

## Phase 4 — Database & Models (Relationships + Fixes) 🗄️

**Goal:** सभी migrations सही columns के साथ हों, models में proper relationships हों।

### Tasks:
- [ ] `patients` migration verify करो — required columns: `name`, `mobile`, `dob`, `gender`, `abha_number` (unique nullable), `abha_address`, `hospital_id`
- [ ] `counter_queues` migration verify करो — required columns: `counter_code`, `patient_id` (FK), `link_token` (unique), `status` (default: `waiting_confirmation`), `expires_at` (nullable timestamp)
- [ ] `opd_visits` migration verify करो — required columns: `patient_id`, `doctor_id`, `department_id`, `queue_token` (unsigned int), `visit_date`
- [ ] `doctors` migration में `hpr_id` column add करो (nullable)
- [ ] Models में relationships add करो:
  - `Patient` → `hasMany CounterQueue`, `hasMany OpdVisit`
  - `CounterQueue` → `belongsTo Patient`
  - `OpdVisit` → `belongsTo Patient`, `belongsTo Doctor`, `belongsTo Department`
  - `Doctor` → `belongsTo Department`
  - `Department` → `hasMany Doctor`

**Files:**
- `app/Models/Patient.php` [MODIFY]
- `app/Models/CounterQueue.php` [MODIFY]
- `app/Models/OpdVisit.php` [MODIFY]
- `app/Models/Doctor.php` [MODIFY]
- `app/Models/Department.php` [MODIFY]
- New migration for missing columns (if needed) [NEW]

---

## Phase 5 — Frontend: Reception Panel (React) 💻

**Goal:** Reception desk के लिए एक functional और premium React UI बनाओ।

### Component Structure:
```
src/
├── api/
│   └── reception.js             # Axios API calls
├── pages/
│   └── ReceptionPage.jsx        # Main page (state machine)
└── components/
    └── reception/
        ├── TokenFlow.jsx        # Flow A — token input
        ├── NewAbhaFlow.jsx      # Flow B — mobile + OTP
        ├── SkipFlow.jsx         # Flow C — name/mobile
        ├── DeptDoctorPicker.jsx # Cascading department + doctor dropdowns
        └── ReceiptCard.jsx      # Queue token + print button
```

### Tasks:
- [ ] `src/api/reception.js` — सभी axios calls (findByToken, generateOtp, verifyOtp, registerWithoutAbha, createVisit)
- [ ] `ReceptionPage.jsx` — state machine: `choose → [token|new-abha|skip] → dept-doctor → receipt`
- [ ] `TokenFlow.jsx` — token input, error handling
- [ ] `NewAbhaFlow.jsx` — mobile input → OTP → verify, resend OTP button
- [ ] `SkipFlow.jsx` — name + optional mobile
- [ ] `DeptDoctorPicker.jsx` — cascading dropdowns
- [ ] `ReceiptCard.jsx` — queue token display + `window.print()`
- [ ] Axios interceptor — Bearer token attach करो (Auth से)
- [ ] Loading states + error messages
- [ ] React Router में `/reception` route add करो

**Files:**
- `frontend/src/api/reception.js` [NEW]
- `frontend/src/pages/ReceptionPage.jsx` [NEW]
- `frontend/src/components/reception/` [NEW — multiple files]
- `frontend/src/App.tsx` [MODIFY]

---

## Phase 6 — Local Webhook Testing Setup 🔧

**Goal:** बिना real ABHA app के Scan & Share webhook test कर पाओ।

### Tasks:
- [ ] ngrok install (`winget install ngrok` या download from ngrok.io)
- [ ] `ngrok http 8000` run करो, public URL लो
- [ ] उस URL को ABDM Sandbox Bridge में callback URL की जगह डालो:
  `https://<ngrok-id>.ngrok.io/api/v1/abdm/callback/share-profile`
- [ ] Postman collection बनाओ — manual webhook payload:
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
- [ ] End-to-end test: Postman से webhook POST → frontend पर token "482" type → patient fetch

**Files:**
- `ABDM_Postman_Collection.json` [NEW — project root में]

---

## Phase 7 — Edge Cases, Error Handling & Polish ✨

**Goal:** Production-ready बनाओ।

### Tasks:
- [ ] OTP 3 बार गलत → lockout message ("कुछ देर बाद try करें")
- [ ] OTP expire (~3 min) → "Resend OTP" button, नया `txnId`
- [ ] Gateway token 401 → cache flush + auto retry एक बार
- [ ] Duplicate ABHA (Aadhaar already registered) → Login flow पर redirect
- [ ] Multiple ABHA on same mobile → dropdown दो
- [ ] Scan & Share token expire → "Token invalid, dobara scan karwayein"
- [ ] Duplicate webhook → `link_token` unique constraint gracefully catch करो
- [ ] `counter_queues.expires_at` — 15 min बाद auto-expire
- [ ] Queue token expiry check `findByToken` में
- [ ] Proper HTTP status codes (422 validation, 404 not found, 429 rate limit)
- [ ] Consistent API response structure

---

## Phase 8 — Testing & QA ✅

**Goal:** सब कुछ काम करता हो।

### Testing Checklist:
- [ ] **Flow A:** Postman webhook → frontend token type → patient fetch → dept+doctor → receipt
- [ ] **Flow B (Mock):** Mobile → OTP `123456` → ABHA create → receipt
- [ ] **Flow B (Real):** Real sandbox credentials से same test
- [ ] **Flow C:** Name enter → skip → receipt
- [ ] **Duplicate webhook:** Same `link_token` twice → second silently ignored
- [ ] **Expired token:** `expires_at` past में set → 404
- [ ] **Wrong OTP 3x:** Error message दिखे
- [ ] **Print:** Receipt print dialog open हो
- [ ] **Multi-tenant:** अलग `hospital_id` → अलग data

---

## Quick Reference — API Endpoints

```
POST   /api/v1/abdm/callback/share-profile       # Webhook (PUBLIC — no auth)

POST   /api/v1/reception/find-by-token           # Flow A
POST   /api/v1/reception/generate-otp            # Flow B step 1
POST   /api/v1/reception/verify-otp              # Flow B step 2
POST   /api/v1/reception/register-without-abha   # Flow C
POST   /api/v1/reception/create-visit            # Final — token + receipt
```

---

## Environment Variables (Add to .env)

```env
ABDM_MOCK_MODE=true
ABDM_BASE_URL=https://dev.abdm.gov.in
ABDM_ABHA_URL=https://abhasbx.abdm.gov.in/abha/api
ABDM_CLIENT_ID=            # NHA से मिलेगा
ABDM_CLIENT_SECRET=        # NHA से मिलेगा
```

---

## Progress Tracker

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Backend Core (RealAbdmService + Config) | ⏳ Pending |
| Phase 2 | Webhook Receiver (Scan & Share) | ⏳ Pending |
| Phase 3 | Reception Controller (3 Flows) | ⏳ Pending |
| Phase 4 | Database & Model Relationships | ⏳ Pending |
| Phase 5 | Frontend Reception Panel | ⏳ Pending |
| Phase 6 | Local Webhook Testing Setup | ⏳ Pending |
| Phase 7 | Edge Cases & Error Handling | ⏳ Pending |
| Phase 8 | Testing & QA | ⏳ Pending |

> **कहाँ से शुरू करें:** Phase 1 → Phase 2 → Phase 3 → Phase 4 (parallel) → Phase 5 → Phase 6 → Phase 7 → Phase 8
