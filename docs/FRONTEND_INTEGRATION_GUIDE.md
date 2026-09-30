# 🏥 HMS – Frontend Integration Guide
> **For Frontend Developers** — Step-by-step API flow documentation  
> Base URL: `http://localhost:8000/api/v1`  
> All protected APIs need: `Authorization: Bearer <token>` header  
> 📖 **Comprehensive End-to-End Workflow Guide (OPD, Re-visit, Emergency, IPD 2D Bed Matrix, Doctor Rounds, Nursing & Bed Billing):** See [API_WORKFLOW_AND_INTEGRATION_GUIDE.md](file:///c:/Users/Employee/Desktop/hospital/docs/API_WORKFLOW_AND_INTEGRATION_GUIDE.md)

---

## 🔐 Step 0 — Authentication (Common First Step)

**सभी APIs use करने से पहले Login करना ज़रूरी है।**

```
POST /v1/login
```

```json
// Request
{
  "email": "reception@hospital.com",
  "password": "password"
}

// Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "1|abc123...",
    "user": { "id": 1, "name": "Reception Staff", "role": "reception" }
  }
}
```

> ✅ **DB:** कोई record नहीं बनता, सिर्फ Sanctum token मिलता है।

---

## 🗂️ तीन Patient Registration Flows

```
┌────────────────────────────────────────────────────────────────┐
│                     मरीज़ आता है Reception पे                 │
│                                                                │
│  क्या उसके पास ABHA है?                                       │
│                                                                │
│  YES पहले से है       NO नया बनवाना है        NO ABHA नहीं   │
│  (FLOW A: Login)    (FLOW B: Enrolment)       (FLOW C: Walk-in)│
└────────────────────────────────────────────────────────────────┘
```

---

## FLOW A — मरीज़ के पास ABHA है (Login via Mobile OTP)

> मरीज़ के पास पहले से ABHA Number है, Mobile OTP से verify करके patient register करो।

### Step A1 — Mobile OTP भेजो

```
POST /v1/abha/generate-otp
Authorization: Bearer <token>
```

```json
// Request
{ "mobile": "9876543210" }

// Response
{
  "success": true,
  "message": "OTP Sent Successfully",
  "data": { "txnId": "550e8400-e29b-41d4-a716-446655440000" }
}
```

> ⚠️ `txnId` को frontend state में store करो, next step में लगेगा।  
> ✅ **DB:** कोई record नहीं बनता।

---

### Step A2 — OTP Verify करो

```
POST /v1/abha/verify-otp
Authorization: Bearer <token>
```

```json
// Request
{
  "txnId": "550e8400-e29b-41d4-a716-446655440000",
  "otp": "123456"
}

// Response
{
  "success": true,
  "message": "OTP Verified Successfully",
  "data": {
    "token": "eyJhbGci...",
    "abhaNumber": "91-1234-5678-9012",
    "abhaAddress": "rohit123@abdm",
    "name": "Rohit Sharma"
  }
}
```

> ⚠️ `token` (X-Token) store करो — profile & card download के लिए लगेगा।  
> ✅ **DB:** कोई record नहीं बनता।

---

### Step A3 — Profile Fetch करो (Optional display)

```
GET /v1/abha/profile?token=eyJhbGci...
Authorization: Bearer <token>
```

```json
// Response
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "abhaNumber": "91-1234-5678-9012",
    "name": "Rohit Sharma",
    "gender": "M",
    "yearOfBirth": "1990",
    "mobile": "9876543210"
  }
}
```

---

### Step A4 — Patient को DB में Register करो

> ABHA से मिली details use करके अपने system में patient create करो।

```
POST /v1/patients
Authorization: Bearer <token>
```

```json
// Request
{
  "name": "Rohit Sharma",
  "mobile": "9876543210",
  "gender": "M",
  "dob": "1990-05-15",
  "abha_number": "91-1234-5678-9012",
  "abha_address": "rohit123@abdm"
}

// Response (HTTP 201)
{
  "success": true,
  "message": "Patient created",
  "data": { "id": 42, "name": "Rohit Sharma", "abha_number": "91-1234-..." }
}
```

> ✅ **DB:** `patients` table में नया record बनता है।  
> Columns: `id`, `name`, `mobile`, `abha_number`, `abha_address`, `gender`, `dob`, `hospital_id`

---

### Step A5 — OPD Visit Create करो

```
POST /v1/reception/visit
Authorization: Bearer <token>
```

```json
// Request
{
  "patient_id": 42,
  "doctor_id": 3,
  "department_id": 1,
  "chief_complaint": "सिरदर्द"
}

// Response
{
  "success": true,
  "message": "OPD Visit Created Successfully",
  "data": {
    "id": 101,
    "patient_id": 42,
    "doctor_id": 3,
    "queue_token": 5,
    "visit_date": "2026-08-04",
    "status": "waiting"
  }
}
```

> ✅ **DB:** `opd_visits` table में record बनता है।  
> `queue_token` उस doctor के लिए उस दिन auto-increment होता है (1, 2, 3...)

---

## FLOW B — नया ABHA बनाना (Aadhaar Enrolment)

> मरीज़ के पास ABHA नहीं है, Aadhaar से नया बनाना है।

### Step B1 — Aadhaar OTP भेजो

```
POST /v1/abha/enrol/aadhaar-otp
Authorization: Bearer <token>
```

```json
// Request
{ "aadhaar": "123456789012" }

// Response
{
  "success": true,
  "message": "Aadhaar OTP Sent Successfully",
  "data": { "txnId": "abc-uuid-123" }
}
```

---

### Step B2 — Aadhaar OTP Verify करो

```
POST /v1/abha/enrol/verify-aadhaar
Authorization: Bearer <token>
```

```json
// Request
{
  "txnId": "abc-uuid-123",
  "otp": "123456",
  "mobile": "9876543210"
}

// Response
{
  "success": true,
  "message": "Aadhaar OTP Verified Successfully",
  "data": {
    "txnId": "new-txn-xyz",
    "token": "eyJhbGci...",
    "abhaNumber": "91-9999-8888-7777",
    "isNew": true
  }
}
```

> ⚠️ `isNew = true` → नया ABHA बना, Step B3 continue करो।  
> ⚠️ `isNew = false` → ABHA पहले से था, Flow A के Step A4 पर jump करो।

---

### Step B3 — Mobile OTP भेजो (Linking के लिए)

```
POST /v1/abha/enrol/mobile-otp
Authorization: Bearer <token>
```

```json
// Request
{
  "txnId": "new-txn-xyz",
  "mobile": "9876543210"
}

// Response
{
  "success": true,
  "data": { "txnId": "mobile-txn-abc" }
}
```

---

### Step B4 — Mobile OTP Verify करो

```
POST /v1/abha/enrol/verify-mobile
Authorization: Bearer <token>
```

```json
// Request
{
  "txnId": "mobile-txn-abc",
  "otp": "654321"
}

// Response
{
  "success": true,
  "message": "Mobile Linked Successfully",
  "data": { "authCode": "xyz-auth-code" }
}
```

---

### Step B5 — ABHA Address Suggestions लो

```
GET /v1/abha/enrol/suggest-address?txnId=mobile-txn-abc
Authorization: Bearer <token>
```

```json
// Response
{
  "success": true,
  "data": {
    "abhaAddresses": ["rohit.sharma@abdm", "rohit1990@abdm", "rsharma99@abdm"]
  }
}
```

> User को list दिखाओ, वो एक choose करे।

---

### Step B6 — ABHA Address Choose करो

```
POST /v1/abha/enrol/create-address
Authorization: Bearer <token>
```

```json
// Request
{
  "txnId": "mobile-txn-abc",
  "abhaAddress": "rohit.sharma@abdm"
}

// Response
{
  "success": true,
  "message": "ABHA Address Created Successfully",
  "data": {
    "abhaAddress": "rohit.sharma@abdm",
    "token": "eyJhbGci..."
  }
}
```

---

### Step B7 — Patient को DB में Save + OPD Visit

Flow A के **Step A4 और A5** same करो। Enrolment से मिली details use करो।

---

## FLOW C — Direct Walk-in (ABHA नहीं है, बनवाना भी नहीं)

### Step C1 — Patient Register करो

```
POST /v1/reception/register
Authorization: Bearer <token>
```

```json
// Request — name required, बाकी optional
{
  "name": "Priya Singh",
  "mobile": "9123456789",
  "gender": "F",
  "dob": "1995-03-20",
  "blood_group": "B+",
  "address": "123 MG Road, Lucknow"
}

// Response (HTTP 201)
{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "id": 55,
    "name": "Priya Singh",
    "mobile": "9123456789",
    "abha_number": null,
    "abha_address": null
  }
}
```

> ✅ **DB:** `patients` table में record बनता है — `abha_number` और `abha_address` null रहेंगे।

---

### Step C2 — Departments & Doctors देखो

```
GET /v1/reception/departments
Authorization: Bearer <token>
```

```json
// Response
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "name": "Cardiology",
        "doctors": [
          { "id": 3, "name": "Dr. Sharma", "specialization": "Cardiologist" }
        ]
      }
    ]
  }
}
```

---

### Step C3 — OPD Visit Create करो

Flow A के **Step A5** same है — patient_id (55), doctor_id, department_id भेजो।

---

## FLOW D — Scan & Share (ABHA App से QR Code Scan)

> मरीज़ ने खुद ABHA App से hospital का QR scan किया। Backend webhook automatically handle करता है।

```
Patient scans QR with ABHA App
        │
        ▼
Webhook: POST /api/webhook/abdm/v1/scan-and-share  (automatic)
        │
        ▼
DB: counter_queues table में entry (status: waiting_confirmation)
DB: patients table में patient record (if new)
        │
        ▼
Reception screen poll करती रहे → queues API
```

### Step D1 — Waiting Queue देखो

```
GET /v1/reception/scan-and-share/queues
Authorization: Bearer <token>
```

```json
// Response
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 7,
        "link_token": "ABC482",
        "status": "waiting_confirmation",
        "expires_at": "2026-08-04T12:30:00Z",
        "patient": {
          "name": "Mohan Verma",
          "abha_number": "91-5555-..."
        }
      }
    ]
  }
}
```

> 💡 Frontend को हर 10-15 seconds पर यह API call करनी चाहिए (polling)।

---

### Step D2 — Token से Patient खोजो (Manual entry)

```
POST /v1/reception/scan-and-share/token
Authorization: Bearer <token>
```

```json
// Request
{ "token": "ABC482" }

// Response
{
  "success": true,
  "data": { "id": 7, "patient": { "name": "Mohan Verma" }, "status": "waiting_confirmation" }
}
```

---

### Step D3 — Queue Confirm + OPD Visit बनाओ

```
POST /v1/reception/scan-and-share/confirm
Authorization: Bearer <token>
```

```json
// Request
{
  "queue_id": 7,
  "doctor_id": 3,
  "department_id": 1
}

// Response
{
  "success": true,
  "message": "Queue Confirmed and OPD Visit Created",
  "data": { "id": 102, "queue_token": 6, "status": "waiting" }
}
```

> ✅ **DB:** `counter_queues.status = confirmed`, `opd_visits` में नया record।

---

## 🩺 Doctor Panel (OPD Queue)

### Doctor का आज का Queue देखो

```
GET /v1/opd/queue
Authorization: Bearer <token>
```

### Patient को Call करो

```
POST /v1/opd/visit/{visitId}/call
Authorization: Bearer <token>
```

### Consultation Complete करो

```
POST /v1/opd/visit/{visitId}/complete
Authorization: Bearer <token>
```

---

## 📋 Database Records Summary

| Action | Table | Record |
|--------|-------|--------|
| Login | — | ❌ नहीं |
| OTP Generate/Verify | — | ❌ नहीं (ABDM API call) |
| `POST /v1/patients` | `patients` | ✅ हाँ |
| `POST /v1/reception/register` | `patients` | ✅ हाँ |
| `POST /v1/reception/visit` | `opd_visits` | ✅ हाँ |
| Scan & Share Webhook (auto) | `patients`, `counter_queues` | ✅ हाँ |
| `POST /reception/scan-and-share/confirm` | `counter_queues` (update) + `opd_visits` | ✅ हाँ |
| `POST /v1/opd/visit/{id}/call` | `opd_visits` (update) | ✅ हाँ |
| `POST /v1/opd/visit/{id}/complete` | `opd_visits` (update) | ✅ हाँ |

---

## ⚠️ Error Handling Reference

| HTTP Code | Meaning | Frontend Action |
|-----------|---------|----------------|
| `422` | Invalid format (mobile/aadhaar) | Field के नीचे error दिखाओ |
| `400` | Invalid OTP / Expired txnId | "OTP गलत है या expire हो गया" |
| `401` | Token expired | Login screen पर redirect करो |
| `404` | Queue/Token not found | "Token नहीं मिला" |
| `429` | OTP rate limit | "60 सेकंड बाद try करें" |
| `500` | Server error | Generic error message |

### Error Response Format (सभी errors इसी format में)

```json
{
  "success": false,
  "message": "Human readable error message in Hindi/English",
  "errors": {
    "mobile": ["The mobile field must be 10 digits."]
  }
}
```

---

## 🔗 Quick API Cheatsheet

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/login` | Login |
| POST | `/v1/logout` | Logout |
| GET | `/v1/user` | Logged in user info |

### ABHA — Login Flow (पहले से ABHA है)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/abha/generate-otp` | Mobile OTP भेजो |
| POST | `/v1/abha/verify-otp` | OTP verify करो |
| GET | `/v1/abha/profile?token=` | Profile fetch |
| POST | `/v1/abha/search` | Mobile से ABHA खोजो |
| GET | `/v1/abha/card?token=` | Card PDF download |
| GET | `/v1/abha/qr-code?token=` | QR Code download |

### ABHA — Enrolment Flow (नया ABHA बनाना)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/abha/enrol/aadhaar-otp` | Aadhaar OTP |
| POST | `/v1/abha/enrol/verify-aadhaar` | Aadhaar verify |
| POST | `/v1/abha/enrol/mobile-otp` | Mobile OTP (linking) |
| POST | `/v1/abha/enrol/verify-mobile` | Mobile verify |
| GET | `/v1/abha/enrol/suggest-address?txnId=` | Address suggestions |
| POST | `/v1/abha/enrol/create-address` | Address create |

### Reception
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/patients` | Patient create (with ABHA) |
| GET | `/v1/patients` | All patients |
| POST | `/v1/reception/register` | Walk-in register (no ABHA) |
| GET | `/v1/reception/departments` | Departments + Doctors |
| POST | `/v1/reception/visit` | OPD Visit create |
| GET | `/v1/reception/scan-and-share/queues` | Waiting queue |
| POST | `/v1/reception/scan-and-share/token` | Token lookup |
| POST | `/v1/reception/scan-and-share/confirm` | Confirm queue |

### OPD (Doctor)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/opd/queue` | Today's queue |
| POST | `/v1/opd/visit/{id}/call` | Call patient |
| POST | `/v1/opd/visit/{id}/complete` | Complete consultation |
