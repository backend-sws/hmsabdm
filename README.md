# ABDM Compliant Hospital Management System (HMS)

This project is a comprehensive Hospital Management System with ABDM compliance hooks, built using Laravel 13, React 19, PostgreSQL, Redis, and Podman/Docker.

## Tech Stack
- **Backend:** Laravel 13 (API), PHP 8.4
- **Frontend:** React 19 + Vite (TypeScript)
- **Database:** PostgreSQL 16
- **Cache/Queue:** Redis
- **WebSockets:** Laravel Reverb
- **Database GUI:** Adminer

## Setup Instructions

### 1. Start Containers
Make sure Podman Machine (or Docker Desktop) is running.
```bash
podman compose up -d --build
```
*Note: This will spin up postgres, redis, backend, nginx, adminer, and frontend services. (If using Docker, just use `docker-compose` instead).*

### 2. Backend Setup
Since the containers are running, execute the following to setup the database and seeders:
```bash
podman compose exec backend php artisan migrate:fresh --seed
```
This runs the `RolesAndPermissionsSeeder` which populates the system with necessary roles.

### 3. Frontend Setup
The frontend is already configured to automatically install packages and start a dev server via Podman. If you ever wish to run it locally without Podman:
```bash
cd frontend
npm install
npm run dev
```

### 4. Accessing the Application
- **Frontend UI:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000/api`
- **Adminer DB GUI:** `http://localhost:8080`

## Adminer (Database Login Details)
To view the database directly in your browser, go to `http://localhost:8080` and enter the following details:
- **System:** `PostgreSQL`
- **Server:** `postgres` *(do not use localhost, use the exact word 'postgres')*
- **Username:** `hms_user`
- **Password:** `hms_pass`
- **Database:** `hms_abdm`

## Test Credentials (Seeded by default)
Login at the frontend using these role-based credentials:
- **Super Admin:** `superadmin@hms.com` / `password`
- **Doctor:** `doctor@hms.com` / `password`
- **Receptionist:** `reception@hms.com` / `password`
- **Nurse:** `nurse@hms.com` / `password`
- **Pharmacy:** `pharmacy@hms.com` / `password`
- **Lab:** `lab@hms.com` / `password`

## Environment Configuration
The `.env` file in the backend comes pre-configured with:
```env
ABDM_MOCK_MODE=true
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=hms_abdm
DB_USERNAME=hms_user
DB_PASSWORD=hms_pass
```

## Architecture Notes
- All API responses follow a uniform `{ success, message, data }` structure via `ApiResponseTrait`.
- Roles are enforced via Spatie `permission:xyz` middleware on the routes.
- The project includes scaffolded Models, Migrations, and Controllers for OPD, IPD, Pharmacy, Lab, Blood Bank, Vitals, and Billing modules.
- Hooks for ABDM M2/M3 (like `ClinicalRecordCreated` event and `LinkCareContext` listener) have been created and are ready for FHIR bundle integrations.

---

## 🌉 ABDM Gateway & Bridge Setup Guide (M1 Scan & Share)

NHA (National Health Authority) Bridge ID aur credentials ke sath apne hospital software ko ABDM Gateway se link karne aur URL update karne ka complete guide.

### 🔑 Sandbox Credentials
- **Client ID (Bridge ID):** Stored in `.env` as `ABDM_CLIENT_ID`
- **Client Secret:** Stored in `.env` as `ABDM_CLIENT_SECRET` (Keep confidential)
- **Gateway Base URL:** `https://dev.abdm.gov.in`

---

### 🚀 1. Automated Setup & URL Update (1-Click Command)

Jab bhi aapka **domain ya ngrok URL change ho**, toh bas yeh command run karein:

#### Local Development (via ngrok):
```bash
podman exec -it hms_backend php artisan abdm:bridge-setup --url=https://your-subdomain.ngrok-free.app --hip-id=BRIDGE-TEST-HIP --hip-name="City Care Hospital"
```

#### Production / Live Server:
```bash
podman exec -it hms_backend php artisan abdm:bridge-setup --url=https://api.yourhospitaldomain.com --hip-id=BRIDGE-TEST-HIP --hip-name="City Care Hospital"
```

---

### 🛠️ 2. Manual cURL Execution (Step-by-Step)

Agar aap manually Terminal ya Postman se execute karna chahte hain:

#### Step 1: ABDM Gateway se Access Token lena
```bash
curl -X POST "https://dev.abdm.gov.in/gateway/v0.5/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "<YOUR_ABDM_CLIENT_ID>",
    "clientSecret": "<YOUR_ABDM_CLIENT_SECRET>"
  }'
```

#### Step 2: Bridge URL Update karna (Aapka Naya Domain/URL)
```bash
curl -X PATCH "https://dev.abdm.gov.in/gateway/v1/bridges" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-CM-ID: sbx" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-public-url.com"
  }'
```

#### Step 3: HIP Service Add/Update karna
```bash
curl -X POST "https://dev.abdm.gov.in/gateway/v1/bridges/addUpdateServices" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-CM-ID: sbx" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": "<HOSPITAL_ABDM_HIP_ID>",
      "name": "<HOSPITAL_NAME>",
      "type": "HIP",
      "active": true,
      "alias": ["<HOSPITAL_CODE>"],
      "endpoints": [
        {
          "address": "https://your-public-url.com/api/webhook/abdm/v1/scan-and-share",
          "connectionType": "https",
          "use": "registration"
        }
      ]
    }
  ]'
```

#### Step 4: Registered Services Verify karna
```bash
curl -X GET "https://dev.abdm.gov.in/gateway/v1/bridges/getServices" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-CM-ID: sbx"
```