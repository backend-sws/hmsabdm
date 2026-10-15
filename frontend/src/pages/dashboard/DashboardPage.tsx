import React from "react"
import { useNavigate } from "react-router"
import {
  Users,
  Stethoscope,
  Bed,
  Receipt,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Siren,
  FlaskConical,
  Pill,
  TrendingUp,
  QrCode,
  LayoutDashboard,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/common/PageHeader"
import { OpdQueueWidget } from "@/components/dashboard/OpdQueueWidget"
import { SuperAdminDashboardView } from "@/components/dashboard/SuperAdminDashboardView"

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const rawRole = (user?.role || user?.roles?.[0] || "").toUpperCase().replace(/[\s_-]+/g, "")
  const isSuperAdmin = rawRole.includes("SUPER")

  if (isSuperAdmin) {
    return <SuperAdminDashboardView />
  }

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP PAGE HEADER (CONSISTENT WITH ALL PAGES)
         ───────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Hospital Operations Tracking"
        subtitle="Manage real-time OPD consultation queue, inpatient census, emergency triage, and ABDM synchronization logs."
        icon={LayoutDashboard}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/opd")}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 shadow-2xs hover:bg-muted"
            >
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>OPD Queue Desk</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/ipd")}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 shadow-2xs hover:bg-muted"
            >
              <Bed className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Admit IPD</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate("/reception")}
              className="h-9 bg-primary text-primary-foreground font-semibold text-xs px-4 shadow-xs hover:bg-primary/90 gap-1.5"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Express Walk-in</span>
            </Button>
          </div>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          2. KEY CLINICAL & ADMINISTRATIVE KPI METRICS ("bs cards ko chor ke")
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Patient Census */}
        <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs transition-all hover:border-purple-500/40 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                Registered Patients
              </p>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                1,420
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-2xs">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]">
              <TrendingUp className="h-3 w-3" /> +14.2%
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              1,280 ABHA Linked (90%)
            </span>
          </div>
        </div>

        {/* KPI 2: Today's OPD Queue */}
        <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs transition-all hover:border-purple-500/40 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                Today's OPD Queue
              </p>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                42
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <Stethoscope className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
            <span className="text-[11px] font-semibold text-foreground">
              14 Consult • 12 Wait • 16 Done
            </span>
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="h-3 w-3 text-emerald-500" /> ~12m
            </span>
          </div>
        </div>

        {/* KPI 3: Inpatient Bed Occupancy */}
        <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs transition-all hover:border-purple-500/40 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                IPD Bed Occupancy
              </p>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                38 <span className="text-sm font-semibold text-muted-foreground">/ 50 (76%)</span>
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-2xs">
              <Bed className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2">
            <div className="h-1.5 w-full rounded-full bg-indigo-500/20 overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: "76%" }} />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
              <span>12 ICU • 26 General</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">12 Available</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Daily Hospital Collections */}
        <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs transition-all hover:border-purple-500/40 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                Today's Collections
              </p>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                ₹1,84,500
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-2xs">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium truncate">
              UPI: ₹88k • Cash: ₹62k • TPA: ₹34k
            </span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp className="h-3 w-3" /> +8.6%
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN OPERATIONS SPLIT VIEW
             Left (8 cols): Live OPD Consultation Queue
             Right (4 cols): Ward Census Matrix & ABDM Gateway Monitor
         ───────────────────────────────────────────────────────────── */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Left 8 cols: Live OPD Queue Tracker */}
        <div className="lg:col-span-8">
          <OpdQueueWidget />
        </div>

        {/* Right 4 cols: Facility Bed Monitor & ABDM Health */}
        <div className="lg:col-span-4 space-y-5">
          {/* Ward Bed Availability Card */}
          <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Bed className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Ward Census & Beds</h3>
                  <p className="text-[11px] text-muted-foreground">Real-time occupancy status</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold">
                50 Beds Total
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              {/* ICU */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-foreground">ICU / CCU Ward</span>
                  <span className="font-mono text-muted-foreground">8 / 10 (80%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: "80%" }} />
                </div>
              </div>

              {/* General Male */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-foreground">General Male Ward</span>
                  <span className="font-mono text-muted-foreground">14 / 16 (87%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: "87%" }} />
                </div>
              </div>

              {/* General Female */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-foreground">General Female Ward</span>
                  <span className="font-mono text-muted-foreground">12 / 16 (75%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: "75%" }} />
                </div>
              </div>

              {/* Emergency */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-foreground">Emergency & Triage</span>
                  <span className="font-mono text-muted-foreground">4 / 8 (50%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "50%" }} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 text-center">
              <button
                onClick={() => navigate("/ipd")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 transition-colors cursor-pointer"
              >
                <span>View Full Bed Matrix</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ABDM & Gateway Monitor Card */}
          <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">ABDM Gateway Health</h3>
                  <p className="text-[11px] text-muted-foreground">NHA Sandbox V2 Connectivity</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                99.8% ONLINE
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  M1: ABHA Registration & OTP
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">100%</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  M2: FHIR Health Records Share
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">100%</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Activity className="h-4 w-4 text-blue-500 shrink-0" />
                  Gateway Latency
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">24 ms</span>
              </div>
            </div>

            {/* Quick Clinical Shortcuts */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => navigate("/emergency")}
                className="flex items-center gap-1.5 p-2 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <Siren className="h-3.5 w-3.5 text-rose-500" />
                <span>Emergency</span>
              </button>

              <button
                onClick={() => navigate("/lab")}
                className="flex items-center gap-1.5 p-2 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <FlaskConical className="h-3.5 w-3.5 text-sky-500" />
                <span>Lab Queue</span>
              </button>

              <button
                onClick={() => navigate("/pharmacy")}
                className="flex items-center gap-1.5 p-2 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <Pill className="h-3.5 w-3.5 text-emerald-500" />
                <span>Pharmacy POS</span>
              </button>

              <button
                onClick={() => navigate("/insurance")}
                className="flex items-center gap-1.5 p-2 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
                <span>Insurance TPA</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
