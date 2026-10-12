import { BrowserRouter, Routes, Route, Navigate } from "react-router"
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { toastApiError } from "@/lib/errorHandler"
import { AuthProvider } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/layout/ProtectedRoute"
import { AppLayout } from "@/components/layout/AppLayout"
import { LoginPage } from "@/pages/login/LoginPage"
import { DashboardPage } from "@/pages/dashboard/DashboardPage"
import { ReceptionPage } from "@/pages/reception/ReceptionPage"
import { PatientsPage } from "@/pages/patients/PatientsPage"
import { OpdPage } from "@/pages/opd/OpdPage"
import { DoctorsPage } from "@/pages/doctors/DoctorsPage"
import { DepartmentsPage } from "@/pages/departments/DepartmentsPage"
import { HospitalsPage } from "@/pages/hospitals/HospitalsPage"
import { IpdDeskPage } from "@/pages/ipd/IpdDeskPage"
import { IpdPatientChartPage } from "@/pages/ipd/IpdPatientChartPage"
import { EmergencyDeskPage } from "@/pages/emergency/EmergencyDeskPage"
import { BillingDeskPage } from "@/pages/billing/BillingDeskPage"
import { LabDeskPage } from "@/pages/lab/LabDeskPage"
import { LabTestEditorPage } from "@/pages/lab/LabTestEditorPage"
import { PhlebotomyDisplayPage } from "@/pages/lab/PhlebotomyDisplayPage"
import { LabResultEntryPage } from "@/pages/lab/LabResultEntryPage"
import { LabReportViewPage } from "@/pages/lab/LabReportViewPage"
import { PublicLabReportPage } from "@/pages/lab/PublicLabReportPage"
import { SettingsPage } from "@/pages/settings/SettingsPage"
import { PharmacyDeskPage } from "@/pages/pharmacy/PharmacyDeskPage"
import InputHelperDemoPage from "@/pages/demo/InputHelperDemoPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Auto-toast query errors only if opted-in via meta config
      if (query.meta?.showToast) {
        toastApiError(error, (query.meta?.errorTitle as string) || "Failed to load data")
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Auto-toast mutation errors by default unless marked silent
      if (mutation.meta?.silent) {
        return
      }
      const errorTitle = (mutation.meta?.errorTitle as string) || "Operation failed"
      toastApiError(error, errorTitle)
    },
  }),
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        richColors
        position="top-right"
        closeButton
        gap={12}
        toastOptions={{
          duration: 4500,
        }}
      />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Public Waiting Room TV Kiosk Display */}
            <Route path="/lab/display" element={<PhlebotomyDisplayPage />} />

            {/* Public QR Code Verification Report View */}
            <Route path="/public/report/:id" element={<PublicLabReportPage />} />

            {/* Protected Application Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/reception"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "RECEPTIONIST"]}>
                    <ReceptionPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/abha" element={<Navigate to="/reception" replace />} />
              <Route
                path="/patients"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"]}>
                    <PatientsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/opd"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"]}>
                    <OpdPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/triage" element={<Navigate to="/opd?tab=triage" replace />} />
              <Route
                path="/ipd"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"]}>
                    <IpdDeskPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ipd/admissions/:id"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"]}>
                    <IpdPatientChartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"]}>
                    <EmergencyDeskPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/billing"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "RECEPTIONIST"]}>
                    <BillingDeskPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lab"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "DOCTOR", "LAB_TECHNICIAN", "PATHOLOGIST", "RECEPTIONIST"]}>
                    <LabDeskPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lab/tests/create"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "DOCTOR", "LAB_TECHNICIAN", "PATHOLOGIST"]}>
                    <LabTestEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lab/tests/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "DOCTOR", "LAB_TECHNICIAN", "PATHOLOGIST"]}>
                    <LabTestEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lab/orders/:id/results"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "DOCTOR", "LAB_TECHNICIAN", "PATHOLOGIST"]}>
                    <LabResultEntryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lab/orders/:id/report"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "DOCTOR", "LAB_TECHNICIAN", "PATHOLOGIST", "RECEPTIONIST"]}>
                    <LabReportViewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pharmacy"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "DOCTOR", "PHARMACIST", "RECEPTIONIST"]}>
                    <PharmacyDeskPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctors"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN"]}>
                    <DoctorsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/departments"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN"]}>
                    <DepartmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospitals"
                element={
                  <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                    <HospitalsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN"]}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/demo/input-helper"
                element={<InputHelperDemoPage />}
              />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
