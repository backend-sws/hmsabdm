import React, { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Stethoscope,
  Heart,
  Droplet,
  Thermometer,
  Calendar,
  X,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Pagination } from "@/components/common/Pagination"
import { PatientInfoSlideOver } from "@/components/opd/PatientInfoSlideOver"
import { NurseTriageWorkstationView } from "@/components/opd/NurseTriageWorkstationView"
import { formatPatientAge, formatPatientGender } from "@/utils/patientUtils"
import { opdService } from "@/services/opdService"
import { queryKeys } from "@/constants/queryKeys"
import type { OpdVisit } from "@/types/opd"

export const OpdTriageTab: React.FC = () => {
  // ─── Date Filtering State ──────────────────────────────────────────
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "last7" | "all" | "custom">("today")
  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), [])
  const yesterdayStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().substring(0, 10)
  }, [])
  const last7Str = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().substring(0, 10)
  }, [])
  const [customDate, setCustomDate] = useState<string>(todayStr)

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "recorded">("all")
  const [activeWorkstationVisit, setActiveWorkstationVisit] = useState<OpdVisit | null>(null)
  const [selectedDrawerVisit, setSelectedDrawerVisit] = useState<OpdVisit | null>(null)

  // Compute Active Date Query Parameters
  const queryDateParams = useMemo(() => {
    if (dateMode === "today") return { date: todayStr }
    if (dateMode === "yesterday") return { date: yesterdayStr }
    if (dateMode === "last7") return { startDate: last7Str, endDate: todayStr }
    if (dateMode === "all") return { allDates: true }
    if (dateMode === "custom") return { date: customDate }
    return { date: todayStr }
  }, [dateMode, todayStr, yesterdayStr, last7Str, customDate])

  // Format date helper
  const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return ""
    try {
      const d = new Date(dStr.includes("T") ? dStr : `${dStr}T00:00:00`)
      if (isNaN(d.getTime())) return dStr
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return dStr
    }
  }



  // Fetch full OPD queue for selected date
  const {
    data: queueData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [...queryKeys.opd.queue, "triage", queryDateParams],
    queryFn: () => opdService.getQueue({ all: true, ...queryDateParams }),
    refetchInterval: dateMode === "today" ? 20_000 : false,
  })

  const rawQueue: OpdVisit[] = useMemo(() => {
    if (Array.isArray(queueData)) return queueData
    if (Array.isArray((queueData as any)?.data)) return (queueData as any).data
    return []
  }, [queueData])

  // Filter queue
  const filteredList = useMemo(() => {
    return rawQueue.filter((item) => {
      const pName = item.patient_name || item.patient?.name || ""
      const token = String(item.token_no || item.queue_token || item.opd_number || "")
      const uhid = item.uhid || item.patient?.uhid || ""
      const mobile = item.patient?.mobile || ""

      const matchesSearch =
        !search ||
        pName.toLowerCase().includes(search.toLowerCase()) ||
        token.toLowerCase().includes(search.toLowerCase()) ||
        uhid.toLowerCase().includes(search.toLowerCase()) ||
        mobile.includes(search)

      const hasVitals = Boolean(item.has_vitals || item.latest_vital || item.latestVital)

      if (filterStatus === "pending") return matchesSearch && !hasVitals
      if (filterStatus === "recorded") return matchesSearch && hasVitals
      return matchesSearch
    })
  }, [rawQueue, search, filterStatus])

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, filterStatus, dateMode, customDate])

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage, pageSize])

  // Stats
  const stats = useMemo(() => {
    const total = rawQueue.length
    const recorded = rawQueue.filter((x) => Boolean(x.has_vitals || x.latest_vital || x.latestVital)).length
    const pending = total - recorded
    return { total, recorded, pending }
  }, [rawQueue])

  if (activeWorkstationVisit) {
    return (
      <NurseTriageWorkstationView
        visit={activeWorkstationVisit}
        onBack={() => setActiveWorkstationVisit(null)}
        onSuccess={() => {
          setActiveWorkstationVisit(null)
          refetch()
        }}
      />
    )
  }

  const openRecordModal = (visit: OpdVisit) => {
    setActiveWorkstationVisit(visit)
  }

  return (
    <div className="space-y-2.5">
      {/* ────────────────────────────────────────────────────────────────
          COMPACT CONTROL CENTER: DATE + CLICKABLE STATUS PILLS + SEARCH
         ──────────────────────────────────────────────────────────────── */}
      <Card className="p-2.5 rounded-xl border shadow-xs bg-card space-y-2">
        {/* Row 1: Date Quick Selector & Clickable Status Pills & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Date selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-foreground flex items-center gap-1 mr-0.5">
              <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Date:
            </span>

            <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40 gap-1">
              <button
                type="button"
                onClick={() => setDateMode("today")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  dateMode === "today"
                    ? "bg-teal-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => setDateMode("yesterday")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  dateMode === "yesterday"
                    ? "bg-amber-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                ⏪ Yesterday
              </button>

              <button
                type="button"
                onClick={() => setDateMode("last7")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  dateMode === "last7"
                    ? "bg-teal-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                Last 7 Days
              </button>

              <button
                type="button"
                onClick={() => setDateMode("all")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  dateMode === "all"
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                All Dates
              </button>
            </div>

            {/* Calendar input */}
            <Input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value)
                setDateMode("custom")
              }}
              className={`h-8 w-36 text-xs font-mono px-2 py-1 rounded-md ${
                dateMode === "custom"
                  ? "border-teal-500 ring-1 ring-teal-500 bg-teal-500/5 font-bold"
                  : "border-input"
              }`}
            />
          </div>

          {/* Right: Inline Clickable Status Pills & Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                filterStatus === "all"
                  ? "bg-foreground text-background border-foreground shadow-xs"
                  : "bg-muted/50 text-foreground border-border hover:bg-muted"
              }`}
            >
              <span>Total</span>
              <strong className="font-mono">{stats.total}</strong>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("pending")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                filterStatus === "pending"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              }`}
            >
              <span>Vitals Pending</span>
              <strong className="font-mono">{stats.pending}</strong>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("recorded")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                filterStatus === "recorded"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              }`}
            >
              <span>Done</span>
              <strong className="font-mono">{stats.recorded}</strong>
            </button>

            {dateMode !== "today" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateMode("today")
                  setCustomDate(todayStr)
                }}
                className="h-8 text-xs border-teal-500/40 text-teal-700 dark:text-teal-400 hover:bg-teal-500/10 font-semibold px-2.5"
              >
                ↩ Today
              </Button>
            )}

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 text-xs px-2.5 shadow-xs"
              title="Refresh Queue"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Row 2: Search Input */}
        <div className="pt-2 border-t border-border/60">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Token #, UHID, Patient Name, or Mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 text-sm h-9 rounded-lg"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Triage Patient Queue List */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-xs">Loading today's triage queue...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 rounded-xl border border-dashed border-border text-center space-y-2 bg-muted/10">
          <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No patients found in triage</p>
          <p className="text-xs text-muted-foreground">
            {filterStatus === "pending"
              ? "All patients have their vitals recorded! Great job."
              : "No patient visits match your search query."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedList.map((visit) => {
            const hasVitals = Boolean(visit.has_vitals || visit.latest_vital || visit.latestVital)
            const vital = visit.latest_vital || visit.latestVital

            return (
              <div
                key={visit.id}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                {/* Left: Patient Details */}
                <div
                  className="space-y-1.5 flex-1 min-w-0 cursor-pointer group"
                  onClick={() => setSelectedDrawerVisit(visit)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-primary border-primary/30 text-xs font-bold">
                      Token #{visit.token_no || visit.queue_token || visit.opd_number}
                    </Badge>
                    <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                      {visit.patient_name || visit.patient?.name || "Patient"}
                    </span>
                    <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View 360° →
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({visit.uhid || visit.patient?.uhid || "—"})
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {formatPatientAge(visit.age || visit.patient?.age, visit.dob || visit.patient?.dob)} /{" "}
                      {formatPatientGender(visit.gender || visit.patient?.gender)}
                    </Badge>
                    {(visit.visit_date || (visit as any).created_at) && (
                      <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground">
                        📅 {formatDisplayDate(visit.visit_date || (visit as any).created_at)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Stethoscope className="h-3.5 w-3.5 text-primary" />
                      Doctor:{" "}
                      <strong className="text-foreground font-medium">
                        {visit.doctor_name || visit.doctor?.name || "Assigned Doctor"}
                      </strong>
                    </span>
                    <span>
                      Dept:{" "}
                      <strong className="text-foreground font-medium">
                        {visit.department_name || visit.department?.name || "General"}
                      </strong>
                    </span>
                    {visit.chief_complaint && (
                      <span className="italic text-foreground/80">
                        Reason: {visit.chief_complaint}
                      </span>
                    )}
                  </div>

                  {/* Vitals Summary Strip if Recorded */}
                  {hasVitals && vital && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      {vital.blood_pressure_sys && vital.blood_pressure_dia && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                          <Activity className="h-3.5 w-3.5" /> BP: {vital.blood_pressure_sys}/{vital.blood_pressure_dia}
                        </span>
                      )}
                      {vital.pulse_rate && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                          <Heart className="h-3.5 w-3.5" /> Pulse: {vital.pulse_rate} bpm
                        </span>
                      )}
                      {vital.temperature && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <Thermometer className="h-3.5 w-3.5" /> Temp: {vital.temperature}°{vital.temperature_unit || "F"}
                        </span>
                      )}
                      {vital.oxygen_saturation && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                          <Droplet className="h-3.5 w-3.5" /> SpO2: {vital.oxygen_saturation}%
                        </span>
                      )}
                      {vital.bmi && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          BMI: {vital.bmi}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Triage Status & Action Button */}
                <div className="flex items-center gap-3 shrink-0">
                  {hasVitals ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1 text-xs py-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Vitals Recorded
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 gap-1 text-xs py-1 animate-pulse"
                    >
                      <AlertCircle className="h-3.5 w-3.5" /> Vitals Pending
                    </Badge>
                  )}

                  <Button
                    size="sm"
                    variant={hasVitals ? "outline" : "default"}
                    onClick={() => openRecordModal(visit)}
                    className={
                      hasVitals
                        ? "text-xs"
                        : "bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs"
                    }
                  >
                    <Activity className="h-3.5 w-3.5 mr-1" />
                    {hasVitals ? "Update Vitals" : "Record Vitals"}
                  </Button>
                </div>
              </div>
            )
          })}

          {/* Pagination Bar */}
          <Pagination
            currentPage={currentPage}
            totalRecords={filteredList.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize)
              setCurrentPage(1)
            }}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            recordLabel="patients"
            className="rounded-xl border shadow-xs"
          />
        </div>
      )}

      {/* Patient Information Right Slide-Over Drawer */}
      <PatientInfoSlideOver
        open={!!selectedDrawerVisit}
        onClose={() => setSelectedDrawerVisit(null)}
        visit={selectedDrawerVisit}
        onOpenWorkstation={(v) => {
          setSelectedDrawerVisit(null)
          setActiveWorkstationVisit(v)
        }}
        onRecordVitals={(v) => {
          setSelectedDrawerVisit(null)
          setActiveWorkstationVisit(v)
        }}
      />
    </div>
  )
}
