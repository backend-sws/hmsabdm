import React from "react"
import { PageHeader } from "@/components/common/PageHeader"
import { MetricCard } from "@/components/common/MetricCard"
import { SectionCard } from "@/components/SectionCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, FileCheck, Activity, ArrowRight, QrCode, Stethoscope, RefreshCw, CheckCircle2 } from "lucide-react"
import { useNavigate } from "react-router"
import { useAuth } from "@/context/AuthContext"

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name || "Medical Officer"}`}
        subtitle="Healthcare Management System integrated with NHA ABDM Gateway Sandbox M1 & M2."
        badgeText="System Normal"
        badgeVariant="success"
        actions={
          <>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Sync Gateway
            </Button>
            <Button variant="default" size="sm" onClick={() => navigate("/reception")}>
              <QrCode className="h-4 w-4 mr-1.5" /> Reception Desk
            </Button>
          </>
        }
      />

      {/* Metric Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Registered Patients"
          value="1,420"
          change="+14.2%"
          trend="up"
          description="Active ABHA profiles in hospital DB"
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Verified ABHA Health IDs"
          value="1,280"
          change="+9.5%"
          trend="up"
          description="M1 validated via Aadhaar OTP"
          icon={<FileCheck className="h-5 w-5" />}
        />
        <MetricCard
          title="Today's OPD Queue"
          value="42"
          change="Live"
          trend="neutral"
          description="Patients waiting for doctor consult"
          icon={<Stethoscope className="h-5 w-5" />}
        />
        <MetricCard
          title="Gateway Uptime"
          value="99.8%"
          change="Normal"
          trend="neutral"
          description="NHA Sandbox API status"
          icon={<Activity className="h-5 w-5" />}
        />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Quick Action Modules"
            description="Access core ABDM workflows based on your assigned staff role."
          >
            <div className="grid gap-4 sm:grid-cols-2 mt-2">
              <div
                onClick={() => navigate("/reception")}
                className="p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Scan & Share
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Reception & Walk-in Desk</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Process Scan & Share QR tokens, walk-in registrations, and token queue generation.
                  </p>
                </div>
                <div className="flex items-center text-xs font-medium text-primary group-hover:translate-x-1 transition-transform">
                  <span>Open Reception Desk</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>

              <div
                onClick={() => navigate("/opd")}
                className="p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Doctor OPD
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">OPD Consultation Desk</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage patient calling queue, consult notes, prescriptions, and visit completion.
                  </p>
                </div>
                <div className="flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Doctor Desk</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>

              <div
                onClick={() => navigate("/patients")}
                className="p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Users className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    M1 Profile
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">ABHA Patient Directory</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Search patient records, issue ABHA addresses via Aadhaar OTP, and print ABHA cards.
                  </p>
                </div>
                <div className="flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>View Patient Records</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>

              <div
                onClick={() => navigate("/doctors")}
                className="p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Management
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Doctor Roster & Schedules</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    View active OPD doctors today, assign shift schedules, and manage OPD rooms.
                  </p>
                </div>
                <div className="flex items-center text-xs font-medium text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                  <span>View Doctors</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="ABDM Compliance Status" description="National Health Authority Gateway specifications compliance.">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <span className="font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> ABDM Milestone 1
                </span>
                <span className="font-bold font-mono">100% PASS</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <span className="font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Scan & Share (Queue)
                </span>
                <span className="font-bold font-mono">100% PASS</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <span className="font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> ABDM Milestone 2 (HIP)
                </span>
                <span className="font-bold font-mono">READY</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
