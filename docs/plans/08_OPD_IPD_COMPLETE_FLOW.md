# Plan 08 — Complete OPD & IPD Patient Journey

> **Purpose:** Developers aur receptionist training ke liye complete operational reference.
> **Scope:** Patient arrival → Registration → OPD Slip → Vitals → Consultation → IPD → Discharge.
> **Stack:** Laravel API (Backend) + React/TypeScript (Frontend) + ABDM M1 Integration

---

## Table of Contents

1. [System Actors & Roles](#1-system-actors--roles)
2. [Frontend Screens Overview](#2-frontend-screens-overview)
3. [Phase 1 — Registration (Reception)](#3-phase-1--registration-reception)
4. [Phase 2 — OPD Slip Generation](#4-phase-2--opd-slip-generation)
5. [Phase 3 — Vitals Recording (Nurse)](#5-phase-3--vitals-recording-nurse)
6. [Phase 4 — Doctor Consultation](#6-phase-4--doctor-consultation)
7. [Phase 5 — IPD Admission (Planned)](#7-phase-5--ipd-admission-planned)
8. [Phase 6 — IPD Daily Vitals & Ward Management (Planned)](#8-phase-6--ipd-daily-vitals--ward-management-planned)
9. [Phase 7 — Discharge & Billing (Planned)](#9-phase-7--discharge--billing-planned)
10. [Complete Flow Diagram](#10-complete-flow-diagram)
11. [Vitals — Database Schema Reference](#11-vitals--database-schema-reference)
12. [API Quick Reference Table](#12-api-quick-reference-table)
13. [Frontend State Management Guide](#13-frontend-state-management-guide)
14. [Edge Cases & Error Handling](#14-edge-cases--error-handling)

---

## 1. System Actors & Roles

| Actor | Role | Primary Screens |
|:---|:---|:---|
| Super Admin | `superadmin` | Hospital CRUD, Admin management |
| Hospital Admin | `admin` | Doctors, Departments, Schedules |
| Receptionist | `receptionist` | Patient Register, OPD Slip, Queue |
| **Nurse** | `nurse` | **Vitals entry (OPD + IPD), Ward management** |
| Doctor | `doctor` | OPD Queue, Consultation (reads vitals), IPD Rounds |
| Pharmacist | `pharmacist` | Medicine dispensing |
| Lab Technician | `lab_tech` | Lab tests & Reports |

---

## 2. Frontend Screens Overview

```
App
├── /login
├── /dashboard                       → Role-based dashboard
│
├── /reception
│   ├── /reception/register          → Patient registration (all 4 paths)
│   ├── /reception/queue             → Scan & Share webhook queue
│   └── /reception/visit/create      → OPD Slip generation
│
├── /nurse                           → Nurse Panel
│   ├── /nurse/vitals                → Today's OPD queue (vitals pending)
│   └── /nurse/vitals/:visitId       → Vitals entry form for a patient
│
├── /opd
│   ├── /opd/queue                   → Doctor's today queue (vitals-done patients only)
│   └── /opd/consultation/:visitId   → Consultation room (reads vitals)
│
├── /ipd  (Planned)
│   ├── /ipd/admissions
│   ├── /ipd/ward/:wardId            → Ward view (nurse enters daily vitals)
│   └── /ipd/:admissionId
│
├── /patients                        → Patient records & vitals history
└── /admin
    ├── /admin/departments
    ├── /admin/doctors
    └── /admin/hospitals
```

---

## 3. Phase 1 — Registration (Reception)

### Screen: `/reception/register`

Receptionist ko 4 options dikhenge:

```
+---------------------------------------------------------------+
|  PATIENT REGISTRATION                                         |
|  Patient Kaisa Aaya Hai? Choose Method:                       |
|                                                               |
|  [Walk-in]  [ABHA Mobile OTP]  [New ABHA]  [QR/Scan&Share]   |
+---------------------------------------------------------------+
```

---

### Path A — Walk-in (No ABHA)

**Use karo jab:** Patient ke paas ABHA nahi hai ya banana nahi chahta.

**Frontend Steps:**
1. "Walk-in" tab select karo
2. Manual form: Name* | Mobile | Gender* | DOB | Blood Group | Address | City | Pincode
3. "Register Patient" → `patient.id` milega

```
POST /api/v1/reception/register
{
  "name": "Ramesh Kumar", "mobile": "9876543210",
  "gender": "M", "dob": "1985-08-15",
  "blood_group": "B+", "address": "House 4, Sector 12",
  "city": "Gurgaon", "pincode": "122001"
}
Response: { "data": { "id": 5, "name": "Ramesh Kumar" } }
```

---

### Path B — Existing ABHA (Mobile OTP Login)

**Use karo jab:** Patient bolta hai "Mera ABHA pehle se bana hua hai."

```
Step 1: Mobile Enter → [Send OTP]
Step 2: OTP Verify → [9][3][6][7][8][5]  Resend 60s
Step 3: Auto-fill (LOCKED fields)
  Name   [Bipin Sahani       ] LOCKED
  Gender [M                  ] LOCKED
  DOB    [31-07-2001         ] LOCKED
  ABHA # [91-6843-3113-0329 ] LOCKED
  ABHA @ [91684331130329@sbx] LOCKED
  Mobile [7049711475  ] editable
  Blood  [B+          ] editable
  [Save Patient & Continue]
```

```
1. POST /api/v1/abha/search  { "mobile": "7049711475" }
   → { "ABHA": [{ "ABHANumber": "xx-xxxx-xxxx-0329", "name": "Bipin Sahani" }] }

2. POST /api/v1/abha/generate-otp  { "mobile": "7049711475" }
   → { "txnId": "ecbbff61-7128-42bc-bfb2-819f86ed5d16" }

3. POST /api/v1/abha/verify-otp  { "txnId": "ecbbff61...", "otp": "936785" }
   → {
       "authResult": "success",
       "token": "eyJhbGci...",     <-- Transfer Token (session only, NOT for /profile)
       "accounts": [{
         "ABHANumber": "91-6843-3113-0329", "name": "Bipin Sahani",
         "gender": "M", "dob": "31-07-2001",
         "preferredAbhaAddress": "91684331130329@sbx",
         "profilePhoto": "/9j/4AAQ..."
       }]
     }

4. POST /api/v1/reception/register
   { "name": "Bipin Sahani", "gender": "M", "dob": "2001-07-31",
     "abha_number": "91-6843-3113-0329", "abha_address": "91684331130329@sbx",
     "mobile": "7049711475" }
   → { "data": { "id": 6 } }
```

> TOKEN NOTE: verify-otp ka token ek Transfer Token hai.
> Iska use /profile, /card, /qr-code ke liye NAHI hota.
> Profile data seedha accounts[] array mein milta hai.
> /profile /card /qr-code ke liye Aadhaar Enrolment ka X-Token chahiye (Path C).

---

### Path C — New ABHA (Aadhaar Enrolment)

**Use karo jab:** Patient ka ABHA nahi bana hai, Aadhaar se naya banana hai.

```
Step 1: Consent Screen (NHA M1 Mandatory)
  "Main apni marzi se Aadhaar se ABHA banwana chahta hoon..."
  [Checkbox] Maine padha aur agree karta hoon
  [Cancel] [Agree & Continue]

Step 2: Aadhaar Number  [XXXX]-[XXXX]-[XXXX]  → [Send OTP]

Step 3: Aadhaar OTP  [1][2][3][4][5][6]  Timer: 02:45

Step 4: Mobile Linking (Conditional)
  IF Aadhaar mobile == entered mobile: SKIP
  ELSE: Enter hospital mobile → Send & Verify secondary OTP

Step 5: ABHA Address Select
  (o) bipinsahani@abdm
  ( ) bipin.sahani1@abdm
  ( ) Custom: [___________]   (8-18 chars, alphanumeric + max 1 dot/underscore)

Step 6: Success
  ABHA Number : 91-6843-3113-0329
  ABHA Address: bipinsahani@abdm
  [Download ABHA Card] [Download QR Code]
  [Proceed to OPD Registration]
```

```
C1. POST /api/v1/abha/enrol/aadhaar-otp  { "aadhaar": "123456789012" }
    → { "txnId": "2d686ddd-..." }

C2. POST /api/v1/abha/enrol/verify-aadhaar
    { "txnId": "2d686ddd...", "otp": "654321", "mobile": "7049711475" }
    → { "token": "eyJhbGciOiJSUzUxMiJ9..." }
       ^^^^ X-TOKEN — use for /profile, /card, /qr-code

C3. (If mobile diff) POST /api/v1/abha/enrol/mobile-otp  { "txnId": "...", "mobile": "..." }
C4. (If mobile diff) POST /api/v1/abha/enrol/verify-mobile  { "txnId": "...", "otp": "..." }

C5. GET /api/v1/abha/enrol/suggest-address?txnId=...&token=eyJhbGci...
    → { "abhaAddressList": ["bipinsahani@abdm", "bipin.sahani1@abdm", ...] }

C6. POST /api/v1/abha/enrol/create-address
    { "txnId": "...", "token": "...", "abhaAddress": "bipinsahani@abdm" }
    → { "abhaAddress": "bipinsahani@abdm", "ABHANumber": "91-6843-3113-0329" }

C7. (Optional) GET /api/v1/abha/profile?token=eyJhbGci...
    → { "name": "Bipin Sahani", "dob": "2001-07-31", "gender": "M" }

C8. (Optional) GET /api/v1/abha/card?token=...     → { "data": "base64_pdf" }
C9. (Optional) GET /api/v1/abha/qr-code?token=...  → { "data": "base64_image" }

C10. POST /api/v1/reception/register
     { "name": "Bipin Sahani", "abha_number": "91-6843-3113-0329", ... }
     → { "data": { "id": 7 } }
```

---

### Path D — Scan & Share (QR Code)

**Use karo jab:** Patient hospital counter ka QR scan karta hai ABHA App se.

**How it works:**
1. Hospital ek fixed QR counter par display karta hai
2. Patient ABHA App se scan karta hai
3. ABDM automatically backend ko webhook call karta hai
4. Backend patient save + unique Token generate (30 min valid)
5. Receptionist dashboard par entry dikhti hai

```
AUTO (ABDM calls backend):
  POST /webhook/abdm/v1/scan-and-share
  Backend: Patient save + TK-482 token + 30 min expiry

GET /api/v1/reception/scan-and-share/queues?status=waiting&per_page=15
+--------+-------------------+----------+----------+---------------+
| Token  | Patient Name      | ABHA #   | Time     | Action        |
+--------+-------------------+----------+----------+---------------+
| TK-482 | Bipin Sahani      | 91-68... | 2 min    | [Confirm]     |
| TK-484 | Ramesh Patel      | 91-45... | 8 min    | [Expired]     |
+--------+-------------------+----------+----------+---------------+

POST /api/v1/reception/scan-and-share/token  { "token": "482" }
→ { "patient": { "name": "Bipin Sahani" }, "queue_id": 23 }

POST /api/v1/reception/scan-and-share/confirm
{ "queue_id": 23, "doctor_id": 2, "department_id": 1 }
→ { "id": 45, "queue_token": 7, "status": "waiting" }
```

---

## 4. Phase 2 — OPD Slip Generation

**Screen: `/reception/visit/create`** — Path A/B/C ke baad. Path D mein confirm step pe hi banti hai.

```
+------------------------------------------------------------------+
| OPD VISIT REGISTRATION                                           |
| Patient: Bipin Sahani  |  ABHA: 91-6843-3113-0329               |
| Department *   : [ General Medicine          v ]                 |
| Doctor *       : [ Dr. Rajesh Sharma         v ]                 |
| Chief Complaint: [Fever aur body pain                       ]   |
| -- Fee Collection ---                                            |
| Fee Amount  : [Rs. 200.00 ]                                     |
| Payment     : (o) Cash  ( ) Card  ( ) UPI  ( ) Insurance        |
| UPI Ref     : [UPI123456789          ]                          |
| Status      : (o) Paid  ( ) Pending  ( ) Waived                 |
| [Back]   [Generate OPD Slip & Print]                             |
+------------------------------------------------------------------+
```

```
GET /api/v1/reception/departments?all=true
→ [{ "id": 1, "name": "General Medicine",
     "doctors": [{ "id": 2, "name": "Dr. Rajesh Sharma" }] }]

POST /api/v1/reception/visit
{
  "patient_id": 6, "doctor_id": 2, "department_id": 1,
  "appointment_type_id": 1,
  "chief_complaint": "Fever aur body pain",
  "fee_charged": 200.00, "payment_status": "paid",
  "payment_method": "upi", "payment_ref": "UPI123456789"
}
→ { "id": 45, "queue_token": 7, "status": "waiting" }
```

**OPD Slip Print:**
```
+-----------------------------------------------------+
|           CITY HOSPITAL -- OPD SLIP                 |
|            14-August-2026  |  02:30 PM              |
|  QUEUE TOKEN: #7            Visit: OPD-2026-045     |
|  Patient : Bipin Sahani   ABHA: 91-6843-3113-0329  |
|  Gender/Age: Male, 25 yrs  Mobile: 7049711475       |
|  Department: General Medicine                        |
|  Doctor    : Dr. Rajesh Sharma                      |
|  Fee: Rs.200  |  Paid via UPI (UPI123456789)        |
|         [ABHA QR CODE IMAGE HERE]                   |
+-----------------------------------------------------+
```

**Status after creation:** `waiting`

---

## 5. Phase 3 — Vitals Recording (Nurse)

> **STATUS:** Database (`vitals` table) + Model (`Vital.php`) ready hai.
> `VitalController` implement karna baaki hai. Routes bhi add nahi hue.

**Kab hota hai:** Patient OPD Slip leke nurse ke paas jaata hai (doctor ke cabin se PEHLE).
Nurse vitals enter karta hai → tab patient doctor ke queue mein visible hota hai.

---

### Vitals — Types & Database Columns

| Vital Type | DB Column(s) | Unit | Example Value |
|:-----------|:------------|:-----|:--------------|
| Temperature | `temperature` + `temperature_unit` | F or C | 102.4 F |
| Blood Pressure | `blood_pressure_sys` / `blood_pressure_dia` | mmHg | 120 / 80 |
| Pulse Rate | `pulse_rate` | bpm | 88 |
| Respiratory Rate | `respiratory_rate` | breaths/min | 18 |
| SpO2 (Oxygen Sat.) | `oxygen_saturation` | % | 98.5 |
| Weight | `weight` | kg | 72.50 |
| Height | `height` | cm | 175.00 |
| BMI | `bmi` | calculated | 23.67 (auto) |
| Blood Glucose | `blood_glucose` + `glucose_type` | mg/dL | 95 (fasting) |

**`glucose_type` options:** `fasting` / `random` / `post_meal`
**`temperature_unit` options:** `F` / `C`

**Linked Fields (auto-set by backend):**
- `patient_id` — Patient kaun hai
- `opd_visit_id` — Kis OPD visit se linked (nullable — IPD ke liye bhi use)
- `recorded_by` — Nurse ka user.id
- `recorded_at` — Exact timestamp

---

### Normal Ranges (For Frontend Color Coding)

| Vital | Normal (Green) | Warning (Orange) | Critical (Red) |
|:------|:--------------|:----------------|:--------------|
| Temperature (F) | 97.0 – 99.0 | 99.1 – 100.9 | >= 101.0 |
| BP Systolic | 90 – 120 | 121 – 139 | >= 140 or < 90 |
| BP Diastolic | 60 – 80 | 81 – 89 | >= 90 or < 60 |
| Pulse Rate | 60 – 100 | 101 – 119 | >= 120 or < 60 |
| SpO2 | >= 95% | 91 – 94% | < 91% |
| Blood Glucose (F) | 70 – 99 | 100 – 125 | >= 126 or < 70 |
| BMI | 18.5 – 24.9 | 25 – 29.9 | >= 30 or < 18.5 |

---

### Nurse Dashboard: `/nurse/vitals`

```
+------------------------------------------------------------------+
|  VITALS ENTRY — 14-Aug-2026                                      |
|  Total: 12   Vitals Pending: 8   Done: 4                         |
+----+------------------+-------------------+----------+-----------+
| #  | Patient          | Complaint         | Vitals   | Action    |
+----+------------------+-------------------+----------+-----------+
|  7 | Bipin Sahani     | Fever, body pain  | PENDING  | [Enter]   |
|  6 | Priya Sharma     | Knee pain         | PENDING  | [Enter]   |
|  5 | Amit Patel       | Diabetes check    | DONE     | [View]    |
+----+------------------+-------------------+----------+-----------+
```

### Vitals Entry Form: `/nurse/vitals/:visitId`

```
+------------------------------------------------------------------+
|  VITALS ENTRY                                                    |
|  Patient: Bipin Sahani  |  Token #7  |  14-Aug-2026  02:35 PM   |
+------------------------------------------------------------------+
|  BASIC MEASUREMENTS                                              |
|  Weight (kg) : [72.50   ]    Height (cm): [175.00  ]            |
|  BMI         : [23.67   ] (auto-calculated on save)              |
+------------------------------------------------------------------+
|  VITAL SIGNS                                                     |
|  Temperature : [102.4   ]  Unit: (o) F  ( ) C                   |
|  Blood Pressure: Systolic [120 ] / Diastolic [80 ] mmHg         |
|  Pulse Rate  : [88      ] bpm                                    |
|  Resp. Rate  : [18      ] breaths/min                           |
|  SpO2        : [98.5    ] %                                      |
+------------------------------------------------------------------+
|  BLOOD GLUCOSE (Optional)                                        |
|  Glucose : [95.0 ] mg/dL   Type: (o) Fasting ( ) Random ( ) PM  |
+------------------------------------------------------------------+
|  [Cancel]                             [Save Vitals]              |
+------------------------------------------------------------------+
```

---

### API Sequence (To be implemented in VitalController)

```
Record OPD Vitals (Nurse → before consultation):
  POST /api/v1/visits/{visitId}/vitals
  Authorization: Bearer {nurse_token}
  {
    "recorded_at": "2026-08-14T14:35:00",
    "temperature": 102.4, "temperature_unit": "F",
    "blood_pressure_sys": 120, "blood_pressure_dia": 80,
    "pulse_rate": 88, "respiratory_rate": 18,
    "oxygen_saturation": 98.5,
    "weight": 72.50, "height": 175.00,
    "blood_glucose": 95.0, "glucose_type": "fasting"
  }
  Response:
  {
    "success": true,
    "data": {
      "id": 101,
      "bmi": 23.67,          <-- backend auto-calculates (weight / (height/100)^2)
      "recorded_by": { "name": "Nurse Meena" }
    }
  }

View Vitals for a Visit:
  GET /api/v1/visits/{visitId}/vitals
  → { "data": [{
      "temperature": 102.4, "temperature_unit": "F",
      "blood_pressure_sys": 120, "blood_pressure_dia": 80,
      "pulse_rate": 88, "oxygen_saturation": 98.5,
      "weight": 72.50, "height": 175.00, "bmi": 23.67,
      "blood_glucose": 95.0, "glucose_type": "fasting",
      "recorded_at": "2026-08-14T14:35:00",
      "recorded_by": { "id": 12, "name": "Nurse Meena" }
    }] }

Patient Full Vitals History (all visits):
  GET /api/v1/patients/{patientId}/vitals?from=2026-01-01&to=2026-08-14
  → Array sorted by recorded_at DESC
```

### BMI Auto-Calculation Backend Logic:

```php
// VitalController@store mein add karo:
if (!empty($data['weight']) && !empty($data['height'])) {
    $heightM = $data['height'] / 100;
    $data['bmi'] = round($data['weight'] / ($heightM ** 2), 2);
}
```

### Routes to Add (`routes/api.php` mein):

```php
// Vitals
Route::post('/visits/{visitId}/vitals', [VitalController::class, 'store']);
Route::get('/visits/{visitId}/vitals', [VitalController::class, 'index']);
Route::get('/patients/{patientId}/vitals', [VitalController::class, 'patientHistory']);

// IPD Vitals (Future)
Route::post('/ipd/{admissionId}/vitals', [VitalController::class, 'storeIpd']);
Route::get('/ipd/{admissionId}/vitals', [VitalController::class, 'ipdTimeline']);
```

---

## 6. Phase 4 — Doctor Consultation

**Screen: `/opd/queue`**

> **UI Rule:** Doctor queue mein sirf wahi patients dikhenge jinke vitals enter ho chuke hain.
> "Vitals Pending" wale patients nurse ke screen par rahenge.

### Doctor Dashboard (with vitals inline):

```
+------------------------------------------------------------------+
| Dr. Rajesh Sharma  |  General Medicine  |  14-Aug-2026           |
| Total: 12  |  Waiting: 7  |  Consulting: 1  |  Done: 4           |
+----+------------------+-------------------+------------+---------+
| #  | Patient          | BP / Temp / SpO2  | Status     | Action  |
+----+------------------+-------------------+------------+---------+
|  7 | Bipin Sahani     | 120/80|102F|98%   | WAITING    | [Call]  |
|  6 | Priya Sharma     | 118/76| 99F|99%   | WAITING    | [Call]  |
|  5 | Amit Patel       | 130/84| 98F|97%   | CONSULTING | [Done]  |
|  4 | Sunita Verma     | 115/75| 98F|99%   | DONE       |  ---    |
+----+------------------+-------------------+------------+---------+
```

```
GET /api/v1/opd/queue?doctor_id=2&status=all&per_page=20
→ { "data": [{ "id": 45, "queue_token": 7, "status": "waiting",
               "patient": { "name": "Bipin Sahani" },
               "latest_vital": {     <-- include in response (eager load)
                 "blood_pressure_sys": 120, "blood_pressure_dia": 80,
                 "temperature": 102.4, "oxygen_saturation": 98.5
               } }] }

POST /api/v1/opd/visit/45/call  { "doctor_id": 2 }
→ { "id": 45, "status": "in_consultation" }

POST /api/v1/opd/visit/45/complete
{ "doctor_id": 2, "diagnosis": "Viral Fever",
  "notes": "Rest 3 days. Paracetamol 500mg TDS. ORS lena." }
→ { "id": 45, "status": "done" }
```

### Consultation Room `/opd/consultation/:visitId`:

```
+------------------------------------------------------------------+
| CONSULTATION  Token #7  |  Bipin Sahani  25yr / M                |
| ABHA: 91-6843-3113-0329                                          |
+------------------------------------------------------------------+
| CHIEF COMPLAINT: Fever aur body pain                             |
+------------------------------------------------------------------+
| VITALS (Nurse Meena, 02:35 PM)                                   |
| Temp:  102.4F [RED]    BP:  120/80  [GREEN]                     |
| Pulse: 88 bpm [GREEN]  SpO2: 98.5% [GREEN]                      |
| Resp:  18/min [GREEN]  Wt: 72.5kg  Ht: 175cm  BMI: 23.67        |
| Glucose: 95 mg/dL Fasting [GREEN]                                |
+------------------------------------------------------------------+
| PAST HISTORY: [View Previous Visits & Vitals Trend]             |
+------------------------------------------------------------------+
| DIAGNOSIS: [Viral Fever                                    ]     |
| NOTES:     [Paracetamol 500mg TDS x 5 days, ORS, Rest 3d  ]     |
| LAB TESTS: [+ Add Lab Order]                                     |
| MEDICINES: [+ Add Prescription]                                  |
|                                                                  |
| [Admit to IPD]              [Complete Consultation]              |
+------------------------------------------------------------------+
```

**Status Flow:** `waiting → in_consultation → done` (or `admitted_to_ipd`)

---

## 7. Phase 5 — IPD Admission (Planned)

> **STATUS:** `IpdAdmissionController` abhi empty hai — future implementation.

**Trigger:** Doctor "Admit to IPD" click karta hai consultation ke time.

```
Step 1 — Ward & Bed Selection
  Reason  : [Viral Fever - needs IV fluids      ]
  Ward    : [General Ward    v]
  Bed     : [W1-B03 (Avail) v]
  Expected Stay: [3] days
  [Admit Patient]

Step 2 — IPD Admission Slip
  IPD No: IPD-2026-012  |  Ward: General Ward  |  Bed: W1-B03
  ADMISSION VITALS (from OPD): BP:120/80  Temp:102.4F  SpO2:98.5%
  [Print IPD Slip]  [Go to Ward View]
```

```
GET /api/v1/ipd/beds?ward_id=1&status=available
POST /api/v1/ipd/admissions
{
  "patient_id": 6, "doctor_id": 2, "department_id": 1,
  "bed_id": 3, "ward_id": 1,
  "admission_date": "2026-08-14",
  "admission_reason": "Viral Fever - IV fluids needed",
  "opd_visit_id": 45
}
→ { "id": 12, "admission_number": "IPD-2026-012", "status": "admitted" }
```

---

## 8. Phase 6 — IPD Daily Vitals & Ward Management (Planned)

> **STATUS:** Future. `vitals` table already supports IPD — `opd_visit_id` nullable hai.

**OPD vs IPD Vitals Comparison:**

| Feature | OPD Vitals | IPD Vitals |
|:--------|:-----------|:-----------|
| Frequency | Ek baar (before consultation) | Har shift: Morning / Evening / Night |
| Linked to | `opd_visit_id` | `ipd_admission_id` (future column needed) |
| Entered by | Nurse (OPD counter) | Nurse (ward) |
| Doctor views | Consultation screen | IPD rounds / timeline |
| Fields extra | — | shift, nurse_notes |

**Nurse Ward View:**

```
Ward: General Ward  |  Floor 1  |  14-Aug-2026
+------+------------------+---------+------------------------------+--------+
| Bed  | Patient          | Doctor  | Last Vitals                  | Action |
+------+------------------+---------+------------------------------+--------+
| B01  | Bipin Sahani     | Dr. RS  | 08:00 BP:122/82 T:101F      | [Enter]|
| B02  | Priya Sharma     | Dr. AK  | 06:00 BP:118/76 T:99F       | [Enter]|
| B03  | EMPTY            | --      | --                           |  ---   |
+------+------------------+---------+------------------------------+--------+
```

**Vitals Entry — IPD Form:**

```
+------------------------------------------------------------------+
|  VITALS ENTRY — IPD                                              |
|  Patient: Bipin Sahani  |  Bed: W1-B03  |  14-Aug-2026 14:00   |
|  Shift: (o) Morning  ( ) Evening  ( ) Night                      |
|  Temperature : [101.2   ] F                                      |
|  BP          : [122] / [82] mmHg                                |
|  Pulse Rate  : [90] bpm   Resp. Rate: [18] breaths/min          |
|  SpO2        : [97.5] %   Weight: [72.50] kg                    |
|  Blood Glucose: [88.0] mg/dL  Type: (o) Random                  |
|  Nurse Notes : [Patient feeling better, fever reducing      ]   |
|  [Cancel]              [Save IPD Vitals]                         |
+------------------------------------------------------------------+
```

**Planned APIs:**

```
Record IPD Vitals (per shift):
  POST /api/v1/ipd/{admissionId}/vitals
  {
    "recorded_at": "2026-08-14T14:00:00",
    "temperature": 101.2, "temperature_unit": "F",
    "blood_pressure_sys": 122, "blood_pressure_dia": 82,
    "pulse_rate": 90, "respiratory_rate": 18,
    "oxygen_saturation": 97.5, "weight": 72.50,
    "blood_glucose": 88.0, "glucose_type": "random",
    "shift": "evening",
    "notes": "Patient feeling better, fever reducing"
  }

Get IPD Vitals Timeline (Doctor rounds):
  GET /api/v1/ipd/{admissionId}/vitals
  → Array sorted by recorded_at ASC
    (Doctor dekhta hai trend: improving ya deteriorating)

Patient Full Vitals History (all OPD + IPD combined):
  GET /api/v1/patients/{patientId}/vitals?from=2026-01-01
  → Chronological timeline across all visits & admissions
```

**Doctor IPD Rounds — Patient Timeline Screen:**

```
+------------------------------------------------------------------+
|  PATIENT TIMELINE  |  Bipin Sahani  |  IPD-2026-012             |
+------------------+-------------------------------------------------+
|  14-Aug 08:00   | VITALS: BP:120/80  T:102.4F  SpO2:98  PR:88  |
|  14-Aug 10:00   | MEDICINE: Paracetamol 500mg IV given           |
|  14-Aug 12:00   | LAB ORDER: CBC + LFT ordered                  |
|  14-Aug 14:00   | VITALS: BP:122/82  T:101.2F  SpO2:97.5  PR:90|
|  14-Aug 15:30   | LAB RESULT: WBC 12000 (elevated)              |
|  14-Aug 20:00   | VITALS: BP:118/78  T:99.8F   SpO2:98.5  PR:82|
|  15-Aug 08:00   | VITALS: BP:116/76  T:98.6F   SpO2:99    PR:78|
+------------------+-------------------------------------------------+
       Vitals Trend Chart (mini graph above the table):
       X: Time  |  Lines: Temp (red), BP-Sys (blue), SpO2 (green)
```

---

## 9. Phase 7 — Discharge & Billing (Planned)

```
POST /api/v1/ipd/{id}/discharge-summary
{
  "summary": "Patient admitted with Viral Fever, treated with IV fluids...",
  "final_diagnosis": "Viral Fever — Resolved",
  "discharge_medications": "Paracetamol 500mg TDS x 3 days",
  "discharge_vitals_note": "Afebrile 24hrs. BP stable. SpO2 99% room air."
}

POST /api/v1/invoices
{
  "patient_id": 6, "ipd_admission_id": 12,
  "items": [
    { "description": "Bed Charges (3 days)",  "amount": 1500 },
    { "description": "Doctor Rounds (3)",      "amount": 600  },
    { "description": "Medicines & IV Fluids",  "amount": 850  },
    { "description": "Lab Tests (CBC, LFT)",   "amount": 800  },
    { "description": "Nursing Charges",        "amount": 300  }
  ],
  "total": 4050, "payment_method": "card", "payment_ref": "CARD-7823"
}

POST /api/v1/ipd/{id}/discharge
→ { "status": "discharged", "bed_status": "available" }
```

---

## 10. Complete Flow Diagram

```
PATIENT ARRIVES
      |
      +-- A: Walk-in → POST /reception/register
      +-- B: Mobile OTP → generate-otp → verify-otp → accounts[] → register
      +-- C: Aadhaar → aadhaar-otp → verify-aadhaar(X-Token) → suggest → create → register
      +-- D: QR Scan → ABDM webhook → queues → confirm
                                                     |
                          patient.id milta hai -------+
                                  |
                    GET /reception/departments
                                  |
                    POST /reception/visit ──► OPD Slip #7
                                  |             status: "waiting"
                    +-------------+------------------+
                    |                                |
              NURSE PANEL                    DOCTOR QUEUE
              /nurse/vitals                  (waits for vitals)
                    |
            POST /visits/45/vitals
            (Temp, BP, Pulse, SpO2,
             Weight, Height → BMI auto,
             Glucose)
                    |
            vitals_done = true
                    |
                    +→ Patient now visible in Doctor Queue
                                  |
                    GET /opd/queue (vitals shown inline)
                                  |
                        +---------+---------+
                        |                   |
                  POST /call          (waits...)
                 "in_consultation"         |
                        |                  |
                  POST /complete           |
                  "done"                   |
                        |                  |
                  +-----+------+           |
                  |            |           |
              OPD Done   Admit to IPD      |
              Goes Home   POST /ipd/admissions
                                |
                    NURSE: POST /ipd/{id}/vitals (3x/day per shift)
                    DOCTOR: GET /ipd/{id}/vitals (timeline view)
                                |
                    POST /ipd/{id}/discharge-summary
                    POST /invoices (Final Bill)
                    POST /ipd/{id}/discharge (Bed freed)
                                |
                         Patient Goes Home
```

---

## 11. Vitals — Database Schema Reference

```sql
-- vitals table (Migration: 2026_07_23_063534_create_vitals_table.php)
-- Model: app/Models/Vital.php  (fillable already set)
-- Controller: app/Http/Controllers/Api/V1/VitalController.php  (EMPTY - implement!)

CREATE TABLE vitals (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  hospital_id         BIGINT NOT NULL,        -- FK hospitals.id
  patient_id          BIGINT NOT NULL,        -- FK patients.id
  opd_visit_id        BIGINT NULL,            -- FK opd_visits.id (NULL for IPD-only)
  recorded_by         BIGINT NOT NULL,        -- FK users.id (nurse/doctor)
  recorded_at         TIMESTAMP NOT NULL,

  -- Temperature
  temperature         DECIMAL(5,1) NULL,      -- 102.4
  temperature_unit    CHAR(1) DEFAULT 'F',    -- 'F' or 'C'

  -- Blood Pressure
  blood_pressure_sys  SMALLINT NULL,          -- 120 (systolic)
  blood_pressure_dia  SMALLINT NULL,          -- 80  (diastolic)

  -- Other Core Vitals
  pulse_rate          SMALLINT NULL,          -- bpm
  respiratory_rate    SMALLINT NULL,          -- breaths/min
  oxygen_saturation   DECIMAL(4,1) NULL,      -- SpO2 %

  -- Body Measurements
  weight              DECIMAL(5,2) NULL,      -- kg
  height              DECIMAL(5,2) NULL,      -- cm
  bmi                 DECIMAL(5,2) NULL,      -- auto-calculated backend

  -- Blood Glucose
  blood_glucose       DECIMAL(6,1) NULL,      -- mg/dL
  glucose_type        ENUM('fasting','random','post_meal') NULL,

  created_at TIMESTAMP, updated_at TIMESTAMP,

  INDEX (patient_id, recorded_at),
  INDEX (opd_visit_id)
);
```

---

## 12. API Quick Reference Table

| # | Endpoint | Method | By | Purpose | Key Response |
|:--|:---------|:-------|:---|:--------|:-------------|
| 1 | /api/v1/abha/search | POST | Reception | ABHA search by mobile | ABHA[] |
| 2 | /api/v1/abha/generate-otp | POST | Reception | Send Login OTP | txnId |
| 3 | /api/v1/abha/verify-otp | POST | Reception | Verify Login OTP | accounts[] |
| 4 | /api/v1/abha/enrol/aadhaar-otp | POST | Reception | Send Aadhaar OTP | txnId |
| 5 | /api/v1/abha/enrol/verify-aadhaar | POST | Reception | Verify Aadhaar OTP | token (X-Token) |
| 6 | /api/v1/abha/enrol/mobile-otp | POST | Reception | Secondary Mobile OTP | txnId |
| 7 | /api/v1/abha/enrol/verify-mobile | POST | Reception | Verify Secondary OTP | success |
| 8 | /api/v1/abha/enrol/suggest-address | GET | Reception | ABHA address options | abhaAddressList[] |
| 9 | /api/v1/abha/enrol/create-address | POST | Reception | Finalize ABHA | abhaAddress |
| 10 | /api/v1/abha/profile | GET | Reception | Full profile (X-Token) | name, dob, gender |
| 11 | /api/v1/abha/card | GET | Reception | ABHA Card PDF | data (base64) |
| 12 | /api/v1/abha/qr-code | GET | Reception | ABHA QR Code | data (base64) |
| 13 | /api/v1/reception/register | POST | Reception | Save patient | patient.id |
| 14 | /api/v1/reception/departments | GET | Reception | Dept + Doctor list | departments[] |
| 15 | /api/v1/reception/visit | POST | Reception | OPD Slip Generate | queue_token |
| 16 | /api/v1/reception/scan-and-share/queues | GET | Reception | Webhook queue | queue[] |
| 17 | /api/v1/reception/scan-and-share/token | POST | Reception | Token search | patient, queue_id |
| 18 | /api/v1/reception/scan-and-share/confirm | POST | Reception | Confirm + OPD Slip | queue_token |
| 19 | /api/v1/visits/{id}/vitals | POST | **Nurse** | Record OPD vitals | vital.id, bmi |
| 20 | /api/v1/visits/{id}/vitals | GET | Nurse/Doctor | View visit vitals | vitals[] |
| 21 | /api/v1/patients/{id}/vitals | GET | Doctor | Full vitals history | vitals[] |
| 22 | /api/v1/opd/queue | GET | Doctor | Today's queue + vitals | visits[] |
| 23 | /api/v1/opd/visit/{id}/call | POST | Doctor | Call patient in | status: in_consultation |
| 24 | /api/v1/opd/visit/{id}/complete | POST | Doctor | Finish consultation | status: done |
| 25 | /api/v1/ipd/beds | GET | Reception | Available beds | beds[] |
| 26 | /api/v1/ipd/admissions | POST | Doctor | Admit patient | admission.id |
| 27 | /api/v1/ipd/{id}/vitals | POST | **Nurse** | Record IPD vitals | vital.id |
| 28 | /api/v1/ipd/{id}/vitals | GET | Doctor | IPD vitals timeline | vitals[] |
| 29 | /api/v1/ipd/{id}/discharge-summary | POST | Doctor | Write discharge note | success |
| 30 | /api/v1/ipd/{id}/discharge | POST | Doctor | Discharge patient | bed freed |
| 31 | /api/v1/invoices | POST | Admin | Generate final bill | invoice.id |

---

## 13. Frontend State Management Guide

### Mobile OTP — State Machine

```typescript
type RegistrationStep = 'method' | 'mobile' | 'otp' | 'form' | 'visit' | 'slip';

interface AbhaLoginState {
  step: RegistrationStep;
  mobile: string;
  txnId: string;
  accounts: AbhaAccount[];
  selectedAccount: AbhaAccount | null;
  patientId: number | null;
  visitData: OpdVisit | null;
}
// Transitions: method → mobile → otp → form (accounts[0] auto-fill) → visit → slip
```

### Aadhaar Enrolment — State Machine

```typescript
type EnrolStep =
  | 'consent' | 'aadhaar' | 'aadhaar-otp'
  | 'mobile'  | 'mobile-otp' | 'address'
  | 'success' | 'form' | 'visit' | 'slip';

interface AadhaarEnrolState {
  step: EnrolStep;
  txnId: string;
  xToken: string;       // from verify-aadhaar → use for /profile /card /qr-code
  abhaNumber: string;
  abhaAddress: string;
  patientId: number | null;
}
```

### Vitals Form — State (Nurse Panel)

```typescript
interface VitalsFormState {
  visitId: number;
  recorded_at: string;                // ISO datetime
  temperature: number | null;
  temperature_unit: 'F' | 'C';
  blood_pressure_sys: number | null;
  blood_pressure_dia: number | null;
  pulse_rate: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;                 // auto-computed on weight/height change
  blood_glucose: number | null;
  glucose_type: 'fasting' | 'random' | 'post_meal' | null;
}

// Frontend BMI preview:
const calcBmi = (wt: number, ht: number): number =>
  parseFloat((wt / Math.pow(ht / 100, 2)).toFixed(2));
```

### UI Rules:

```
LOCKED fields after ABHA verify:
  Name, DOB, Gender, ABHA Number, ABHA Address

EDITABLE:
  Mobile, Blood Group, Address, City, Pincode

OTP:  Resend after 60s  |  Max 2 retries  |  Max 3 wrong = ABDM lock
ABHA Address:  8-18 chars  |  alphanumeric + max 1 dot/underscore
Scan&Share Token:  30 min expiry  |  Countdown from 5 min  |  Expired = disable Confirm
Multiple ABHA:  accounts[].length > 1 → show selection modal

Vitals Color Coding:
  Green  = normal range
  Orange = borderline warning (inform doctor)
  Red    = critical (alert immediately)

BMI display: auto-calculate as user types weight/height
```

---

## 14. Edge Cases & Error Handling

### ABHA / Registration

| Error Code | Cause | Frontend Message | Action |
|:-----------|:------|:-----------------|:-------|
| ABDM-1220 | ABHA already exists | "ABHA pehle se bana hua hai" | Auto-skip address, show existing |
| ABDM-1094 | X-Token expired | "Session expire. Dobara shuru karein." | Restart Aadhaar flow |
| ABDM-1004 | OTP 3x wrong (locked) | "OTP lock. 30 min baad try karein." | Hide resend, timer |
| ABDM-1003 | OTP expired | "OTP expire. Resend karein." | Show Resend |
| 900900 | ABDM Gateway issue | (silent) | Backend retries silently |
| token_expired | Scan&Share >30 min | "Token expire. Dobara scan karwayein." | Disable Confirm |
| Multiple accounts | 1 mobile → 2+ ABHA | Show selection modal | User picks |
| Duplicate patient | Same ABHA in DB | "Patient pehle se registered." | Link existing |
| No doctor | Not available today | "Doctor aaj available nahi." | Show available only |
| Queue full | Daily limit reached | "Dr. XYZ ka quota full." | Suggest alternative |

### Vitals Validation

| Scenario | Frontend Behavior |
|:---------|:-----------------|
| Weight without height | Disable BMI, show "Height bhi daalo" |
| Temperature > 104F | Red alert + confirm popup "Kya sure hain?" |
| SpO2 < 90% | Immediate red alert "Critical SpO2! Doctor ko abhi bulao." |
| BP Systolic > 180 | Red alert "Hypertensive crisis risk. Alert doctor." |
| Duplicate vitals < 30 min | "Vitals recently entered. Phir bhi save karein?" |
| Visit already completed | Nurse vitals entry disable |

---

> **Last Updated:** 14 August 2026
> **Author:** HMS Development Team
>
> **Implementation Status:**
> - Phase 1 (Registration):    DONE
> - Phase 2 (OPD Slip):        DONE
> - Phase 3 (OPD Vitals):      DB + Model DONE — VitalController + Routes PENDING
> - Phase 4 (Consultation):    DONE
> - Phase 5 (IPD Admission):   PENDING
> - Phase 6 (IPD Vitals):      PENDING
> - Phase 7 (Discharge/Bill):  PENDING
>
> **Related Documents:**
> - 01_DATABASE_SCHEMA_PLAN.md
> - 02_BACKEND_API_PLAN.md
> - 05_ABDM_EDGE_CASES.md
> - 06_ABDM_M1_TEST_CASES_FROM_NHA.md
> - 07_BACKEND_ARCHITECTURE_STANDARDS.md
