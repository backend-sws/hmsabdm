import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Stethoscope,
  PhoneCall,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Printer,
  Edit3,
  Calendar,
  RotateCcw,
  Building2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Pagination } from "@/components/common/Pagination"
import { PatientInfoSlideOver } from "@/components/opd/PatientInfoSlideOver"
import { DoctorConsultationWorkstationView } from "@/components/opd/DoctorConsultationWorkstationView"
import { PrescriptionPrintModal } from "@/components/opd/PrescriptionPrintModal"
import { formatPatientAge, formatPatientGender } from "@/utils/patientUtils"
import { useAuth } from "@/context/AuthContext"
import { opdService } from "@/services/opdService"
import { receptionService } from "@/services/receptionService"
import { queryKeys } from "@/constants/queryKeys"
import type { OpdVisit } from "@/types/opd"

function formatDisplayDate(dateStr?: string | null) {
  if (!dateStr) return "—"
  try {
    const clean = String(dateStr).substring(0, 10)
    const [y, m, d] = clean.split("-").map(Number)
    if (!y || !m || !d) return clean
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr || "—"
  }
}

function formatTime(dtStr?: string | null) {
  if (!dtStr) return "—"
  try {
    const d = new Date(dtStr)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return "—"
  }
}

// ─── Main Doctor Desk Tab Component ──────────────────────────────────
export const OpdDoctorDeskTab: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

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

  // ─── Additional Filters State ──────────────────────────────────────
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(undefined)
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [activeConsultVisit, setActiveConsultVisit] = useState<OpdVisit | null>(null)
  const [selectedDrawerVisit, setSelectedDrawerVisit] = useState<OpdVisit | null>(null)
  const [printModalVisit, setPrintModalVisit] = useState<OpdVisit | null>(null)

  // Determine user role
  const roleStr = String(user?.role || user?.roles?.[0] || "").toUpperCase()
  const isAdmin = roleStr.includes("ADMIN") || roleStr.includes("SUPER")

  // Fetch departments & doctors for filter dropdowns
  const { data: deptData } = useQuery({
    queryKey: queryKeys.reception.departments,
    queryFn: receptionService.getDepartments,
    staleTime: 60_000,
  })

  const departments = useMemo(() => {
    if (Array.isArray(deptData)) return deptData
    if (Array.isArray((deptData as any)?.departments)) return (deptData as any).departments
    return []
  }, [deptData])

  const allDoctors = useMemo(() => {
    const list: any[] = []
    departments.forEach((d: any) => {
      if (Array.isArray(d.doctors)) {
        d.doctors.forEach((doc: any) => {
          if (!list.some((x) => x.id === doc.id)) list.push(doc)
        })
      }
    })
    return list
  }, [departments])

  // Compute Active Date Query Parameters
  const queryDateParams = useMemo(() => {
    if (dateMode === "today") return { date: todayStr }
    if (dateMode === "yesterday") return { date: yesterdayStr }
    if (dateMode === "last7") return { startDate: last7Str, endDate: todayStr }
    if (dateMode === "all") return { allDates: true }
    if (dateMode === "custom") return { date: customDate }
    return { date: todayStr }
  }, [dateMode, todayStr, yesterdayStr, last7Str, customDate])

  // Queue Query (Auto-refreshes every 25 seconds for today's queue)
  const {
    data: queueData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [...queryKeys.opd.queue, selectedDoctorId, selectedDeptId, queryDateParams],
    queryFn: () =>
      opdService.getQueue({
        doctorId: selectedDoctorId,
        departmentId: selectedDeptId,
        all: true,
        status: "all",
        ...queryDateParams,
      }),
    refetchInterval: dateMode === "today" ? 25_000 : false,
  })

  // Call Patient Mutation
  const callMutation = useMutation({
    mutationFn: (visitId: number) => opdService.callPatient(visitId, selectedDoctorId),
    onSuccess: (updated) => {
      toast.info(`Patient ${updated.patient_name || "Patient"} called to consultation cabin`)
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue })
      setActiveConsultVisit(updated)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to call patient")
    },
  })

  const rawQueue: OpdVisit[] = useMemo(() => {
    if (Array.isArray(queueData)) return queueData
    if (Array.isArray((queueData as any)?.data)) return (queueData as any).data
    return []
  }, [queueData])

  // Resilient Row Normalization & Filtering
  const filteredQueue = useMemo(() => {
    return rawQueue.filter((item) => {
      const pName = item.patient_name || item.patient?.name || ""
      const token = String(item.token_no || item.queue_token || item.opd_number || "")
      const uhid = item.uhid || item.patient?.uhid || ""
      const mobile = item.patient?.mobile || ""
      const complaint = Array.isArray(item.chief_complaint)
        ? item.chief_complaint.join(" ")
        : item.chief_complaint || item.visit_reason || ""
      const docName = item.doctor_name || item.doctor?.name || ""
      const deptName = item.department_name || item.department?.name || ""

      const matchesSearch =
        !search ||
        pName.toLowerCase().includes(search.toLowerCase()) ||
        token.toLowerCase().includes(search.toLowerCase()) ||
        uhid.toLowerCase().includes(search.toLowerCase()) ||
        mobile.toLowerCase().includes(search.toLowerCase()) ||
        complaint.toLowerCase().includes(search.toLowerCase()) ||
        docName.toLowerCase().includes(search.toLowerCase()) ||
        deptName.toLowerCase().includes(search.toLowerCase())

      const matchesDept =
        !selectedDeptId ||
        item.department_id === selectedDeptId ||
        item.department?.id === selectedDeptId

      const status = String(item.status).toLowerCase()
      const hasVitals = Boolean(item.has_vitals || item.latest_vital || item.latestVital)

      if (!matchesSearch || !matchesDept) return false

      if (statusFilter === "waiting") return status === "waiting"
      if (statusFilter === "vitals_ready") return status === "waiting" && hasVitals
      if (statusFilter === "triage_pending") return status === "waiting" && !hasVitals
      if (statusFilter === "in_consultation")
        return status === "called" || status === "in_consultation"
      if (statusFilter === "completed") return status === "done" || status === "completed"

      return true
    })
  }, [rawQueue, search, statusFilter, selectedDeptId])

  // ─── Pagination State ──────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Auto-reset page to 1 when filters or date change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, selectedDeptId, selectedDoctorId, dateMode, customDate])

  // Paginated Queue Slice
  const paginatedQueue = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredQueue.slice(start, start + pageSize)
  }, [filteredQueue, currentPage, pageSize])

  // Stats Counters
  const stats = useMemo(() => {
    return {
      waiting: rawQueue.filter((x) => String(x.status).toLowerCase() === "waiting").length,
      inConsultation: rawQueue.filter((x) => {
        const s = String(x.status).toLowerCase()
        return s === "called" || s === "in_consultation"
      }).length,
      completed: rawQueue.filter((x) => {
        const s = String(x.status).toLowerCase()
        return s === "done" || s === "completed"
      }).length,
      total: rawQueue.length,
    }
  }, [rawQueue])

  // Contextual Active Date Label
  const activeDateLabel = useMemo(() => {
    if (dateMode === "today") return `Today (${formatDisplayDate(todayStr)})`
    if (dateMode === "yesterday") return `Yesterday (${formatDisplayDate(yesterdayStr)})`
    if (dateMode === "last7")
      return `Last 7 Days (${formatDisplayDate(last7Str)} – ${formatDisplayDate(todayStr)})`
    if (dateMode === "all") return "All Historical Records"
    return `Date: ${formatDisplayDate(customDate)}`
  }, [dateMode, todayStr, yesterdayStr, last7Str, customDate])

  const isAnyFilterActive = Boolean(
    dateMode !== "today" ||
    selectedDoctorId !== undefined ||
    selectedDeptId !== undefined ||
    search.trim() !== "" ||
    statusFilter !== "all"
  )

  const handleResetFilters = () => {
    setDateMode("today")
    setCustomDate(todayStr)
    setSelectedDoctorId(undefined)
    setSelectedDeptId(undefined)
    setSearch("")
    setStatusFilter("all")
    setCurrentPage(1)
  }

  if (activeConsultVisit) {
    return (
      <DoctorConsultationWorkstationView
        visit={activeConsultVisit}
        onBack={() => setActiveConsultVisit(null)}
        onSuccess={() => {
          setActiveConsultVisit(null)
          refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-2.5">
      {/* ────────────────────────────────────────────────────────────────
          COMPACT CONTROL CENTER: DATE + FILTERS + STATUS PILLS
         ──────────────────────────────────────────────────────────────── */}
      <Card className="p-2.5 rounded-xl border shadow-xs bg-card space-y-2">
        {/* Row 1: Date Selector & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Date Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1 mr-0.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Date:
            </span>

            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 gap-0.5">
              <button
                type="button"
                onClick={() => setDateMode("today")}
                className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-all ${
                  dateMode === "today"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
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
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
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
                  ? "border-primary ring-1 ring-primary bg-primary/5 font-bold"
                  : "border-input"
              }`}
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {dateMode !== "today" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateMode("today")
                  setCustomDate(todayStr)
                }}
                className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 font-semibold px-2.5"
              >
                ↩ Today
              </Button>
            )}

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

        {/* Row 2: Search, Department, Doctor, Reset Filters */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between pt-2 border-t border-border/60">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Token #, patient, symptoms, UHID, mobile..."
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

          <div className="flex items-center gap-1.5 shrink-0">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={selectedDeptId || ""}
              onChange={(e) =>
                setSelectedDeptId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-xs sm:text-sm font-medium max-w-[170px] truncate"
            >
              <option value="">All Departments</option>
              {departments.map((dept: any) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {isAdmin && allDoctors.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                value={selectedDoctorId || ""}
                onChange={(e) =>
                  setSelectedDoctorId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-xs sm:text-sm font-medium max-w-[180px] truncate"
              >
                <option value="">All Hospital Doctors</option>
                {allDoctors.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isAnyFilterActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 text-xs gap-1.5 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 shrink-0 font-semibold rounded-lg px-3"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>

        {/* Row 3: High-Density Status Filter Badges */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40 gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-border p-1 bg-muted/20 flex-wrap gap-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({rawQueue.length})
            </button>
            <button
              onClick={() => setStatusFilter("vitals_ready")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                statusFilter === "vitals_ready"
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              🟢 Vitals Ready
            </button>
            <button
              onClick={() => setStatusFilter("triage_pending")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                statusFilter === "triage_pending"
                  ? "bg-amber-600 text-white font-semibold shadow-xs"
                  : "text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              🟡 Triage Pending
            </button>
            <button
              onClick={() => setStatusFilter("waiting")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                statusFilter === "waiting"
                  ? "bg-amber-500 text-white font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Waiting ({stats.waiting})
            </button>
            <button
              onClick={() => setStatusFilter("in_consultation")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                statusFilter === "in_consultation"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Consulting ({stats.inConsultation})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                statusFilter === "completed"
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Done ({stats.completed})
            </button>
          </div>

          <span className="text-xs text-muted-foreground font-medium">
            Showing <strong className="text-foreground">{filteredQueue.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredQueue.length)}</strong> of {filteredQueue.length} visits
          </span>
        </div>
      </Card>

      {/* ────────────────────────────────────────────────────────────────
          4. OPD PATIENT QUEUE TABLE
         ──────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-xs font-medium">Loading OPD consultation queue for {activeDateLabel}...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="p-10 rounded-xl border border-dashed border-border text-center space-y-3 bg-muted/10">
          <Calendar className="h-9 w-9 text-muted-foreground/40 mx-auto" />
          <div>
            <p className="text-sm font-bold text-foreground">
              No patients found for {activeDateLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              There are no patient visits matching the current date and filter criteria. You can easily switch to yesterday or view all records.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
            {dateMode !== "yesterday" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateMode("yesterday")}
                className="text-xs h-8 gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-semibold"
              >
                ⏪ View Yesterday ({formatDisplayDate(yesterdayStr)})
              </Button>
            )}

            {dateMode !== "today" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateMode("today")
                  setCustomDate(todayStr)
                }}
                className="text-xs h-8 gap-1.5"
              >
                ↩ Switch to Today
              </Button>
            )}

            {dateMode !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateMode("all")}
                className="text-xs h-8 gap-1.5"
              >
                🌐 View All Dates
              </Button>
            )}

            {isAnyFilterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs h-8 text-muted-foreground hover:text-foreground"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[900px]">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Token # & Date</th>
                  <th className="py-3 px-4">Patient Info</th>
                  <th className="py-3 px-4">Vitals Status</th>
                  <th className="py-3 px-4">Chief Complaint</th>
                  <th className="py-3 px-4">Department / Doctor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedQueue.map((row) => {
                  const status = String(row.status).toLowerCase()
                  const hasVitals = Boolean(row.has_vitals || row.latest_vital || row.latestVital)
                  const v = row.latest_vital || row.latestVital

                  return (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      {/* Token # & Date */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-sm font-bold text-primary block">
                          Token #{row.token_no || row.queue_token || row.opd_number}
                        </span>
                        <span className="text-xs text-muted-foreground block font-mono">
                          {row.opd_number}
                        </span>
                        {(row.visit_date || row.created_at) && (
                          <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-medium mt-0.5">
                            📅 {formatDisplayDate(row.visit_date || row.created_at)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground block">
                          {formatTime(row.check_in_time || row.created_at)}
                        </span>
                      </td>

                      {/* Patient Info */}
                      <td
                        className="py-3.5 px-4 cursor-pointer hover:bg-primary/5 transition-colors group"
                        onClick={() => setSelectedDrawerVisit(row)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                            {row.patient_name || row.patient?.name || "Patient"}
                          </span>
                          <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            View 360° →
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          {formatPatientAge(row.age || row.patient?.age, row.dob || row.patient?.dob)} /{" "}
                          {formatPatientGender(row.gender || row.patient?.gender)}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono block">
                          UHID: {row.uhid || row.patient?.uhid || "—"}
                        </span>
                      </td>

                      {/* Vitals Status */}
                      <td className="py-3.5 px-4">
                        {hasVitals && v ? (
                          <div className="space-y-1">
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs py-0.5 px-2">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Vitals Recorded
                            </Badge>
                            <div className="text-xs font-mono text-muted-foreground">
                              {v.blood_pressure_sys && v.blood_pressure_dia && (
                                <span>BP: {v.blood_pressure_sys}/{v.blood_pressure_dia} • </span>
                              )}
                              {v.pulse_rate && <span>Pulse: {v.pulse_rate}</span>}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-xs py-0.5 px-2 font-medium"
                            >
                              Pending Vitals
                            </Badge>
                            <button
                              type="button"
                              onClick={() => setActiveConsultVisit(row)}
                              className="text-xs text-primary hover:underline block font-semibold"
                            >
                              + Record Vitals
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Chief Complaint */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="text-sm text-foreground line-clamp-2 font-normal">
                          {row.chief_complaint || row.visit_reason || (
                            <span className="text-muted-foreground italic">General consultation</span>
                          )}
                        </span>
                      </td>

                      {/* Department / Doctor */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-foreground block text-sm">
                          {row.department_name || row.department?.name || "General"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.doctor_name || row.doctor?.name || "Doctor Cabin"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={row.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {status === "waiting" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveConsultVisit(row)}
                                className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5 text-xs h-8 font-semibold"
                                title="Open Doctor Consultation Desk"
                              >
                                <Stethoscope className="h-3.5 w-3.5" /> Consult
                              </Button>
                              <Button
                                size="sm"
                                disabled={callMutation.isPending}
                                onClick={() => callMutation.mutate(row.id || row.visit_id || 0)}
                                className="bg-primary text-primary-foreground gap-1.5 text-xs h-8 font-semibold"
                              >
                                {callMutation.isPending ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <PhoneCall className="h-3.5 w-3.5" />
                                )}
                                Call
                              </Button>
                            </>
                          )}

                          {(status === "called" || status === "in_consultation") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActiveConsultVisit(row)}
                              className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 font-bold gap-1.5 text-xs h-8"
                            >
                              <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                              Active Desk
                            </Button>
                          )}

                          {(status === "done" || status === "completed") && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveConsultVisit(row)}
                                className="border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 gap-1 text-xs h-8 font-semibold"
                                title="Edit Completed Prescription"
                              >
                                <Edit3 className="h-3.5 w-3.5" /> Edit Rx
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPrintModalVisit(row)}
                                className="border-primary/30 text-primary hover:bg-primary/10 gap-1 text-xs h-8 font-semibold"
                                title="Print / Reprint Official Prescription Slip"
                              >
                                <Printer className="h-3.5 w-3.5" /> Print Rx
                              </Button>
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs ml-1">
                                <CheckCircle2 className="h-4 w-4" /> Done
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          <Pagination
            currentPage={currentPage}
            totalRecords={filteredQueue.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize)
              setCurrentPage(1)
            }}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            recordLabel="visits"
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
          setActiveConsultVisit(v)
        }}
        onRecordVitals={(v) => {
          setSelectedDrawerVisit(null)
          setActiveConsultVisit(v)
        }}
        onCallPatient={(visitId) => callMutation.mutate(visitId)}
      />

      {/* Prescription Print Modal */}
      <PrescriptionPrintModal
        open={!!printModalVisit}
        onClose={() => setPrintModalVisit(null)}
        visit={printModalVisit}
      />
    </div>
  )
}
