import React, { useState } from "react"
import { useSearchParams } from "react-router"
import {
  Stethoscope,
  Activity,
  Building2,
  FileText,
} from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { OpdDoctorDeskTab } from "./tabs/OpdDoctorDeskTab"
import { OpdTriageTab } from "./tabs/OpdTriageTab"
import { OpdCentralMonitorTab } from "./tabs/OpdCentralMonitorTab"
import { OpdHistoryTab } from "./tabs/OpdHistoryTab"

export type OpdWorkstationTab = "doctor-desk" | "triage" | "monitor" | "history"

export const OpdPage: React.FC = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const roleStr = String(user?.role || user?.roles?.[0] || "").toUpperCase()
  const isNurse = roleStr.includes("NURSE")

  // Default tab based on role
  const defaultTab: OpdWorkstationTab = isNurse ? "triage" : "doctor-desk"
  const urlTab = searchParams.get("tab") as OpdWorkstationTab | null

  const [activeTab, setActiveTab] = useState<OpdWorkstationTab>(
    urlTab || defaultTab
  )

  const handleTabChange = (tab: OpdWorkstationTab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  return (
    <div className="space-y-3">
      {/* ────────────────────────────────────────────────────────────────
          COMPACT MASTER HEADER & CLINICAL WORKSTATION TABS
         ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-border">
        {/* Compact Title & Badge */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Stethoscope className="h-4.5 w-4.5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            OPD Clinical Workstation
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            OPD Hub
          </span>
        </div>

        {/* Compact Segmented Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleTabChange("doctor-desk")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === "doctor-desk"
                ? "bg-background text-primary font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Stethoscope className="h-4 w-4" /> Doctor Desk
          </button>

          <button
            onClick={() => handleTabChange("triage")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === "triage"
                ? "bg-background text-teal-600 dark:text-teal-400 font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4" /> Nurse Triage
          </button>

          <button
            onClick={() => handleTabChange("monitor")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === "monitor"
                ? "bg-background text-primary font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4" /> Facility Monitor
          </button>

          <button
            onClick={() => handleTabChange("history")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === "history"
                ? "bg-background text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" /> Consultations Log
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          ACTIVE WORKSTATION CONTENT
         ──────────────────────────────────────────────────────────────── */}
      <div>
        {activeTab === "doctor-desk" && <OpdDoctorDeskTab />}
        {activeTab === "triage" && <OpdTriageTab />}
        {activeTab === "monitor" && <OpdCentralMonitorTab />}
        {activeTab === "history" && <OpdHistoryTab />}
      </div>
    </div>
  )
}

export default OpdPage
