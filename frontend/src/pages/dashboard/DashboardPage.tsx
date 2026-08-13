import React from "react"
import { MetricCard } from "@/components/common/MetricCard"
import {
  Users,
  FileCheck,
  Sparkles,
  HeartPulse,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { OpdQueueWidget } from "@/components/dashboard/OpdQueueWidget"
import { AbdmComplianceWidget } from "@/components/dashboard/AbdmComplianceWidget"

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Executive Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/30 p-6 shadow-xs sm:p-8 dark:border-blue-900/40 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/20">
        {/* Background decorative soft ambient glows */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          {/* Left Welcome Copy */}
          <div className="max-w-xl space-y-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Healthcare
                Operations Center
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{" "}
                ABDM Gateway Active
              </span>
            </div>

            <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl xl:text-4xl">
              {getGreeting()},{" "}
              <span className="text-primary">
                {user?.name || "HMS Super Admin"}
              </span>{" "}
              👋
            </h1>

            <p className="text-xs leading-relaxed font-medium text-muted-foreground sm:text-sm">
              Integrated with National Health Authority Sandbox for ABHA
              Creation (M1), Health Records Sharing (M2), and Express Token
              Queue.
            </p>
          </div>

          {/* Right Section: Vector Hospital Illustration & Stacked Quick Buttons */}
          <div className="flex shrink-0 items-center justify-between gap-6 border-t border-blue-100/60 pt-2 xl:justify-end xl:border-t-0 xl:pt-0 dark:border-blue-900/30">
            {/* 3D Modern Hospital Building Vector Graphic */}
            <div className="relative hidden h-4/5 w-3/5 shrink-0 sm:block">
              <img src="/hospital.png" className="h-full w-full object-cover" />
            </div>

            {/* Quick Action Stacked Launch Buttons */}
          </div>
        </div>
      </div>

      {/* 4 Metric Cards Overview Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="TOTAL REGISTERED PATIENTS"
          value="1,420"
          change="14.2% vs last wk"
          trend="up"
          description="Active hospital profiles in DB"
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          strokeColor="#3b82f6"
          sparklineData={[35, 45, 40, 65, 80, 75, 95]}
        />
        <MetricCard
          title="VERIFIED ABHA HEALTH IDS"
          value="1,280"
          change="90.1% Verified"
          trend="up"
          description="Validated via Aadhaar OTP"
          icon={<FileCheck className="h-5 w-5" />}
          iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          strokeColor="#10b981"
          sparklineData={[25, 40, 50, 60, 75, 85, 95]}
        />
        <MetricCard
          title="TODAY'S OPD QUEUE"
          value="42"
          change="12 Waiting"
          trend="neutral"
          description="Patients waiting for consultation"
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-purple-500/10 text-purple-600 dark:text-purple-400"
          strokeColor="#a855f7"
          sparklineData={[15, 25, 30, 42, 35, 38, 42]}
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
      </div>

      {/* Main Split View Grid (Left ~62% Live OPD Queue, Right ~38% ABDM Compliance Widget) */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Live OPD Queue Tracker */}
        <div className="lg:col-span-7 xl:col-span-8">
          <OpdQueueWidget />
        </div>

        {/* Right Column: ABDM Compliance & Gateway */}
        <div className="lg:col-span-5 xl:col-span-4">
          <AbdmComplianceWidget />
        </div>
      </div>
    </div>
  )
}
