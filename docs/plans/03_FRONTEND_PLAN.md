# Plan 03 — Frontend (React + Vite + Tailwind v4)

> Reception Panel, Admin Panel, और Doctor Panel का complete React architecture।

---

## Overall App Structure

```
frontend/src/
├── api/                    # Axios API calls (ek file per module)
│   ├── auth.js
│   ├── departments.js
│   ├── doctors.js
│   ├── reception.js        # M1 core
│   └── opd.js
│
├── store/                  # Global state (Context API ya Zustand)
│   ├── authStore.js        # Login user + token
│   └── receptionStore.js   # Current patient session
│
├── hooks/                  # Custom hooks
│   ├── useAuth.js
│   ├── useDepartments.js
│   └── useDoctors.js
│
├── components/             # Reusable components
│   ├── ui/                 # Generic UI
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Badge.jsx
│   │   ├── Card.jsx
│   │   └── Spinner.jsx
│   │
│   ├── layout/             # App shell
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   └── ProtectedRoute.jsx
│   │
│   └── reception/          # Reception-specific components
│       ├── FlowSelector.jsx
│       ├── TokenFlow.jsx
│       ├── NewAbhaFlow.jsx
│       ├── SkipFlow.jsx
│       ├── DeptDoctorPicker.jsx
│       └── ReceiptCard.jsx
│
└── pages/                  # Route-level pages
    ├── LoginPage.jsx
    ├── DashboardPage.jsx
    ├── ReceptionPage.jsx   # M1 Core
    ├── DepartmentsPage.jsx
    ├── DoctorsPage.jsx
    └── OpdQueuePage.jsx
```

---

## Page 1: LoginPage

```
+------------------------------------------+
|           🏥 Hospital Name               |
|                                          |
|     Email:  [_________________________]  |
|     Password:[_______________________]  |
|                                          |
|           [      Login      ]            |
+------------------------------------------+
```

**State:** email, password, loading, error  
**API:** `POST /api/v1/login`  
**On Success:** Token localStorage में save, `/dashboard` redirect

---

## Page 2: ReceptionPage (M1 CORE)

### State Machine:
```
"choose"
    ├──► "token"      → patient found → "dept-doctor" → "receipt"
    ├──► "new-abha"   → otp sent → otp verified → "dept-doctor" → "receipt"
    └──► "skip"       → registered → "dept-doctor" → "receipt"
```

### Screen: choose (initial)
```
+--------------------------------------------------+
|  🏥  Reception — Patient Registration             |
+--------------------------------------------------+
|                                                  |
|  Patient ke paas kya hai?                        |
|                                                  |
|  +----------------+  +------------------+        |
|  | 📱 ABHA App ka |  | 🆕 Naya ABHA     |        |
|  |   Token        |  |    Banao         |        |
|  | (Scan & Share) |  | (Mobile OTP)     |        |
|  +----------------+  +------------------+        |
|                                                  |
|  +---------------------------------------+       |
|  | ⏭️  Skip — Bina ABHA Register Karo    |       |
|  +---------------------------------------+       |
+--------------------------------------------------+
```

### Screen: token (Flow A)
```
+--------------------------------------------------+
|  ← Back    Patient Ka Token Enter Karo           |
+--------------------------------------------------+
|                                                  |
|  Patient ne ABHA app mein jo number dekha:       |
|                                                  |
|  Token:  [   4  8  2   ]                         |
|                                                  |
|          [ Fetch Patient ]                        |
|                                                  |
|  ❌ Token expire ho gaya. Dobara scan karwayein  |
+--------------------------------------------------+
```

### Screen: new-abha (Flow B)
```
+--------------------------------------------------+
|  ← Back    Naya ABHA — Mobile OTP                |
+--------------------------------------------------+
|                                                  |
|  Mobile:  [ 98765-43210 ]  [ OTP Bhejo ]        |
|                                                  |
|  ─── OTP aane ke baad ───                        |
|                                                  |
|  OTP: [ 1 2 3 4 5 6 ]   [Resend (2:30)]         |
|                                                  |
|  [ Verify & ABHA Banao ]                         |
|                                                  |
|  ✅ Mock mode: OTP = 123456                      |
+--------------------------------------------------+
```

### Screen: dept-doctor (after patient found)
```
+--------------------------------------------------+
|  ✅ Patient Found                                 |
+--------------------------------------------------+
|  Name:  Rajesh Kumar                             |
|  ABHA:  91-1234-5678-9012                        |
|  Gender: Male  |  DOB: 1985                      |
+--------------------------------------------------+
|                                                  |
|  Department:  [ ▼ Select Department      ]       |
|                   Cardiology (3 doctors)         |
|                   Orthopedics (2 doctors)         |
|                   General Medicine (4 doctors)   |
|                                                  |
|  Doctor:     [ ▼ Select Doctor           ]       |
|                   Dr. Amit Sharma — ₹500         |
|                   Queue: 12 patients             |
|                   Dr. Priya Verma — ₹400         |
|                   Queue: 7 patients              |
|                                                  |
|  Chief Complaint (optional):                     |
|  [___________________________________________]   |
|                                                  |
|  [ Generate Token & Print Receipt ]              |
+--------------------------------------------------+
```

### Screen: receipt (Final)
```
+--------------------------------------------------+
|  🏥 CITY HOSPITAL                                |
|  OPD Receipt                    04-08-2026       |
+--------------------------------------------------+
|                                                  |
|  Queue Token:    ╔═══╗                           |
|                  ║ 13║                           |
|                  ╚═══╝                           |
|                                                  |
|  Patient:    Rajesh Kumar                        |
|  ABHA No:    91-1234-5678-9012                   |
|  Department: Cardiology                          |
|  Doctor:     Dr. Amit Sharma                     |
|  OPD Fee:    ₹ 500                               |
|  Est. Wait:  ~3 hours 15 mins                    |
|                                                  |
|  [ 🖨️ Print ]       [ ➡️ Next Patient ]           |
+--------------------------------------------------+
```

---

## Page 3: DepartmentsPage (Admin)

```
+--------------------------------------------------+
|  Departments                    [ + Add New ]    |
+--------------------------------------------------+
|  🔍 Search departments...                        |
+--------------------------------------------------+
|  ● Cardiology          3 doctors   [ Edit ]      |
|  ● Orthopedics         2 doctors   [ Edit ]      |
|  ● General Medicine    4 doctors   [ Edit ]      |
|  ○ Pediatrics          0 doctors   [ Edit ]      |
+--------------------------------------------------+

[Modal — Add/Edit Department]
+----------------------------------+
|  Department Name: [____________] |
|  Code:            [CARD       ]  |
|  Description:     [____________] |
|  Active:          [✓]            |
|           [Cancel]  [Save]       |
+----------------------------------+
```

---

## Page 4: DoctorsPage (Admin)

```
+--------------------------------------------------+
|  Doctors                         [ + Add Doctor] |
+--------------------------------------------------+
|  Filter: [ All Depts ▼ ]  🔍 Search...           |
+--------------------------------------------------+
|  Dr. Amit Sharma                                 |
|  Cardiologist | Cardiology                       |
|  OPD: Mon, Wed, Fri  |  Fee: ₹500               |
|  Available Today: ✅  |  Queue: 12               |
|  [ Edit ] [ Schedule ] [ Deactivate ]            |
+--------------------------------------------------+
|  Dr. Priya Verma                                 |
|  Orthopedic Surgeon | Orthopedics                |
|  OPD: Tue, Thu, Sat  |  Fee: ₹600               |
|  Available Today: ❌  |  Queue: 0                |
+--------------------------------------------------+

[Modal — Add/Edit Doctor]
+----------------------------------+
|  Name:           [Dr. ________]  |
|  Department:     [ ▼ Select  ]   |
|  Specialization: [__________]    |
|  Qualification:  [__________]    |
|  Phone:          [__________]    |
|  Email:          [__________]    |
|  HPR ID:         [__________]    |
|  OPD Fee:        [₹ ________]    |
|  Consult Time:   [15] mins       |
|  [ Cancel ]  [ Save ]            |
+----------------------------------+

[Modal — Doctor Schedule]
+----------------------------------+
|  Schedule for Dr. Amit Sharma    |
|  ─────────────────────────────   |
|  ☐ Sunday                        |
|  ☑ Monday   09:00 - 13:00  [30]  |
|  ☐ Tuesday                       |
|  ☑ Wednesday 09:00 - 14:00  [25] |
|  ☐ Thursday                      |
|  ☑ Friday   09:00 - 13:00  [30]  |
|  ☐ Saturday                      |
|  [ Cancel ]  [ Save Schedule ]   |
+----------------------------------+
```

---

## Page 5: OpdQueuePage (Doctor Panel)

```
+--------------------------------------------------+
|  Today Queue — Dr. Amit Sharma                   |
|  Cardiology | 04-08-2026                         |
|  Total: 13 | Done: 5 | Waiting: 7 | Cancelled: 1|
+--------------------------------------------------+
|  #6  Rajesh Kumar        ABHA: 91-1234-5678      |
|      Chest pain          [Call Patient]          |
|                                                  |
|  ─── Currently In ───────────────────────────    |
|  #5  Sunita Devi         ABHA: N/A               |
|      Routine checkup     [Done] [Cancel]         |
|                                                  |
|  ─── Completed ──────────────────────────────    |
|  #1 #2 #3 #4 — Done ✅                           |
+--------------------------------------------------+
```

---

## API Layer (api/ folder)

### api/auth.js
```js
import axios from './client';
export const login = (email, password) => axios.post('/v1/login', { email, password });
export const logout = () => axios.post('/v1/logout');
export const me = () => axios.get('/v1/user');
```

### api/reception.js
```js
import axios from './client';
export const findByToken = (token) =>
    axios.post('/v1/reception/find-by-token', { token });
export const generateOtp = (mobile) =>
    axios.post('/v1/reception/generate-otp', { mobile });
export const verifyOtp = (mobile, otp, txnId) =>
    axios.post('/v1/reception/verify-otp', { mobile, otp, txnId });
export const registerWithoutAbha = (name, mobile) =>
    axios.post('/v1/reception/register-without-abha', { name, mobile });
export const createVisit = (patientId, deptId, doctorId, chiefComplaint) =>
    axios.post('/v1/reception/create-visit', {
        patient_id: patientId, department_id: deptId,
        doctor_id: doctorId, chief_complaint: chiefComplaint
    });
export const getDepartmentsWithDoctors = () =>
    axios.get('/v1/reception/departments-with-doctors');
```

### api/client.js (Axios base with interceptor)
```js
import axios from 'axios';
const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost/api',
});
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
client.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);
export default client;
```

---

## Routing (App.tsx)

```jsx
<Routes>
    <Route path="/login" element={<LoginPage />} />

    <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/reception" element={<ReceptionPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/opd-queue" element={<OpdQueuePage />} />
        </Route>
    </Route>
</Routes>
```

---

## Files to Create (Checklist)

### API Layer:
- [ ] `src/api/client.js` — axios base + interceptors
- [ ] `src/api/auth.js`
- [ ] `src/api/reception.js`
- [ ] `src/api/departments.js`
- [ ] `src/api/doctors.js`
- [ ] `src/api/opd.js`

### Store:
- [ ] `src/store/authStore.js` — user + token context
- [ ] `src/store/receptionStore.js` — reception session state

### UI Components:
- [ ] `src/components/ui/Button.jsx`
- [ ] `src/components/ui/Input.jsx`
- [ ] `src/components/ui/Select.jsx`
- [ ] `src/components/ui/Badge.jsx`
- [ ] `src/components/ui/Card.jsx`
- [ ] `src/components/ui/Spinner.jsx`
- [ ] `src/components/layout/Sidebar.jsx`
- [ ] `src/components/layout/Header.jsx`
- [ ] `src/components/layout/ProtectedRoute.jsx`

### Reception Components:
- [ ] `src/components/reception/FlowSelector.jsx`
- [ ] `src/components/reception/TokenFlow.jsx`
- [ ] `src/components/reception/NewAbhaFlow.jsx`
- [ ] `src/components/reception/SkipFlow.jsx`
- [ ] `src/components/reception/DeptDoctorPicker.jsx`
- [ ] `src/components/reception/ReceiptCard.jsx`

### Pages:
- [ ] `src/pages/LoginPage.jsx`
- [ ] `src/pages/DashboardPage.jsx`
- [ ] `src/pages/ReceptionPage.jsx`
- [ ] `src/pages/DepartmentsPage.jsx`
- [ ] `src/pages/DoctorsPage.jsx`
- [ ] `src/pages/OpdQueuePage.jsx`
