# ABDM Compliant Hospital Management System (HMS)

A complete, enterprise-grade Hospital Management System with Ayushman Bharat Digital Mission (ABDM) M1/M2/M3 compliance, built with Laravel 12 (PHP 8.4), React 19 (TypeScript + Vite), PostgreSQL 16, Redis, and Podman/Docker.

---

## 🏗️ Tech Stack
- **Backend API:** Laravel 12 / PHP 8.4 (RESTful API, Spatie Multi-tenant RBAC, Clean Architecture)
- **Frontend UI:** React 19 + TypeScript + Vite + Tailwind/Vanilla CSS tokens
- **Database:** PostgreSQL 16 (Native partitioned catalog, JSONB support)
- **Cache & Queue:** Redis 7
- **WebSockets / Events:** Laravel Reverb / Redis PubSub
- **Database GUI:** Adminer (`http://localhost:8080`)
- **Container Runtime:** Podman (or Docker Compose)

---

## 🚀 Quick Setup Instructions

### 1. Start Containers
Ensure Podman Machine or Docker Desktop is running:
```bash
podman compose up -d --build
```
*(If using Docker, run `docker compose up -d --build` instead).*

---

### 2. Database Migration & Smart Seeding

To run all database migrations and seed all essential demo hospital modules, run:
```bash
podman exec hms_backend php artisan migrate:fresh --seed
```

#### 🛡️ Smart Seeder Tracker (`seeders_history`)
Our seeding architecture automatically tracks executed seeders in the `seeders_history` table:
- When you run `podman exec hms_backend php artisan db:seed`, previously executed seeders are **automatically skipped** (`[-] SKIP: ... (already seeded)`).
- When a developer creates a new seeder, running `php artisan db:seed` executes **only the newly added seeder**.
- Prevents unique constraint conflicts and protects existing tenant data.

#### 📦 What gets seeded out-of-the-box:
1. **Super Admin & Tenant:** Default hospital tenant (`City Care Multi-Speciality Hospital` - `HIP-DEMO-001`).
2. **Roles & Permissions:** Multi-tenant Spatie roles (`Hospital Admin`, `Doctor`, `Nurse`, `Pharmacist`, `Lab Technician`, `Receptionist`, `Cashier`, `Blood Bank Officer`, `Emergency Physician`).
3. **Doctors & Schedules:** Cardiology, Orthopedics, General Medicine specialists with weekly consultation slots.
4. **Wards & Beds:** General Ward, Semi-Private, Deluxe AC, and ICU wards with bed mapping.
5. **Billing Charges & Insurance TPAs:** 12+ billing services, Medi Assist, Vidal Health, Star Health TPAs, copay packages, and non-payable rules.
6. **Operation Theatres & Emergency Triage:** OT tables, PAC clearance, emergency triage color codes (Red, Yellow, Green), and MLC cases.
7. **Pathology Lab Master:** 281 standard test templates with 504 clinical parameters, units, and reference ranges.
8. **Blood Bank Master:** DGHS donor screening rules, voluntary donors, cold storage blood inventory (A+, B+, O+, AB+, O-), and quarantine tracking.
9. **Pharmacy Formulary:** Standard essential formulations, verified pharmaceutical distributors, and active stock inventory batches with rack locations.
10. **Demo Clinical Accounts & Patients:** 5 pre-admitted patients with verified UHIDs (`HOSP-2026-00001` to `00005`), active IPD admissions, and OPD consultation queues.

---

## 💊 Master Catalog Restoration (2 Lakh Medicines & 94,000 ICD-10 Codes)

For fast development and zero-latency migrations, the full national master catalog is decoupled from routine `db:seed`. If you ever run `migrate:fresh` or deploy to a new server, restore the full catalog using either of the following methods:

### ⚡ Method 1: Instant 3-Second SQL Restore (Recommended)
A pre-compiled SQL dump is stored at `backend/database/master_data_backup.sql` (42 MB). It uses native PostgreSQL `COPY` streaming to restore all records in **3 to 5 seconds**:

- **Windows PowerShell:**
  ```powershell
  Get-Content backend/database/master_data_backup.sql | podman exec -i hms_postgres psql -U hms_user -d hms_abdm
  ```

- **Linux / macOS / Git Bash:**
  ```bash
  podman exec -i hms_postgres psql -U hms_user -d hms_abdm < backend/database/master_data_backup.sql
  ```
  *(Replace `podman` with `docker` if using Docker).*

---

### 🌐 Method 2: Artisan Remote Import
To stream and import the latest open datasets directly from GitHub:
```bash
podman exec hms_backend php artisan hms:import-master-catalog
```
*Note: If running on the host machine without Docker/Podman wrapper, change directory first:*
```bash
cd backend
php artisan hms:import-master-catalog
```

---

## 👥 Demo User Credentials

All demo user accounts are pre-seeded with the password: **`password`**

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@hms.com` | `password` | Global System Superadmin |
| **Hospital Admin** | `admin@demo.com` | `password` | Hospital Tenant Admin |
| **Doctor / Consultant** | `doctor@demo.com` | `password` | OPD Queue, IPD Rounds, Prescriptions |
| **Emergency Physician** | `emergency@demo.com` | `password` | ER Triage, MLC Registry, Resuscitation |
| **Nursing Staff** | `nurse@demo.com` | `password` | Vitals, Bed Allocation, Medication Admin |
| **Pharmacist** | `pharmacy@demo.com` | `password` | Formulary, Dispense, Purchase, Batches |
| **Lab Technician** | `lab@demo.com` | `password` | Sample Collection, Test Results |
| **Blood Bank Officer** | `bloodbank@demo.com` | `password` | Donor Screening, Cross-matching, Storage |
| **Receptionist** | `reception@demo.com` | `password` | Patient Registration, ABHA Scan, OPD Token |
| **Billing & Cashier** | `billing@demo.com` | `password` | Invoices, Payments, TPA Pre-auth |

---

## 🖥️ Application Access Points
- **Frontend Web UI:** [http://localhost:5173](http://localhost:5173)
- **Backend API Base:** [http://localhost:8000/api](http://localhost:8000/api)
- **Adminer DB GUI:** [http://localhost:8080](http://localhost:8080)

### Adminer Database Login
- **System:** `PostgreSQL`
- **Server:** `postgres` *(use service name `postgres`, not `localhost`)*
- **Username:** `hms_user`
- **Password:** `hms_pass`
- **Database:** `hms_abdm`

---

## 🌉 ABDM Gateway & Bridge Setup Guide (M1 Scan & Share)

Linking your hospital software to the National Health Authority (NHA) ABDM Gateway.

### 🔑 Sandbox Credentials
- **Client ID (Bridge ID):** Stored in `.env` as `ABDM_CLIENT_ID`
- **Client Secret:** Stored in `.env` as `ABDM_CLIENT_SECRET`
- **Gateway Base URL:** `https://dev.abdm.gov.in`

### 🚀 1-Click Automated Setup & URL Update
Whenever your public domain or ngrok URL changes, run:

```bash
# Local Development (via ngrok)
podman exec -it hms_backend php artisan abdm:bridge-setup --url=https://your-subdomain.ngrok-free.app --hip-id=BRIDGE-TEST-HIP --hip-name="City Care Hospital"

# Production / Live Server
podman exec -it hms_backend php artisan abdm:bridge-setup --url=https://api.yourhospitaldomain.com --hip-id=BRIDGE-TEST-HIP --hip-name="City Care Hospital"
```

### 🛠️ Manual cURL Verification
```bash
# 1. Fetch Gateway Access Token
curl -X POST "https://dev.abdm.gov.in/gateway/v0.5/sessions" \
  -H "Content-Type: application/json" \
  -d '{"clientId": "<YOUR_ABDM_CLIENT_ID>", "clientSecret": "<YOUR_ABDM_CLIENT_SECRET>"}'

# 2. Update Bridge Webhook URL
curl -X PATCH "https://dev.abdm.gov.in/gateway/v1/bridges" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-CM-ID: sbx" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-public-url.com"}'

# 3. Verify Registered Services
curl -X GET "https://dev.abdm.gov.in/gateway/v1/bridges/getServices" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-CM-ID: sbx"
```

---

## 📁 Repository Structure
```
hospital/
├── backend/                  # Laravel 12 REST API
│   ├── app/
│   │   ├── Console/Commands/ # Artisan CLI tools (ImportMasterCatalog, BridgeSetup)
│   │   ├── Http/Controllers/ # Module API Controllers (OPD, IPD, BloodBank, etc.)
│   │   ├── Models/           # Eloquent Models
│   │   └── Services/         # Business Logic & ABDM Services
│   ├── database/
│   │   ├── data/             # Standalone master datasets (CSV)
│   │   ├── migrations/       # PostgreSQL schema migrations
│   │   ├── seeders/          # Modular seeders with seeders_history tracker
│   │   └── master_data_backup.sql # 42MB Instant master SQL snapshot
├── frontend/                 # React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── components/       # UI Components per module
│   │   ├── pages/            # View routes
│   │   └── services/         # Axios API clients
└── docker-compose.yml        # Podman & Docker orchestration
```