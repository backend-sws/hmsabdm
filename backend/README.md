# HMS ABDM Backend API (Laravel 12)

This directory contains the REST API server for the ABDM-Compliant Hospital Management System.

---

## 🚀 Key Commands

### Database Migrations & Seeding
```bash
# Inside container:
php artisan migrate:fresh --seed

# From host (Podman):
podman exec hms_backend php artisan migrate:fresh --seed
```

### Seeding Incremental Updates
The system uses `seeders_history` to prevent duplicate seeding. To run newly added seeders:
```bash
podman exec hms_backend php artisan db:seed
```

### Restoring Master Catalog (200k Medicines & 94k ICD-10 Codes)
#### Method 1: Instant SQL Restore (3-5 seconds)
```bash
# Windows PowerShell
Get-Content database/master_data_backup.sql | podman exec -i hms_postgres psql -U hms_user -d hms_abdm

# Linux / Mac / Git Bash
podman exec -i hms_postgres psql -U hms_user -d hms_abdm < database/master_data_backup.sql
```

#### Method 2: Remote Streaming Import
```bash
podman exec hms_backend php artisan hms:import-master-catalog
```

---

## 🧪 Testing
```bash
# Run PHPUnit / Pest tests
podman exec hms_backend php artisan test
```

---

## 👥 Demo User Accounts (Password: `password`)
- **Super Admin:** `superadmin@hms.com`
- **Hospital Admin:** `admin@demo.com`
- **Doctor:** `doctor@demo.com`
- **Nurse:** `nurse@demo.com`
- **Pharmacy:** `pharmacy@demo.com`
- **Lab Technician:** `lab@demo.com`
- **Reception:** `reception@demo.com`
- **Billing / Cashier:** `billing@demo.com`
