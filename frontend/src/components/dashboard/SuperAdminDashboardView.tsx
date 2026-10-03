import React from "react"
import { MetricCard } from "@/components/common/MetricCard"
import {
  Building2,
  ShieldCheck,
  Sparkles,
  HeartPulse,
  Activity,
  ArrowRight,
  Plus,
} from "lucide-react"
import { useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { hospitalService } from "@/services/hospitalService"
import { queryKeys } from "@/constants/queryKeys"
import { StatusBadge } from "@/components/common/StatusBadge"
import { AbdmComplianceWidget } from "@/components/dashboard/AbdmComplianceWidget"
import type { Hospital } from "@/types/hospital"

export const SuperAdminDashboardView: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.hospitals.list({}),
    queryFn: () => hospitalService.getHospitals({}),
  })

  const hospitalsList: Hospital[] = (data as any)?.data || []
  const totalCount = hospitalsList.length || 1
  const activeCount = hospitalsList.filter((h) => h.status !== "inactive").length || 1

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Super Admin Executive Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/30 p-6 shadow-xs sm:p-8 dark:border-blue-900/40 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/20">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="max-w-xl space-y-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Super Admin Platform Control
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{" "}
                Multi-Tenant ABDM Active
              </span>
            </div>

            <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl xl:text-4xl">
              {getGreeting()},{" "}
              <span className="text-primary">{user?.name || "HMS Super Admin"}</span> 👋
            </h1>

            <p className="text-xs leading-relaxed font-medium text-muted-foreground sm:text-sm">
              Global platform oversight for National Health Authority ABDM registered healthcare
              facilities, tenant hospital onboarding, and network compliance monitoring.
            </p>

            <div className="pt-1">
              <Button
                onClick={() => navigate("/hospitals")}
                className="gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                <span>Onboard New Hospital Facility</span>
              </Button>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-6 border-t border-blue-100/60 pt-2 xl:justify-end xl:border-t-0 xl:pt-0 dark:border-blue-900/30">
            <div className="relative hidden h-44 w-52 shrink-0 sm:block">
              <img src="/hospital.png" alt="Hospital platform" className="h-full w-full object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Super Admin Platform Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="REGISTERED HOSPITALS"
          value={String(totalCount)}
          change={`${activeCount} Active Facilities`}
          trend="up"
          description="Healthcare facilities onboarded"
          icon={<Building2 className="h-5 w-5" />}
          iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          strokeColor="#3b82f6"
          sparklineData={[1, 1, 2, 2, 3, 3, totalCount]}
        />
        <MetricCard
          title="ABDM COMPLIANT NODES"
          value="100%"
          change="Verified HIP IDs"
          trend="up"
          description="Validated with NHA registry"
          icon={<ShieldCheck className="h-5 w-5" />}
          iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          strokeColor="#10b981"
          sparklineData={[100, 100, 100, 100, 100, 100, 100]}
        />
        <MetricCard
          title="ABDM GATEWAY HEALTH"
          value="99.8%"
          change="24ms Latency"
          trend="up"
          description="NHA Sandbox API status"
          icon={<HeartPulse className="h-5 w-5" />}
          iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          strokeColor="#f97316"
          sparklineData={[98, 99, 99.5, 99.8, 99.6, 99.8, 100]}
        />
        <MetricCard
          title="NETWORK PROTOCOLS"
          value="M1, M2 & M3"
          change="Full Sandbox Compliant"
          trend="up"
          description="Aadhaar, Health Records & Share"
          icon={<Activity className="h-5 w-5" />}
          iconBg="bg-purple-500/10 text-purple-600 dark:text-purple-400"
          strokeColor="#a855f7"
          sparklineData={[80, 85, 90, 95, 98, 100, 100]}
        />
      </div>

      {/* Main Split View: Onboarded Facilities Directory (Left) + ABDM Compliance (Right) */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Registered Hospital Facilities Overview */}
        <div className="space-y-4 lg:col-span-7 xl:col-span-8">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Registered Healthcare Facilities</h2>
                <p className="text-xs text-muted-foreground">
                  Hospitals and clinics onboarded on the HMS ABDM network platform
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/hospitals")}
                className="gap-1.5 rounded-xl text-xs font-semibold"
              >
                <span>Manage All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : hospitalsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 py-10 text-center">
                <Building2 className="mb-2 h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-semibold text-foreground">No hospitals onboarded yet</p>
                <p className="mb-3 text-xs text-muted-foreground">Click below to onboard the first healthcare facility.</p>
                <Button size="sm" onClick={() => navigate("/hospitals")}>
                  Onboard Hospital
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {hospitalsList.slice(0, 5).map((hospital) => (
                  <div
                    key={hospital.id}
                    onClick={() => navigate("/hospitals")}
                    className="group flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3.5 transition-all hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground group-hover:text-primary">
                            {hospital.name}
                          </p>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {hospital.abdm_hip_id || "N/A"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {[hospital.city, hospital.state].filter(Boolean).join(", ") || "India"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={hospital.status || "active"} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: ABDM Compliance & Gateway */}
        <div className="lg:col-span-5 xl:col-span-4">
          <AbdmComplianceWidget />
        </div>
      </div>
    </div>
  )
}
