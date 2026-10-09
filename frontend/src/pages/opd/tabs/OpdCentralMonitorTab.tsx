import React, { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Search,
  RefreshCw,
  Users,
  Stethoscope,
  Calendar,
  X,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Pagination } from "@/components/common/Pagination"
import { PatientInfoSlideOver } from "@/components/opd/PatientInfoSlideOver"
import { formatPatientAge, formatPatientGender } from "@/utils/patientUtils"
import { opdService } from "@/services/opdService"
import { receptionService } from "@/services/receptionService"
import { queryKeys } from "@/constants/queryKeys"
import type { OpdVisit } from "@/types/opd"

export const OpdCentralMonitorTab: React.FC = () => {
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

  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(undefined)
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
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



  // Departments & Doctors
  const { data: deptData } = useQuery({
    queryKey: queryKeys.reception.departments,
    queryFn: receptionService.getDepartments,
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

  // Facility-wide Queue Query
  const {
    data: queueData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [...queryKeys.opd.queue, "monitor", selectedDoctorId, selectedDeptId, queryDateParams],
    queryFn: () =>
      opdService.getQueue({
        doctorId: selectedDoctorId,
        departmentId: selectedDeptId,
        all: true,
        status: "all",
        ...queryDateParams,
      }),
    refetchInterval: dateMode === "today" ? 20_000 : false,
  })

  const rawQueue: OpdVisit[] = useMemo(() => {
    if (Array.isArray(queueData)) return queueData
    if (Array.isArray((queueData as any)?.data)) return (queueData as any).data
    return []
  }, [queueData])

  // Filter
  const filteredQueue = useMemo(() => {
    return rawQueue.filter((item) => {
      const pName = item.patient_name || item.patient?.name || ""
      const token = String(item.token_no || item.queue_token || item.opd_number || "")
      const uhid = item.uhid || item.patient?.uhid || ""
      const complaint = Array.isArray(item.chief_complaint)
        ? item.chief_complaint.join(" ")
        : item.chief_complaint || item.visit_reason || ""

      const matchesSearch =
        !search ||
        pName.toLowerCase().includes(search.toLowerCase()) ||
        token.toLowerCase().includes(search.toLowerCase()) ||
        uhid.toLowerCase().includes(search.toLowerCase()) ||
        complaint.toLowerCase().includes(search.toLowerCase())

      const status = String(item.status).toLowerCase()

      if (statusFilter === "waiting") return matchesSearch && status === "waiting"
      if (statusFilter === "in_consultation")
        return matchesSearch && (status === "called" || status === "in_consultation")
      if (statusFilter === "completed") return matchesSearch && (status === "done" || status === "completed")

      return matchesSearch
    })
  }, [rawQueue, search, statusFilter])

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Auto-reset page on filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, selectedDeptId, selectedDoctorId, dateMode, customDate])

  const paginatedQueue = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredQueue.slice(start, start + pageSize)
  }, [filteredQueue, currentPage, pageSize])

  // Stats
  const stats = useMemo(() => {
    return {
      waiting: rawQueue.filter((x) => String(x.status).toLowerCase() === "waiting").length,
      consulting: rawQueue.filter((x) => {
        const s = String(x.status).toLowerCase()
        return s === "called" || s === "in_consultation"
      }).length,
      completed: rawQueue.filter((x) => {
        const s = String(x.status).toLowerCase()
        return s === "done" || s === "completed"
      }).length,
      vitalsDone: rawQueue.filter((x) => Boolean(x.has_vitals || x.latest_vital || x.latestVital)).length,
      total: rawQueue.length,
    }
  }, [rawQueue])

  return (
    <div className="space-y-2.5">
      {/* ────────────────────────────────────────────────────────────────
          COMPACT CONTROL CENTER: DATE + CLICKABLE KPI CHIPS + FILTERS
         ──────────────────────────────────────────────────────────────── */}
      <Card className="p-2.5 rounded-xl border shadow-xs bg-card space-y-2">
        {/* Row 1: Date Quick Pills, Calendar, Clickable Metrics & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Date selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1 mr-0.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Date:
            </span>

            <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40 gap-1">
              <button
                type="button"
                onClick={() => setDateMode("today")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
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

          {/* Right: Inline Clickable Analytics Badges & Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Clickable Quick Filter Chips */}
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                statusFilter === "all"
                  ? "bg-foreground text-background border-foreground shadow-xs"
                  : "bg-muted/50 text-foreground border-border hover:bg-muted"
              }`}
            >
              <span>Total</span>
              <strong className="font-mono">{stats.total}</strong>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("waiting")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                statusFilter === "waiting"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              }`}
            >
              <span>Waiting</span>
              <strong className="font-mono">{stats.waiting}</strong>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("in_consultation")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                statusFilter === "in_consultation"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
              }`}
            >
              <span>In Cabin</span>
              <strong className="font-mono">{stats.consulting}</strong>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                statusFilter === "completed"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              }`}
            >
              <span>Done</span>
              <strong className="font-mono">{stats.completed}</strong>
            </button>

            {/* Return to Today */}
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

        {/* Row 2: Search, Department, Doctor, Status Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center pt-2 border-t border-border/60">
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patient, token, UHID, complaints..."
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

          <div className="sm:col-span-3">
            <select
              value={selectedDeptId || ""}
              onChange={(e) => setSelectedDeptId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs sm:text-sm font-medium"
            >
              <option value="">All Departments</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedDoctorId || ""}
              onChange={(e) => setSelectedDoctorId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs sm:text-sm font-medium"
            >
              <option value="">All Doctors</option>
              {allDoctors.map((doc: any) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs sm:text-sm font-medium"
            >
              <option value="all">All Statuses ({rawQueue.length})</option>
              <option value="waiting">Waiting ({stats.waiting})</option>
              <option value="in_consultation">In Cabin ({stats.consulting})</option>
              <option value="completed">Done ({stats.completed})</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Facility Queue Table */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-xs">Streaming facility queues...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="p-12 rounded-xl border border-dashed border-border text-center space-y-2 bg-muted/10">
          <Users className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No matching OPD records</p>
          <p className="text-xs text-muted-foreground">Adjust filters to display active patient queues.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[900px]">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Token #</th>
                  <th className="py-3 px-4">Patient Profile</th>
                  <th className="py-3 px-4">Department & Doctor Cabin</th>
                  <th className="py-3 px-4">Triage Vitals</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Chief Complaint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedQueue.map((row) => {
                  const hasVitals = Boolean(row.has_vitals || row.latest_vital || row.latestVital)
                  const v = row.latest_vital || row.latestVital

                  return (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-sm font-bold text-primary block">
                          Token #{row.token_no || row.queue_token || row.opd_number}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono block">
                          {row.opd_number}
                        </span>
                        {(row.visit_date || (row as any).created_at) && (
                          <Badge variant="secondary" className="mt-1 text-xs font-mono inline-block">
                            📅 {formatDisplayDate(row.visit_date || (row as any).created_at)}
                          </Badge>
                        )}
                      </td>

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
                          {formatPatientGender(row.gender || row.patient?.gender)} • UHID: {row.uhid || row.patient?.uhid || "—"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-foreground block text-sm">
                          {row.department_name || row.department?.name || "General"}
                        </span>
                        <span className="text-xs text-primary flex items-center gap-1 font-medium mt-0.5">
                          <Stethoscope className="h-3.5 w-3.5" />{" "}
                          {(() => {
                            const doc = (row.doctor_name || row.doctor?.name || "Assigned Doctor").trim()
                            return doc.toLowerCase().startsWith("dr.") || doc.toLowerCase().startsWith("dr ")
                              ? doc
                              : `Dr. ${doc}`
                          })()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {hasVitals && v ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs py-0.5 px-2">
                            ✓ BP {v.blood_pressure_sys}/{v.blood_pressure_dia || "--"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-xs py-0.5 px-2">
                            Pending
                          </Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={row.status} />
                      </td>

                      <td className="py-3.5 px-4 max-w-xs text-foreground/90">
                        <span className="line-clamp-2 text-sm font-normal">
                          {row.chief_complaint || row.visit_reason || "—"}
                        </span>
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
      />
    </div>
  )
}
