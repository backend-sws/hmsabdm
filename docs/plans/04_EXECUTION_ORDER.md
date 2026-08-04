# Plan 04 — Execution Order (Step-by-Step)

> यह file बताती है कि किस order में code लिखना है।
> हर step complete होने के बाद ✅ mark करो।

---

## Step 1: Database Fix (सबसे पहले — बाकी सब इस पर depend करता है)

### 1A: Migrations Update करो (existing empty migrations fix)

**Order matters** — FK constraints के कारण इसी order में करो:

- [ ] `create_departments_table` — add: `hospital_id`, `name`, `code`, `description`, `is_active`
- [ ] `create_doctors_table` — add: `hospital_id`, `department_id`, `name`, `specialization`, `qualification`, `phone`, `email`, `hpr_id`, `opd_fee`, `consultation_time`, `is_active`
- [ ] `create_counter_queues_table` — add: `hospital_id`, `patient_id`, `link_token`, `counter_code`, `status`, `expires_at`
- [ ] `create_opd_visits_table` — add: `hospital_id`, `patient_id`, `doctor_id`, `department_id`, `visit_date`, `queue_token`, `status`, `chief_complaint`, `notes`, `visited_at`

### 1B: New Migrations

- [ ] `create_doctor_schedules_table` — `doctor_id`, `day_of_week`, `start_time`, `end_time`, `max_patients`, `is_active`
- [ ] Update patients migration — fix: `phone` nullable, `abha_number` nullable, add: `mobile`, `dob`, `gender`, `blood_group`, `address`, `abha_address`

### 1C: Seeders

- [ ] `DepartmentSeeder` — 6 departments with codes
- [ ] `DoctorSeeder` — 2-3 doctors per dept with schedules
- [ ] `UserSeeder` — admin + reception user
- [ ] Run: `php artisan migrate:fresh --seed`

**Verify:** Adminer खोलो (http://localhost:8080) और tables check करो

---

## Step 2: Models Update

- [x] `Patient.php` — fillable update, relationships add
- [x] `Doctor.php` — fillable, relationships (department, schedules, opdVisits)
- [x] `Department.php` — fillable, relationships (doctors, hospital)
- [x] `CounterQueue.php` — fillable, relationships (patient), casts (expires_at)
- [x] `OpdVisit.php` — fillable, relationships (patient, doctor, department), casts
- [x] `DoctorSchedule.php` — NEW model, fillable, relationships

---

## Step 3: ABDM Service (Backend Core)

- [ ] `config/services.php` — abdm block add
- [ ] `.env` / `.env.example` — ABDM variables
- [ ] `RealAbdmService.php` — gateway token + all methods
- [ ] `ServiceBindingProvider.php` — ABDM binding add (mock/real switch)
- [ ] **Test:** Mock mode on, `generateOtp` method call करो

---

## Step 4: Webhook Controller

- [x] `AbdmWebhookController.php` — `handleShareProfile` method
- [x] `routes/api.php` — public webhook route add
- [x] **Test:** Postman से POST `/api/v1/abdm/callback/share-profile` with sample payload
  - Database में patient + counter_queue बनना चाहिए
  - Same request twice → same records (idempotent)

---

## Step 5: Department + Doctor Controllers

- [x] `DepartmentService` + Interface
- [x] `DepartmentController` — full CRUD + `/doctors` nested route
- [x] `DoctorService` + Interface
- [x] `DoctorController` — full CRUD + schedule management + `available-today`
- [x] Resources: `DepartmentResource`, `DoctorResource`
- [x] `routes/api.php` — dept + doctor routes add
- [x] `ServiceBindingProvider` — new bindings
- [ ] **Test:** 
  - GET `/api/v1/departments` — list आए
  - GET `/api/v1/doctors/available-today` — aaj ke schedule wale doctors आएं

---

## Step 6: Reception Controller (M1 Core)

- [x] `ReceptionService` + Interface
- [x] `ReceptionController` — सभी 5 endpoints
  - `findByToken`
  - `generateOtp`
  - `verifyOtp`
  - `registerWithoutAbha`
  - `createVisit`
  - `getDepartmentsWithDoctors`
- [x] Form Requests (validation)
- [x] `routes/api.php` — reception routes
- [ ] **Test (Full Flow A):**
  1. Postman से webhook POST → counter_queue में entry
  2. POST `/reception/find-by-token` with `{"token": "482"}` → patient + departments आएं
  3. POST `/reception/create-visit` → queue_token generate हो
- [ ] **Test (Full Flow B — Mock):**
  1. POST `/reception/generate-otp` with mobile → txnId मिले
  2. POST `/reception/verify-otp` with OTP `123456` → patient बने
  3. POST `/reception/create-visit` → queue_token
- [ ] **Test (Full Flow C):**
  1. POST `/reception/register-without-abha` → patient बने
  2. POST `/reception/create-visit` → token

---

## Step 7: Frontend Setup

- [ ] Tailwind v4 verify (already fixed — `@import "tailwindcss"`)
- [ ] `src/api/client.js` — axios base + Bearer token interceptor + 401 handler
- [ ] `src/api/auth.js`, `reception.js`, `departments.js`, `doctors.js`
- [ ] `src/store/authStore.js` — Context API with login/logout
- [ ] `src/components/layout/ProtectedRoute.jsx`
- [ ] `src/components/layout/Sidebar.jsx` + `Header.jsx`

---

## Step 8: Frontend Pages — Login + Dashboard

- [ ] `LoginPage.jsx` — form + API call + token save
- [ ] `DashboardPage.jsx` — basic stats (patients today, queue count)
- [ ] `App.tsx` — routes setup
- [ ] **Test:** Login → Dashboard दिखे → logout काम करे

---

## Step 9: Frontend — Reception Page (M1 CORE)

- [ ] `components/reception/FlowSelector.jsx`
- [ ] `components/reception/TokenFlow.jsx`
- [ ] `components/reception/NewAbhaFlow.jsx` (with OTP timer/resend)
- [ ] `components/reception/SkipFlow.jsx`
- [ ] `components/reception/DeptDoctorPicker.jsx` (cascading dropdowns)
- [ ] `components/reception/ReceiptCard.jsx` (with print button)
- [ ] `pages/ReceptionPage.jsx` — state machine wiring
- [ ] **Test (End-to-End):**
  1. Postman से webhook simulate
  2. Browser में Reception page open करो
  3. Token "482" type करो → patient दिखे
  4. Dept + Doctor select करो
  5. Token generate हो → Receipt print करो

---

## Step 10: Frontend — Admin Pages (Dept + Doctor)

- [ ] `pages/DepartmentsPage.jsx` — list + add/edit modal
- [ ] `pages/DoctorsPage.jsx` — list + add modal + schedule modal
- [ ] **Test:** Doctor बनाओ, schedule assign करो, Reception page पर वो doctor दिखे

---

## Step 11: OPD Queue (Doctor Panel)

- [x] `OpdController.php` (backend)
- [ ] `pages/OpdQueuePage.jsx` (frontend)
- [x] **Test:** Visit create करो → queue में दिखे → "Call" → "Done" करो

---

## Step 12: Edge Cases + Polish

- [ ] OTP resend timer (countdown 3 min)
- [ ] Token expired handling
- [ ] Duplicate webhook graceful handling
- [ ] 401 auto-retry (RealAbdmService)
- [ ] `counter_queues.expires_at` check in findByToken
- [ ] Loading states everywhere
- [ ] Error messages user-friendly

---

## Step 13: ngrok + Full E2E Test

- [ ] ngrok setup
- [ ] Webhook URL in ABDM sandbox
- [ ] Real OPD flow test

---

## Quick Reference — Priority Order

```
1. DB Migrations Fix     ← सबसे पहले (foundation)
2. Models Update         ← DB ke baad
3. ABDM Service Core     ← RealAbdmService
4. Webhook Receiver      ← Flow A backend
5. Dept/Doctor CRUD      ← Admin APIs
6. Reception Controller  ← M1 core backend
7. Frontend Setup        ← axios + auth
8. Login Page            ← authentication
9. Reception Page        ← M1 core frontend
10. Admin Pages           ← dept + doctor management
11. OPD Queue             ← doctor panel
12. Edge Cases            ← polish
13. E2E Testing           ← final verify
```

---

## Common Commands Reference

```bash
# Container ke andar jana:
podman exec -it hms_backend bash

# Migrations:
php artisan migrate
php artisan migrate:fresh --seed
php artisan migrate:status

# New files banana:
php artisan make:model DoctorSchedule -m
php artisan make:controller Api/V1/DepartmentController
php artisan make:service Department/DepartmentService
php artisan make:request StoreDepartmentRequest
php artisan make:resource DepartmentResource

# Routes check:
php artisan route:list | grep reception

# Logs dekho:
tail -f storage/logs/laravel.log
```
