import { BrowserRouter, Routes, Route, Navigate } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/layout/ProtectedRoute"
import { AppLayout } from "@/components/layout/AppLayout"
import { LoginPage } from "@/pages/login/LoginPage"
import { DashboardPage } from "@/pages/dashboard/DashboardPage"
import { ReceptionPage } from "@/pages/reception/ReceptionPage"
import { PatientsPage } from "@/pages/patients/PatientsPage"
import { OpdQueuePage } from "@/pages/opd/OpdQueuePage"
import { DoctorsPage } from "@/pages/doctors/DoctorsPage"
import { DepartmentsPage } from "@/pages/departments/DepartmentsPage"
import { HospitalsPage } from "@/pages/hospitals/HospitalsPage"
import InputHelperDemoPage from "@/pages/demo/InputHelperDemoPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Application Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/reception" element={<ReceptionPage />} />
              <Route path="/patients" element={<PatientsPage />} />

              <Route path="/opd" element={<OpdQueuePage />} />
              <Route path="/doctors" element={<DoctorsPage />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/hospitals" element={<HospitalsPage />} />
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
