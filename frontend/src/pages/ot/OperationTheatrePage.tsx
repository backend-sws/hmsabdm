import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { otService } from "@/services/otService"
import type { OtSchedule, OtScheduleStatus } from "@/types/ot"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import {
  Scissors,
  Plus,
  Calendar,
  Clock,
  ShieldCheck,
  Printer,
  Search,
  RefreshCw,
} from "lucide-react"
import { ScheduleSurgeryModal } from "@/components/ot/ScheduleSurgeryModal"
import { WhoSurgicalSafetyModal } from "@/components/ot/WhoSurgicalSafetyModal"
import { PrintOtChecklistModal } from "@/components/ot/PrintOtChecklistModal"
import { PageHeader } from "@/components/common/PageHeader"

export const OperationTheatrePage: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [selectedTheatreId, setSelectedTheatreId] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [checklistModalOpen, setChecklistModalOpen] = useState(false)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<OtSchedule | null>(null)

  // 1. Fetch Theatres
  const { data: theatres = [] } = useQuery({
    queryKey: ["ot", "theatres"],
    queryFn: () => otService.getTheatres(),
    refetchInterval: 15_000,
  })

  // 2. Fetch Schedules
  const {
    data: schedules = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["ot", "schedules", selectedDate, selectedTheatreId, selectedStatus],
    queryFn: () =>
      otService.getSchedules({
        date: selectedDate || undefined,
        theatre_id: selectedTheatreId ? Number(selectedTheatreId) : undefined,
        status: selectedStatus || undefined,
      }),
    refetchInterval: 15_000,
  })

  // Status transition mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OtScheduleStatus }) =>
      otService.updateSchedule(id, { status }),
    onSuccess: (updated) => {
      toast.success(`Surgery status updated to: ${updated.status}`)
      queryClient.invalidateQueries({ queryKey: ["ot", "schedules"] })
      queryClient.invalidateQueries({ queryKey: ["ot", "theatres"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update surgery status")
    },
  })

  // Filter schedules by client search query
  const filteredSchedules = schedules.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      s.patient?.name?.toLowerCase().includes(q) ||
      s.patient?.uhid?.toLowerCase().includes(q) ||
      s.procedure_name?.toLowerCase().includes(q) ||
      s.booking_number?.toLowerCase().includes(q) ||
      s.primary_surgeon?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* ── Standard Page Header ── */}
      <PageHeader
        title="Operation Theatres & Surgical Desk"
        subtitle="Live Operation Theatre status, surgical case bookings, and WHO Surgical Safety Checklist sign-off."
        icon={Scissors}
        badge={
          <Badge variant="outline" className="border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs">
            WHO & NABH Accredited
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-1.5 text-xs h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={() => setScheduleModalOpen(true)}
              className="gap-1.5 text-xs h-9 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs"
            >
              <Plus className="h-4 w-4" /> Book New Surgery
            </Button>
          </div>
        }
      />

      {/* ── Live Theatre Status Cards Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {theatres.map((theatre) => {
          const isAvailable = theatre.status === "available"
          const isInUse = theatre.status === "in_use"
          const isCleaning = theatre.status === "cleaning"

          return (
            <Card
              key={theatre.id}
              className={`border-2 transition-all shadow-2xs ${
                isInUse
                  ? "border-amber-400/80 bg-amber-50/20 dark:bg-amber-950/20"
                  : isCleaning
                  ? "border-cyan-400/80 bg-cyan-50/20 dark:bg-cyan-950/20"
                  : "border-border/80 bg-card hover:border-primary/40"
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-muted-foreground">
                        {theatre.code || "OT"}
                      </span>
                      {theatre.floor && (
                        <span className="text-[10px] text-muted-foreground">• {theatre.floor}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-foreground line-clamp-1">{theatre.name}</h3>
                  </div>

                  <Badge
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isInUse
                        ? "bg-amber-600 text-white animate-pulse"
                        : isCleaning
                        ? "bg-cyan-600 text-white"
                        : isAvailable
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-600 text-white"
                    }`}
                  >
                    {theatre.status === "in_use"
                      ? "In Surgery"
                      : theatre.status === "cleaning"
                      ? "Sanitizing"
                      : theatre.status === "available"
                      ? "Available"
                      : "Maintenance"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                  <span className="text-muted-foreground">Today's Surgeries:</span>
                  <span className="font-bold font-mono text-foreground">
                    {theatre.today_surgeries_count ?? 0} Cases
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="p-3 sm:p-4 rounded-xl border border-border bg-card shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              className="pl-9 text-xs sm:text-sm h-9"
              placeholder="Search by patient, procedure, surgeon, or booking..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date */}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="date"
                className="h-9 text-xs font-mono w-36"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Quick Today Button */}
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 gap-0.5">
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                  selectedDate === new Date().toISOString().split("T")[0]
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                  selectedDate === ""
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Dates
              </button>
            </div>

            {/* Theatre Filter */}
            <div className="w-full sm:w-44">
              <Select value={selectedTheatreId} onValueChange={(val) => setSelectedTheatreId(val)}>
                <SelectItem value="">All Theatres</SelectItem>
                {theatres.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-36">
              <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val)}>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="pre_op_ready">Pre-Op Ready</SelectItem>
                <SelectItem value="in_theatre">In Theatre</SelectItem>
                <SelectItem value="recovery">PACU Recovery</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="postponed">Postponed</SelectItem>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Schedules List Table ── */}
      <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Surgical Case Roster
            </span>
            <Badge variant="secondary" className="font-mono text-xs">
              {filteredSchedules.length} Surgeries
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs">Loading surgical case bookings...</span>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Scissors className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No surgical cases found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              There are no surgeries scheduled for the selected filters. Click below to book an OT case.
            </p>
            <Button
              size="sm"
              onClick={() => setScheduleModalOpen(true)}
              className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-4 w-4" /> Book Surgery
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border">
                <tr>
                  <th className="py-3 px-4">Booking & Time</th>
                  <th className="py-3 px-4">Patient Demographics</th>
                  <th className="py-3 px-4">Surgery / Procedure</th>
                  <th className="py-3 px-4">Theatre & Team</th>
                  <th className="py-3 px-4">WHO Safety Checklist</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSchedules.map((item) => {
                  const checklist = item.checklist_record
                  const signInDone = checklist?.sign_in_completed
                  const timeOutDone = checklist?.time_out_completed
                  const signOutDone = checklist?.sign_out_completed

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* Booking & Time */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-foreground block">
                            {item.booking_number}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />
                            {item.scheduled_start_time || "09:00"}
                            {item.scheduled_end_time ? ` - ${item.scheduled_end_time}` : ""}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            {item.surgery_date ? new Date(item.surgery_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : ""}
                          </span>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground text-xs">
                              {item.patient?.name}
                            </span>
                            {item.patient?.blood_group && (
                              <Badge variant="outline" className="text-[10px] font-mono px-1 py-0 h-4">
                                {item.patient.blood_group}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono block">
                            {item.patient?.uhid}
                          </span>
                          {item.ipd_admission && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 block">
                              IPD #{item.ipd_admission.ipd_number} • {item.ipd_admission.ward?.name || "Ward"} (Bed {item.ipd_admission.bed?.bed_number || "-"})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Procedure */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground block">
                            {item.procedure_name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={`text-[9px] uppercase px-1.5 py-0 h-4 ${
                                item.priority === "emergency"
                                  ? "bg-rose-600 text-white"
                                  : item.priority === "urgent"
                                  ? "bg-amber-600 text-white"
                                  : "bg-blue-600 text-white"
                              }`}
                            >
                              {item.priority}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground uppercase font-mono">
                              Anesth: {item.anesthesia_type}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Theatre & Team */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-purple-700 dark:text-purple-400 text-xs block">
                            {item.operation_theatre?.name || "OT Not Assigned"}
                          </span>
                          <span className="text-[11px] text-muted-foreground block">
                            Surgeon: Dr. {item.primary_surgeon?.name || "-"}
                          </span>
                          {item.anesthetist && (
                            <span className="text-[10px] text-muted-foreground block">
                              Anesth: Dr. {item.anesthetist.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* WHO Safety Checklist */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                signInDone
                                  ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              1. Sign In {signInDone ? "✓" : "○"}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                timeOutDone
                                  ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              2. Time Out {timeOutDone ? "✓" : "○"}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                signOutDone
                                  ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              3. Sign Out {signOutDone ? "✓" : "○"}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] text-blue-600 dark:text-blue-400 p-0 hover:bg-transparent flex items-center gap-1"
                            onClick={() => {
                              setSelectedSchedule(item)
                              setChecklistModalOpen(true)
                            }}
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Open Checklist Form
                          </Button>
                        </div>
                      </td>

                      {/* Current Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <Badge
                            className={`text-[10px] uppercase font-bold tracking-wider ${
                              item.status === "in_theatre"
                                ? "bg-amber-600 text-white animate-pulse"
                                : item.status === "recovery"
                                ? "bg-indigo-600 text-white"
                                : item.status === "completed"
                                ? "bg-emerald-600 text-white"
                                : item.status === "pre_op_ready"
                                ? "bg-sky-600 text-white"
                                : "bg-zinc-600 text-white"
                            }`}
                          >
                            {item.status.replace("_", " ")}
                          </Badge>

                          {/* Quick Workflow Stepper */}
                          <div className="flex items-center gap-1 pt-1">
                            {item.status === "booked" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 text-sky-600 border-sky-300"
                                onClick={() => updateStatusMutation.mutate({ id: item.id, status: "pre_op_ready" })}
                              >
                                Pre-Op Ready
                              </Button>
                            )}
                            {item.status === "pre_op_ready" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 text-amber-600 border-amber-300"
                                onClick={() => updateStatusMutation.mutate({ id: item.id, status: "in_theatre" })}
                              >
                                Into OT
                              </Button>
                            )}
                            {item.status === "in_theatre" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 text-indigo-600 border-indigo-300"
                                onClick={() => updateStatusMutation.mutate({ id: item.id, status: "recovery" })}
                              >
                                To PACU
                              </Button>
                            )}
                            {item.status === "recovery" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 text-emerald-600 border-emerald-300"
                                onClick={() => updateStatusMutation.mutate({ id: item.id, status: "completed" })}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400"
                            onClick={() => {
                              setSelectedSchedule(item)
                              setPrintModalOpen(true)
                            }}
                          >
                            <Printer className="h-3.5 w-3.5" /> Dossier
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <ScheduleSurgeryModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSuccess={() => {
          refetch()
        }}
      />

      {selectedSchedule && (
        <WhoSurgicalSafetyModal
          isOpen={checklistModalOpen}
          onClose={() => setChecklistModalOpen(false)}
          schedule={selectedSchedule}
          onSuccess={() => {
            refetch()
          }}
          onOpenPrint={() => {
            setChecklistModalOpen(false)
            setPrintModalOpen(true)
          }}
        />
      )}

      {selectedSchedule && (
        <PrintOtChecklistModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          scheduleId={selectedSchedule.id}
        />
      )}
    </div>
  )
}
export default OperationTheatrePage
