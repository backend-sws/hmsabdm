import React, { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Search,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Building2,
  Stethoscope,
  X,
  RotateCcw,
  Printer,
  User,
  Clock,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Pagination } from "@/components/common/Pagination"
import { PatientInfoSlideOver } from "@/components/opd/PatientInfoSlideOver"
import { PrescriptionPrintModal } from "@/components/opd/PrescriptionPrintModal"
import { opdService } from "@/services/opdService"
import { receptionService } from "@/services/receptionService"
import { queryKeys } from "@/constants/queryKeys"
import { formatPatientAge, formatPatientGender } from "@/utils/patientUtils"
import type { OpdVisit } from "@/types/opd"

export const OpdHistoryTab: React.FC = () => {
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

  // ─── Search & Doctor/Dept Filters ──────────────────────────────────
  const [search, setSearch] = useState("")
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(undefined)
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined)

  // ─── Modal States ──────────────────────────────────────────────────
  const [selectedDrawerVisit, setSelectedDrawerVisit] = useState<OpdVisit | null>(null)
  const [printModalVisit, setPrintModalVisit] = useState<OpdVisit | null>(null)

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

  // Query Completed / All visits with active date and filters
  const {
    data: queueData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [...queryKeys.opd.queue, "history", selectedDoctorId, selectedDeptId, queryDateParams],
    queryFn: () =>
      opdService.getQueue({
        status: "all",
        all: true,
        doctorId: selectedDoctorId,
        departmentId: selectedDeptId,
        ...queryDateParams,
      }),
    refetchInterval: dateMode === "today" ? 30_000 : false,
  })

  const rawQueue: OpdVisit[] = useMemo(() => {
    if (Array.isArray(queueData)) return queueData
    if (Array.isArray((queueData as any)?.data)) return (queueData as any).data
    return []
  }, [queueData])

  // Filter for completed visits and apply search
  const completedList = useMemo(() => {
    return rawQueue.filter((item) => {
      const status = String(item.status || "").toLowerCase()
      const isDone = status === "done" || status === "completed"
      if (!isDone) return false

      if (!search.trim()) return true

      const query = search.toLowerCase()
      const pName = (item.patient_name || item.patient?.name || "").toLowerCase()
      const token = String(item.token_no || item.queue_token || item.opd_number || "").toLowerCase()
      const uhid = (item.uhid || item.patient?.uhid || "").toLowerCase()
      const mobile = (item.patient?.mobile || "").toLowerCase()
      const diag = (item.diagnosis || "").toLowerCase()
      const complaints = (
        Array.isArray(item.chief_complaint)
          ? item.chief_complaint.join(" ")
          : typeof item.chief_complaint === "string"
          ? item.chief_complaint
          : ""
      ).toLowerCase()
      const doctor = (item.doctor_name || item.doctor?.name || "").toLowerCase()
      const dept = (item.department_name || item.department?.name || "").toLowerCase()

      return (
        pName.includes(query) ||
        token.includes(query) ||
        uhid.includes(query) ||
        mobile.includes(query) ||
        diag.includes(query) ||
        complaints.includes(query) ||
        doctor.includes(query) ||
        dept.includes(query)
      )
    })
  }, [rawQueue, search])

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedDeptId, selectedDoctorId, dateMode, customDate])

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return completedList.slice(start, start + pageSize)
  }, [completedList, currentPage, pageSize])

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

  // Active Date Label for display
  const activeDateLabel = useMemo(() => {
    switch (dateMode) {
      case "today":
        return `Today (${formatDisplayDate(todayStr)})`
      case "yesterday":
        return `Yesterday (${formatDisplayDate(yesterdayStr)})`
      case "last7":
        return `Last 7 Days (${formatDisplayDate(last7Str)} – ${formatDisplayDate(todayStr)})`
      case "all":
        return "All Dates (Entire Hospital History)"
      case "custom":
        return `Calendar Date (${formatDisplayDate(customDate)})`
      default:
        return "Today"
    }
  }, [dateMode, todayStr, yesterdayStr, last7Str, customDate])

  const hasActiveFilters = Boolean(
    dateMode !== "today" ||
    search ||
    selectedDoctorId !== undefined ||
    selectedDeptId !== undefined
  )

  const handleResetFilters = () => {
    setDateMode("today")
    setCustomDate(todayStr)
    setSearch("")
    setSelectedDoctorId(undefined)
    setSelectedDeptId(undefined)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-2.5">
      {/* ────────────────────────────────────────────────────────────────
          COMPACT CONTROL CENTER: DATE + SEARCH + DOCTOR/DEPT FILTERS
         ──────────────────────────────────────────────────────────────── */}
      <Card className="p-2.5 rounded-xl border shadow-xs bg-card space-y-2">
        {/* Row 1: Date Quick Selectors & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-foreground flex items-center gap-1 mr-0.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Date:
            </span>

            <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40 gap-1">
              <button
                type="button"
                onClick={() => setDateMode("today")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  dateMode === "today"
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
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
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
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

            {/* Specific Date Picker */}
            <Input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value)
                setDateMode("custom")
              }}
              className={`h-8 w-36 text-xs font-mono px-2.5 rounded ${
                dateMode === "custom"
                  ? "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-500/5 font-bold"
                  : "border-input"
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">
              Completed: <strong className="text-foreground font-mono">{completedList.length}</strong>
            </span>

            {dateMode !== "today" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateMode("today")
                  setCustomDate(todayStr)
                }}
                className="h-8 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold px-2.5"
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
              title="Refresh Log"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Row 2: Search, Department, Doctor, Reset Filters */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between pt-1.5 border-t border-border/60">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Patient name, UHID, Token #, Mobile, Diagnosis, Doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-7 text-sm h-9 rounded-lg"
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
              className="h-9 rounded-lg border border-input bg-background px-2.5 py-1 text-xs sm:text-sm font-medium max-w-[160px] truncate"
            >
              <option value="">All Departments</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={selectedDoctorId || ""}
              onChange={(e) =>
                setSelectedDoctorId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="h-9 rounded-lg border border-input bg-background px-2.5 py-1 text-xs sm:text-sm font-medium max-w-[160px] truncate"
            >
              <option value="">All Hospital Doctors</option>
              {allDoctors.map((doc: any) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.name || doc.user?.name}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 text-xs sm:text-sm gap-1 text-muted-foreground hover:text-destructive shrink-0 px-2.5"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>
      </Card>

      {/* ────────────────────────────────────────────────────────────────
          3. COMPLETED CONSULTATIONS LIST & CARDS
         ──────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-xs">Loading completed consultations log...</p>
        </div>
      ) : completedList.length === 0 ? (
        <div className="p-12 rounded-xl border border-dashed border-border text-center space-y-3 bg-muted/10">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-foreground">
            No completed consultations found for {activeDateLabel}
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {hasActiveFilters
              ? "Try switching to 'Yesterday', selecting 'All Dates', or clearing your search filters to find past consultations."
              : "Completed doctor visits and issued prescriptions will be logged here."}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {dateMode !== "yesterday" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateMode("yesterday")}
                className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              >
                ⏪ View Yesterday's Log
              </Button>
            )}
            {dateMode !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateMode("all")}
                className="text-xs"
              >
                View All Hospital Dates
              </Button>
            )}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <strong>{completedList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, completedList.length)}</strong> of {completedList.length} completed consultation{completedList.length === 1 ? "" : "s"}
            </span>
            <span className="font-mono">{activeDateLabel}</span>
          </div>

          {paginatedList.map((visit) => {
            const complaints = Array.isArray(visit.chief_complaint)
              ? visit.chief_complaint.join(", ")
              : typeof visit.chief_complaint === "string"
              ? visit.chief_complaint
              : ""

            return (
              <Card
                key={visit.id}
                className="p-4 border bg-card hover:border-emerald-500/40 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    {/* Top Row: Token, Patient, Age/Gender, UHID, Date */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                        Token #{visit.token_no || visit.queue_token || visit.opd_number}
                      </Badge>

                      <button
                        type="button"
                        onClick={() => setSelectedDrawerVisit(visit)}
                        className="font-bold text-foreground text-sm hover:underline hover:text-primary text-left"
                      >
                        {visit.patient_name || visit.patient?.name || "Patient"}
                      </button>

                      <span className="text-xs text-muted-foreground">
                        ({formatPatientGender(visit.patient?.gender)}, {formatPatientAge(visit.patient?.age, visit.patient?.dob)})
                      </span>

                      <span className="text-xs text-muted-foreground font-mono">
                        UHID: {visit.uhid || visit.patient?.uhid || "—"}
                      </span>

                      {/* Visit Date Badge */}
                      <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground">
                        📅 {formatDisplayDate(visit.visit_date || (visit as any).created_at)}
                      </Badge>

                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Completed
                      </Badge>
                    </div>

                    {/* Middle Row: Doctor, Department, Diagnosis */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Doctor: <strong className="text-foreground">{visit.doctor_name || visit.doctor?.name || "—"}</strong>
                      </span>
                      <span>
                        Dept: <strong className="text-foreground">{visit.department_name || visit.department?.name || "—"}</strong>
                      </span>
                      {visit.diagnosis && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          Dx: <strong>{visit.diagnosis}</strong>
                        </span>
                      )}
                      {complaints && (
                        <span className="text-muted-foreground italic line-clamp-1">
                          Complaints: {complaints}
                        </span>
                      )}
                    </div>

                    {visit.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">
                        Notes: {visit.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions & Completion Time */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="text-right text-xs text-muted-foreground">
                      <span className="font-mono flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {visit.completed_at ? new Date(visit.completed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Completed"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDrawerVisit(visit)}
                        className="h-8 text-xs gap-1"
                        title="View Patient Info Drawer"
                      >
                        <User className="h-3.5 w-3.5" />
                        Details
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setPrintModalVisit(visit)}
                        className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        title="Print Prescription (Rx)"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print Rx
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}

          {/* History Pagination Bar */}
          <Pagination
            currentPage={currentPage}
            totalRecords={completedList.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize)
              setCurrentPage(1)
            }}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            recordLabel="consultations"
            className="rounded-xl border shadow-xs"
          />
        </div>
      )}

      {/* Patient Drawer Modal */}
      {selectedDrawerVisit && (
        <PatientInfoSlideOver
          open={Boolean(selectedDrawerVisit)}
          onClose={() => setSelectedDrawerVisit(null)}
          visit={selectedDrawerVisit}
        />
      )}

      {/* Prescription Print Modal */}
      {printModalVisit && (
        <PrescriptionPrintModal
          open={Boolean(printModalVisit)}
          onClose={() => setPrintModalVisit(null)}
          visit={printModalVisit}
        />
      )}
    </div>
  )
}
