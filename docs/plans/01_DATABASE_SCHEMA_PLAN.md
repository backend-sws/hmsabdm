# Plan 01 — Database Schema (Complete Hospital Workflow)

> सभी tables, columns, relationships और indexes का detailed plan।
> Last Updated: 2026-08-04

---

## Current Problem (जो fix करना है)

> ⚠️ अभी सभी migrations में सिर्फ `id` और `timestamps` हैं — कोई actual columns नहीं!
> departments, doctors, opd_visits, counter_queues — सब empty tables हैं।

---

## Hospital का पूरा Workflow (Data Flow)

```
[Admin Panel]
    │
    ├── Departments बनाओ
    ├── Doctors बनाओ → Department assign, Schedule set
    └── Fee Types set करो (per doctor / per dept)
                                  │
[Reception Panel]                 │
    │                             │
    ├── Patient register (ABHA / Skip)
    ├── Department + Doctor select
    ├── OPD Visit create → Queue Token + Receipt (with fee)
    └── Payment collect → Invoice create
                                  │
[Doctor Panel]                    │
    ├── Queue देखो → Patient call
    ├── Vitals record करो (BP, Temp, Weight, etc.)
    ├── Prescription लिखो
    └── Visit complete
                                  │
[IPD — admit होना हो]              │
    └── Ward → Bed → Daily vitals → Discharge
```

---

## Table 1: hospitals ✅ (already exists)

```
hospitals
├── id
├── name              -- "City Hospital"
├── code              -- "CITY001"
├── address
├── phone
├── email
├── logo_path
├── abdm_hip_id       -- ABDM में register HIP ID
├── abdm_hiu_id       -- ABDM HIU ID (future)
├── is_active
└── timestamps
```

---

## Table 2: departments ❌ FIX NEEDED (currently only id + timestamps)

```
departments
├── id
├── hospital_id       -- FK → hospitals
├── name              -- "Cardiology", "General Medicine"
├── code              -- "CARD", "GEN" (unique per hospital)
├── description
├── is_active         -- default true
└── timestamps
```

---

## Table 3: doctors ❌ FIX NEEDED

```
doctors
├── id
├── hospital_id
├── department_id     -- FK → departments
├── user_id           -- FK → users (nullable — doctor ka login)
├── name              -- "Dr. Amit Sharma"
├── specialization    -- "Cardiologist"
├── qualification     -- "MBBS, MD"
├── phone
├── email
├── hpr_id            -- ABDM HPR ID (nullable)
├── consultation_time -- int minutes, default 15
├── is_active         -- default true
└── timestamps
```

> **Note:** Doctor ki fee अब `doctor_schedules` ya `appointment_types` table में रहेगी, यहाँ नहीं। क्योंकि अलग-अलग days पर अलग fee हो सकती है।

---

## Table 4: doctor_schedules ❌ NEW NEEDED

> Reception को बताता है — कौन doctor आज available है और उसकी OPD fee क्या है।

```
doctor_schedules
├── id
├── doctor_id         -- FK → doctors
├── day_of_week       -- 0=Sun, 1=Mon, ..., 6=Sat
├── start_time        -- "09:00:00"
├── end_time          -- "13:00:00"
├── max_patients      -- int, default 30
├── opd_fee           -- decimal(8,2) — उस दिन की OPD consultation fee
├── is_active         -- boolean
└── timestamps
```

**Reception Logic:**
```php
// Aaj ke din ke available doctors + unki fee:
$today = now()->dayOfWeek;
$doctors = Doctor::with(['schedules' => fn($q) => $q->where('day_of_week', $today)->where('is_active', true)])
    ->whereHas('schedules', fn($q) => $q->where('day_of_week', $today)->where('is_active', true))
    ->where('hospital_id', $hospitalId)->where('is_active', true)->get();
```

---

## Table 5: appointment_types ❌ NEW NEEDED

> हर hospital में अलग-अलग appointment types होते हैं।
> जैसे: "New Patient", "Follow-up", "Emergency", "Procedure", etc.
> हर type की अलग fee होती है।

```
appointment_types
├── id
├── hospital_id
├── name              -- "New Patient Consultation", "Follow-up", "Emergency"
├── code              -- "NEW", "FU", "EMER"
├── base_fee          -- decimal(8,2) — base charge
├── description
├── is_active
└── timestamps
```

**Example Data:**
| name | code | base_fee |
|---|---|---|
| New Patient | NEW | 200.00 |
| Follow-up | FU | 100.00 |
| Emergency | EMER | 500.00 |
| Procedure | PROC | 0.00 (procedure charges alag) |

> Final fee = `doctor_schedule.opd_fee` (doctor-specific) + any extra charges
> Ya = `appointment_type.base_fee` (hospital default)
> Reception decide karta hai — which to use

---

## Table 6: patients ⚠️ PARTIAL FIX NEEDED

```
patients
├── id
├── hospital_id
├── name              -- required
├── mobile            -- nullable, 10 digits (rename from "phone")
├── email             -- nullable
├── dob               -- date, nullable
├── gender            -- enum: M/F/O, nullable
├── blood_group       -- nullable (A+, B+, O+, AB+, etc.)
├── address           -- text, nullable
├── city              -- nullable
├── pincode           -- nullable
├── abha_number       -- string, NULLABLE, unique (91-xxxx-xxxx-xxxx)
├── abha_address      -- string, nullable (patient@sbx)
├── profile_photo     -- nullable (storage path)
└── timestamps
```

**Current Issues to Fix:**
- `phone` → rename to `mobile`, make nullable
- `abha_number` → make nullable (patients bina ABHA ke bhi aa sakte hain)
- Add: `dob`, `gender`, `blood_group`, `address`, `city`, `pincode`, `abha_address`

---

## Table 7: counter_queues ❌ FIX NEEDED

> Scan & Share webhook का data यहाँ hold होता है।

```
counter_queues
├── id
├── hospital_id
├── patient_id        -- FK → patients
├── link_token        -- string, UNIQUE (ABDM token "482")
├── counter_code      -- nullable (ABDM hipCode)
├── status            -- enum: waiting_confirmation | confirmed | expired
├── expires_at        -- timestamp (webhook aane ke 15 min baad expire)
└── timestamps
```

---

## Table 8: opd_visits ❌ FIX NEEDED (MAIN TABLE)

```
opd_visits
├── id
├── hospital_id
├── patient_id        -- FK → patients
├── doctor_id         -- FK → doctors
├── department_id     -- FK → departments
├── appointment_type_id -- FK → appointment_types (nullable)
│
├── visit_date        -- date
├── queue_token       -- unsigned int (aaj ka number per doctor: 1, 2, 3...)
├── status            -- enum: waiting | called | in_consultation | done | cancelled
│
├── chief_complaint   -- text, nullable (reception note karein)
├── diagnosis         -- text, nullable (doctor bharein)
├── notes             -- text, nullable (doctor ka internal note)
│
├── fee_charged       -- decimal(8,2) — actual fee collected
├── payment_status    -- enum: pending | paid | waived
├── payment_method    -- enum: cash | card | upi | insurance | nullable
├── payment_ref       -- nullable (UPI txn ID, card last 4, etc.)
│
├── called_at         -- timestamp, nullable (doctor ne call kiya)
├── started_at        -- timestamp, nullable (consultation start)
├── completed_at      -- timestamp, nullable (visit end)
│
└── timestamps
```

> **Queue Token Logic:** Per doctor per day. Agar Dr. Amit ke 13 patients aaye aaj, toh next = 14.
> NOT per department — because ek doctor ek hi hai, multiple patients can see different doctors in same dept.

---

## Table 9: vitals ❌ NEW NEEDED (IMPORTANT)

> Har visit pe vitals record hote hain. Doctor ya nurse dono record kar sakte hain.
> Multiple vitals ek visit pe ho sakte hain (morning-evening dono, ya revisit pe)

```
vitals
├── id
├── opd_visit_id      -- FK → opd_visits (nullable — IPD ke liye bhi use hoga)
├── patient_id        -- FK → patients (direct link for quick fetch)
├── hospital_id
├── recorded_by       -- FK → users (nurse/doctor who recorded)
├── recorded_at       -- timestamp
│
├── temperature       -- decimal(4,1), nullable  -- 98.6 °F ya 37.0 °C
├── temperature_unit  -- enum: C/F, default F
├── blood_pressure_sys-- smallint, nullable       -- systolic (120)
├── blood_pressure_dia-- smallint, nullable       -- diastolic (80)
├── pulse_rate        -- smallint, nullable       -- beats per minute
├── respiratory_rate  -- smallint, nullable       -- breaths per minute
├── oxygen_saturation -- decimal(4,1), nullable   -- SpO2 % (98.5)
├── weight            -- decimal(5,2), nullable   -- kg
├── height            -- decimal(5,2), nullable   -- cm
├── bmi               -- decimal(4,2), nullable   -- calculated
├── blood_glucose     -- decimal(5,1), nullable   -- mg/dL
├── glucose_type      -- enum: fasting/random/post_meal, nullable
│
└── timestamps (created_at = recorded_at effectively)
```

**Display format:**
```
BP: 120/80 mmHg  |  Pulse: 72 bpm  |  Temp: 98.6°F
Weight: 70 kg  |  SpO2: 98%  |  BSL: 110 mg/dL (fasting)
```

---

## Table 10: invoices ❌ UPDATE NEEDED

```
invoices
├── id
├── hospital_id
├── patient_id         -- FK → patients
├── opd_visit_id       -- FK → opd_visits, nullable
│
├── invoice_number     -- "INV-2026-00001" (unique, auto-generated)
├── invoice_date       -- date
│
├── subtotal           -- decimal(10,2)
├── discount           -- decimal(10,2), default 0
├── tax                -- decimal(10,2), default 0
├── total              -- decimal(10,2)
│
├── payment_status     -- enum: pending | partial | paid | refunded
├── paid_amount        -- decimal(10,2), default 0
│
└── timestamps
```

---

## Table 11: invoice_items ❌ NEW NEEDED

> Invoice break-down — consultation, procedures, medicines, etc.

```
invoice_items
├── id
├── invoice_id         -- FK → invoices
├── description        -- "OPD Consultation — Dr. Amit Sharma"
├── item_type          -- enum: consultation | procedure | medicine | lab | other
├── quantity           -- int, default 1
├── unit_price         -- decimal(8,2)
├── amount             -- decimal(10,2) = quantity * unit_price
└── timestamps
```

---

## Complete Relationship Map

```
Hospital
 ├── hasMany Users
 ├── hasMany Departments
 │     └── hasMany Doctors
 │           ├── hasMany DoctorSchedules (with opd_fee)
 │           └── hasMany OpdVisits
 ├── hasMany AppointmentTypes
 ├── hasMany Patients
 │     ├── hasMany CounterQueues      ← Scan & Share tokens
 │     ├── hasMany OpdVisits
 │     │     ├── hasMany Vitals       ← Har visit ke vitals
 │     │     └── hasOne Invoice
 │     │           └── hasMany InvoiceItems
 │     └── hasMany Vitals (direct)
 └── hasMany OpdVisits
```

---

## Migration Fix Action Plan

### Step A: Update existing empty migrations (in this order)
| File | Add Columns |
|---|---|
| `create_departments_table` | hospital_id, name, code, is_active |
| `create_doctors_table` | hospital_id, department_id, user_id, name, specialization, qualification, phone, email, hpr_id, consultation_time, is_active |
| `create_counter_queues_table` | hospital_id, patient_id, link_token, counter_code, status, expires_at |
| `create_opd_visits_table` | hospital_id, patient_id, doctor_id, department_id, appointment_type_id, visit_date, queue_token, status, chief_complaint, diagnosis, notes, fee_charged, payment_status, payment_method, payment_ref, called_at, started_at, completed_at |
| `create_vitals_table` | opd_visit_id, patient_id, hospital_id, recorded_by, recorded_at, temperature, temperature_unit, blood_pressure_sys, blood_pressure_dia, pulse_rate, respiratory_rate, oxygen_saturation, weight, height, bmi, blood_glucose, glucose_type |
| `create_invoices_table` | hospital_id, patient_id, opd_visit_id, invoice_number, invoice_date, subtotal, discount, tax, total, payment_status, paid_amount |

### Step B: New migrations needed
| Migration | Purpose |
|---|---|
| `create_doctor_schedules_table` | Doctor OPD days + fee |
| `create_appointment_types_table` | New/Follow-up/Emergency fees |
| `create_invoice_items_table` | Invoice line items |
| `update_patients_table_v2` | Fix phone→mobile, add dob/gender/blood_group/address/abha_address |

### Step C: Seeders
| Seeder | Data |
|---|---|
| `AppointmentTypeSeeder` | New Patient ₹200, Follow-up ₹100, Emergency ₹500 |
| `DepartmentSeeder` | Cardiology, Ortho, General, Pediatrics, ENT, Gynecology |
| `DoctorSeeder` | 2-3 doctors per dept with Mon-Wed-Fri schedule |
| `UserSeeder` | 1 admin + 1 reception + 1 doctor user |

---

## Performance Indexes

```sql
-- OPD queue lookup (most frequent query):
INDEX on opd_visits(doctor_id, visit_date, queue_token)
INDEX on opd_visits(visit_date, department_id, status)

-- Counter queue token lookup:
UNIQUE INDEX on counter_queues(link_token)
INDEX on counter_queues(status, expires_at)

-- Patient search:
INDEX on patients(mobile)
INDEX on patients(abha_number)
INDEX on patients(hospital_id, name)

-- Vitals history:
INDEX on vitals(patient_id, recorded_at)
INDEX on vitals(opd_visit_id)
```
