# Frontend Architecture & Technical Documentation

> **Hospital Management System & Ayushman Bharat Digital Mission (ABDM) Integration**  
> Modern, production-ready React 19 application built with TypeScript, Vite, Tailwind CSS v4, shadcn/ui, and TanStack React Query.

---

## 1. Executive Summary & Tech Stack

This frontend application is designed for enterprise-grade hospital operations and ABDM compliance. It adheres to **Clean Architecture**, **SOLID principles**, strict separation of concerns, and design guidelines defined in `.agents/AGENTS.md`.

### Core Technology Stack

| Category               | Technology                                                                | Version              | Purpose                                                        |
| :--------------------- | :------------------------------------------------------------------------ | :------------------- | :------------------------------------------------------------- |
| **Framework**          | [React](https://react.dev/)                                               | `^19.2.6`            | Component model, hooks, concurrent rendering                   |
| **Language**           | [TypeScript](https://www.typescriptlang.org/)                             | `~6.0`               | Strict type safety, interfaces, and DTO contracts              |
| **Bundler & Tooling**  | [Vite](https://vite.dev/)                                                 | `^8.0`               | ESM development server, HMR, and production bundling           |
| **Routing**            | [React Router](https://reactrouter.com/)                                  | `^8.3.0`             | Client-side routing, protected layouts, and redirects          |
| **Styling & Theme**    | [Tailwind CSS](https://tailwindcss.com/)                                  | `^4.0`               | Utility-first CSS, `@theme inline`, OKLCH design tokens        |
| **UI Primitives**      | [shadcn/ui](https://ui.shadcn.com/) / Base UI                             | `^4.16.2`            | Headless & styled primitives (`Button`, `Card`, `Dialog`)      |
| **Icons**              | [Lucide React](https://lucide.dev/)                                       | `^1.29.0`            | Modern, consistent SVG iconography                             |
| **Server State**       | [TanStack React Query](https://tanstack.com/query)                        | `^5.101.4`           | Caching, deduplication, optimistic updates, query invalidation |
| **Forms & Validation** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | `^7.85.0` / `^4.4.3` | Controlled/uncontrolled form state with typed validation       |
| **Notifications**      | [Sonner](https://sonner.emilkowal.ski/)                                   | `^2.0.8`             | Rich, responsive toast notifications                           |
| **Animations**         | [tw-animate-css](https://www.npmjs.com/package/tw-animate-css)            | `^1.4.0`             | Smooth transition and entrance keyframes                       |

---

## 2. Directory Structure Overview

The project is structured under `frontend/src/` with modular responsibilities:

```text
frontend/
├── index.html                  # HTML entry point with font preloads
├── package.json                # Project dependencies, scripts, and build targets
├── vite.config.ts              # Vite configuration (port 5173, proxy target, @ alias)
├── tsconfig.json               # Root TypeScript configuration
├── tsconfig.app.json           # Application TypeScript compiler settings
├── components.json             # shadcn/ui CLI configuration
├── .env / .env.example         # Environment variables (API base URL, proxy targets)
├── public/                     # Static public assets (favicons, logos)
└── src/
    ├── main.tsx                # React DOM mount point & root initialization
    ├── App.tsx                 # QueryClient setup, global toasters, AuthProvider & routing
    ├── index.css               # Design tokens, OKLCH color palettes, dark mode variants
    │
    ├── assets/                 # SVGs, images, static media
    │
    ├── components/             # Reusable UI component ecosystem
    │   ├── ui/                 # shadcn/ui base primitives (button, card, badge, input, etc.)
    │   ├── common/             # Application-level composite components (DataTable, Header, etc.)
    │   ├── layout/             # Structural frame (AppLayout, AppHeader, AppSidebar, ProtectedRoute)
    │   ├── modals/             # Entity Create/Edit/View dialogs (patientEdit, doctorEdit, etc.)
    │   ├── SectionCard.tsx     # Card container for data tables and filter bars
    │   ├── filter-bar.tsx      # Compound search & filter pattern (<FilterBar>)
    │   ├── formContainer.tsx   # Standard modal & drawer shell with backdrop
    │   ├── confirmDialog.tsx   # Danger/Warning confirmation dialog for destructive actions
    │   ├── sectionHeader.tsx   # Numbered section headers for complex multi-step forms
    │   └── theme-provider.tsx  # Dark / Light / System theme context and toggler
    │
    ├── constants/              # Centralized query keys, initial states, and select options
    │   ├── appConstants.ts     # Global application constants
    │   ├── queryKeys.ts        # Query key factories for React Query caching
    │   ├── patient.constants.ts# Initial filters, gender/blood group options, form defaults
    │   ├── doctor.constants.ts # Doctor filters, specializations, schedule status options
    │   ├── department.constants.ts # Department filters, status flags, form defaults
    │   └── hospital.constants.ts   # Hospital filters, facility types, HFR defaults
    │
    ├── context/                # React Contexts for global client-side state
    │   └── AuthContext.tsx     # JWT authentication state, token storage, login/logout, user info
    │
    ├── hooks/                  # Custom reusable React hooks
    │   ├── useSearchFilter.ts  # Generic URL/state filter management with auto page reset
    │   └── useDisclosure.ts    # Dialog, modal, and drawer open/close/data controller
    │
    ├── lib/                    # Core utilities and helper functions
    │   ├── utils.ts            # clsx + tailwind-merge helper (`cn()`)
    │   └── errorHandler.tsx    # Standardized API error parser & sonner toast trigger
    │
    ├── pages/                  # Page-level route views (thin controllers)
    │   ├── dashboard/          # Hospital executive overview & clinical activity KPIs
    │   ├── reception/          # ABDM Scan & Share, walk-in registration & counter tokens
    │   ├── patients/           # Patient directory, ABHA linking, registration table
    │   ├── opd/                # Real-time OPD Doctor queue, consultation triage
    │   ├── doctors/            # Doctor directory, medical council reg, consultation fees
    │   ├── departments/        # Clinical unit catalog, doctor distribution, status toggle
    │   ├── hospitals/          # Hospital & Clinic management, ABDM HFR/HIP settings
    │   ├── login/              # Multi-role authentication & demo credentials switcher
    │   └── demo/               # Showcase page for `FormInput` and design system tokens
    │
    ├── services/               # Typed API HTTP clients (communicating with backend)
    │   ├── apiClient.ts        # Fetch wrapper with Bearer token injection and error handling
    │   ├── authService.ts      # Login, session refresh, current user profile
    │   ├── patientService.ts   # Patient CRUD, search by mobile/ABHA, registration
    │   ├── doctorService.ts    # Doctor CRUD, department assignments, schedules
    │   ├── departmentService.ts# Department CRUD, active/inactive status toggle
    │   └── hospitalService.ts  # Hospital CRUD, facility settings, ABDM details
    │
    └── types/                  # TypeScript domain models, DTOs, and API responses
        ├── auth.ts             # User roles, JWT payload, LoginCredentials, User session
        ├── patient.ts          # Patient entity, ABDM ABHA address, CreatePatientDto
        ├── doctor.ts           # Doctor entity, qualifications, fees, CreateDoctorDto
        ├── department.ts       # Department entity, clinical codes, CreateDepartmentDto
        ├── hospital.ts         # Hospital entity, HFR/HIP codes, CreateHospitalDto
        └── form-input.types.ts # Discriminated union types for dynamic FormInput components
```

---

## 3. Architecture & Core Design Patterns

The codebase strictly follows the engineering rules documented in `.agents/AGENTS.md`:

```
┌─────────────────────────────────────────────────────────────┐
│                      Pages (Thin Views)                     │
│  - Receives route params & sets layout                      │
│  - Uses custom hooks for data fetching & modal disclosure   │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│      Domain Components       │ │         Custom Hooks        │
│  - FilterBar (Compound)      │ │  - useSearchFilter()        │
│  - SectionCard / StatCards   │ │  - useDisclosure()          │
│  - Modals (patientEdit, etc) │ │  - useAuth()                │
│  - DataTable<T>              │ └──────────────┬──────────────┘
└──────────────┬───────────────┘                │
               │                                │
               ▼                                ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│     UI Primitives (Base)     │ │        React Query          │
│  - Button, Badge, Card       │ │  - queryKeys factory        │
│  - FormContainer, Dialog     │ │  - queryCache / mutation    │
│  - FormInput (17+ types)     │ │  - Automatic Sonner Toasts  │
└──────────────────────────────┘ └──────────────┬──────────────┘
                                                │
                                                ▼
                                 ┌─────────────────────────────┐
                                 │     API Services & Client   │
                                 │  - apiClient (Fetch Wrapper)│
                                 │  - authService, etc.        │
                                 └──────────────┬──────────────┘
                                                │
                                                ▼
                                 ┌─────────────────────────────┐
                                 │       ABDM API Server       │
                                 └─────────────────────────────┘
```

### 3.1 Compound FilterBar Pattern

All filtering across listing screens utilizes the compound `<FilterBar>` component to maintain visual uniformity and state synchronization.

```tsx
<SectionCard title="Registered Patients" description="Search and manage records">
  <FilterBar values={filter} onChange={handleFilterChange}>
    <FilterBar.Search
      name="search"
      placeholder="Search patient name, ABHA number, or mobile..."
      className="w-80"
    />
    <FilterBar.Select
      name="gender"
      placeholder="All Genders"
      options={[
        { label: "Male", value: "MALE" },
        { label: "Female", value: "FEMALE" },
        { label: "Other", value: "OTHER" },
      ]}
    />
  </FilterBar>
  <DataTable columns={columns} data={patients} ... />
</SectionCard>
```

- **Filter Hook Integration**: Paired with `useSearchFilter(INITIAL_FILTERS)`.
- **Zero In-Memory Array Filtering**: Searching, sorting, and pagination parameters are passed directly to backend APIs via React Query.
- **Page Reset Rule**: Any change to search keywords or dropdown filters automatically resets pagination (`page: 1`).

### 3.2 Modal & Form Container Pattern (`useDisclosure`)

Modals, slide-in drawers, and edit forms are never inlined inside page components. They are extracted into `@/components/modals/<entity>Edit.tsx`:

- **State Management**: Controlled by `useDisclosure<T>()`:
  ```tsx
  const editDisclosure = useDisclosure<Doctor & { viewMode?: boolean }>()

  // Actions:
  editDisclosure.onOpen(doctor)        // Opens for editing
  editDisclosure.onOpen({ ...doctor, viewMode: true }) // Opens in read-only view
  editDisclosure.onClose()             // Closes and clears payload
  ```
- **Form Shell**: Modals use `<FormContainer>` with backdrop blur, keyboard ESC dismissal, and animated portals.
- **Controlled Forms**: Built using `react-hook-form` (`useForm`, `Controller`) with default values imported from `@/constants/<entity>.constants.ts`.
- **Section Headers**: Structured using `sectionHeader("01", "Personal Information")` to visually divide multi-field medical forms.

### 3.3 Safe Destructive Actions (`ConfirmDialog`)

Permanent operations (deleting a doctor, cancelling an OPD token, deactivating a hospital wing) require explicit confirmation:

```tsx
<ConfirmDialog
  open={deleteDisclosure.isOpen}
  onOpenChange={deleteDisclosure.onClose}
  title="Deactivate Department"
  description={`Are you sure you want to deactivate ${deleteDisclosure.data?.name}?`}
  confirmLabel="Deactivate"
  variant="danger"
  isLoading={deleteMutation.isPending}
  onConfirm={() => deleteMutation.mutate(deleteDisclosure.data!.id)}
/>
```

### 3.4 Data Table Abstraction (`DataTable<T>`)

The table system (`@/components/common/DataTable.tsx`) provides:

- Fully typed column definitions via `DataTableColumn<T>[]`.
- Cell renderers with custom React nodes (status badges, action buttons, timestamps).
- Integrated skeleton pulse loading to eliminate Cumulative Layout Shift (CLS).
- Contextual empty states with primary action call-to-actions when records are empty.
- Built-in pagination controls with page size selector.

### 3.5 Universal `FormInput` Component

Located in `@/components/common/FormInput.tsx`, this component unifies form controls into a single component supporting 17+ input types:

- `text`, `email`, `password`, `number`, `tel`, `url`, `search`
- `textarea` (auto-resizing)
- `select` (searchable/native)
- `checkbox`, `switch`, `radio`
- `date`, `datetime-local`, `time`
- `image` (drag & drop, preview, size limit validation)
- Built-in floating tooltip, error validation message, and helper text integration.

---

## 4. State Management & Network Architecture

### 4.1 Server State (TanStack React Query)

Client and server state are decoupled. Server state is managed exclusively by React Query:

- **Centralized Query Keys** (`@/constants/queryKeys.ts`):
  ```typescript
  export const queryKeys = {
    patients: {
      all: ["patients"] as const,
      list: (filter?: Record<string, any>) => ["patients", "list", filter || {}] as const,
      detail: (id: string | number) => ["patients", "detail", id] as const,
    },
    // ...hospitals, departments, doctors
  }
  ```
- **Global Error Interception**: In `App.tsx`, `QueryCache` and `MutationCache` intercept failures:
  - Query errors show toasts when opted-in (`query.meta?.showToast`).
  - Mutation errors automatically trigger rich error toasts via `toastApiError(error)` unless explicitly marked `{ meta: { silent: true } }`.
- **Automatic Invalidation**: Successful mutations invalidate matching query key prefixes (`queryClient.invalidateQueries({ queryKey: queryKeys.doctors.all })`), triggering a seamless background refresh.

### 4.2 Client State & Authentication (`AuthContext`)

- **JWT Storage**: Persisted in `localStorage` under key `hms_auth_token`.
- **Auto-Rehydration**: On application mount, if a token is present, the app calls `authService.getCurrentUser()` to validate the session and fetch user privileges.
- **Role-Based Access Control (RBAC)**:
  - `ProtectedRoute`: Checks authentication status. If unauthenticated, saves current location and redirects to `/login`.
  - `AppSidebar`: Filters navigation links according to user roles (`SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `RECEPTIONIST`).
  - `PermissionGate`: Conditional rendering component for action buttons based on granular roles and permissions.

### 4.3 Network Layer (`apiClient.ts`)

The `apiClient` utility wraps standard `fetch`:

- Prefixes requests with `VITE_API_BASE_URL` (default: `/api/v1`).
- Injects `Authorization: Bearer <token>` automatically on every authenticated request.
- Handles empty responses (`204 No Content`).
- Automatically unwraps standard API success envelopes (`{ success: true, data: [...] }`).
- Normalizes server error formats (single error strings, nested validation objects) into instances of `ApiError`.

---

## 5. Visual System & Design System

The application strictly obeys the styling rules in `.agents/AGENTS.md` and `src/index.css`:

### 5.1 CSS Variables & Palette Single Source-of-Truth

- Colors are defined using modern **OKLCH** color coordinates in `src/index.css`.
- **NEVER** use arbitrary hex colors or hardcoded utility classes like `bg-[#1a2b3c]`.
- Always use semantic Tailwind tokens:
  - `bg-background` / `text-foreground`
  - `bg-card` / `text-card-foreground` / `border-border`
  - `bg-primary` / `text-primary-foreground`
  - `bg-muted` / `text-muted-foreground`
  - `bg-destructive` / `text-destructive-foreground`

### 5.2 Dark Mode Support

- Handled via class `.dark` on the root document element.
- The `ThemeProvider` component (`src/components/theme-provider.tsx`) supports `light`, `dark`, and `system` modes, with instant toggle from the application header.

### 5.3 Mobile & Responsive Standards

- **Zero Horizontal Scroll**: All layouts enforce `overflow-x-hidden` with flexible containers.
- **Adaptive Breakpoints**: Mobile screens (`< lg`) collapse sidebars into slide-out drawer menus and stack grid cards vertically.
- **Accessible Touch Targets**: Buttons and interactive controls maintain a minimum height of `40px` (`h-10` or `h-11`).

---

## 6. Functional Pages & Modules

| Module / Route                         | File Location                           | Key Capabilities & ABDM Features                                                                                          |
| :------------------------------------- | :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Login** (`/login`)                   | `pages/login/LoginPage.tsx`             | Multi-role credential authentication, demo user quick-fill switcher, ABDM branding, animated glassmorphism cards.         |
| **Dashboard** (`/`)                    | `pages/dashboard/DashboardPage.tsx`     | Clinical metrics (Total Patients, Today's OPD Tokens, Active Doctors), quick-action links, live OPD queue status.         |
| **Reception & Walk-in** (`/reception`) | `pages/reception/ReceptionPage.tsx`     | ABDM Scan & Share QR counter, instant OPD token generation, walk-in triage, demographic capture.                          |
| **Patients** (`/patients`)             | `pages/patients/PatientsPage.tsx`       | Patient master index, ABHA ID creation/verification, demographic search, modal edit/create (`patientEdit.tsx`).           |
| **OPD Queue** (`/opd`)                 | `pages/opd/OpdQueuePage.tsx`            | Doctor consultation desk, live queue status (Waiting, In Consultation, Completed, Cancelled), patient triage.             |
| **Doctors** (`/doctors`)               | `pages/doctors/DoctorsPage.tsx`         | Doctor registry, state medical council numbers, specialization mapping, consultation fees, modal (`doctorEdit.tsx`).      |
| **Departments** (`/departments`)       | `pages/departments/DepartmentsPage.tsx` | Hospital wings and clinical departments, active/inactive toggles, doctor count aggregation, modal (`departmentEdit.tsx`). |
| **Hospitals** (`/hospitals`)           | `pages/hospitals/HospitalsPage.tsx`     | Multi-hospital management, ABDM Health Facility Registry (HFR/HIP) configuration, contact, modal (`hospitalEdit.tsx`).    |
| **UI Demo** (`/demo/input-helper`)     | `pages/demo/InputHelperDemoPage.tsx`    | Visual catalog displaying all `FormInput` variants, validation states, tooltips, and file pickers.                        |

---

## 7. Step-by-Step Guide: Adding a New Entity Module

To add a new feature module (e.g. `Appointments`, `Prescriptions`, or `Billing`), follow this established pattern:

### Step 1: Define TypeScript Types (`src/types/<entity>.ts`)

```typescript
export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  appointment_date: string
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED"
  created_at: string
}

export type CreateAppointmentDto = Omit<Appointment, "id" | "created_at">
```

### Step 2: Create Constants (`src/constants/<entity>.constants.ts`)

```typescript
export const INITIAL_APPOINTMENT_FILTERS = {
  search: "",
  status: "",
  page: 1,
  limit: 10,
}

export const APPOINTMENT_STATUS_OPTIONS = [
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
]
```

### Step 3: Register Query Keys (`src/constants/queryKeys.ts`)

```typescript
appointments: {
  all: ["appointments"] as const,
  list: (filter?: Record<string, any>) => ["appointments", "list", filter || {}] as const,
  detail: (id: string | number) => ["appointments", "detail", id] as const,
}
```

### Step 4: Implement Service (`src/services/<entity>Service.ts`)

```typescript
import { apiClient } from "./apiClient"
import type { Appointment, CreateAppointmentDto } from "@/types/appointment"

export const appointmentService = {
  getAppointments: (filter?: Record<string, any>) => {
    const params = new URLSearchParams(filter as any).toString()
    return apiClient<Appointment[]>(`/appointments?${params}`)
  },
  createAppointment: (dto: CreateAppointmentDto) => {
    return apiClient<Appointment>("/appointments", {
      method: "POST",
      body: JSON.stringify(dto),
    })
  },
}
```

### Step 5: Create Modal Component (`src/components/modals/<entity>Edit.tsx`)

Create a modal using `FormContainer`, `react-hook-form`, and `useMutation`.

### Step 6: Create Page View (`src/pages/<entity>/<Entity>Page.tsx`)

Create the view pairing `useSearchFilter`, `useDisclosure`, `SectionCard`, `FilterBar`, and `DataTable`.

### Step 7: Register Route & Navigation

1. Add the route in `src/App.tsx` under `<AppLayout />`.
2. Add navigation link in `src/components/layout/AppSidebar.tsx` with role permissions.

---

## 8. Development & Build Commands

```bash
# Install dependencies
npm install

# Start local development server (Vite with HMR on port 5173)
npm run dev

# Run TypeScript typecheck without emitting output
npm run typecheck

# Run ESLint validation
npm run lint

# Format codebase with Prettier and Tailwind plugin
npm run format

# Build production bundle
npm run build

# Preview production bundle locally
npm run preview
```

---

## 9. Code Quality & Contribution Standards

1. **Strict TypeScript**: Do not use `any` when defining entity shapes or API payloads; use strong typing.
2. **Never Hardcode Theme Hexes**: Always use CSS variables (`bg-primary`, `border-border`, `text-muted-foreground`).
3. **Keep Pages Thin**: Business logic and data fetching belong in hooks and services; UI presentation belongs in components.
4. **Toast Feedback**: Always inform the user of async operation outcomes via `sonner` toasts.
5. **No Client-Side Array Filtering**: Rely on backend pagination and search queries to guarantee high scalability.
