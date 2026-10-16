import React, { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Siren,
  AlertTriangle,
  HeartPulse,
  Activity,
  UserX,
  FileText,
  ShieldAlert,
  Clock,
  Search,
  RefreshCw,
  Plus,
  Bed,
  CheckCircle2,
  Stethoscope,
  ChevronRight,
  UserCheck,
  Scissors,
  FlaskConical,
  Pill,
} from "lucide-react"

import { PageHeader } from "@/components/common/PageHeader"
import { StatCardsRow } from "@/components/common/stat-cards-row"
import { DataTable, type Column } from "@/components/common/DataTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import {
  EmergencyAdmitModal,
  EmergencyStatusModal,
  EmergencyPatientLinkModal,
  EmergencyMlcModal,
  EmergencyDetailModal,
} from "@/components/emergency"
import { ScheduleSurgeryModal } from "@/components/ot/ScheduleSurgeryModal"
import { CreateIpdLabOrderModal } from "@/components/lab/CreateIpdLabOrderModal"
import { CreateWardIndentModal } from "@/components/pharmacy/CreateWardIndentModal"

import { emergencyService } from "@/services/emergencyService"
import { queryKeys } from "@/constants/queryKeys"
import type {
  EmergencyTriage,
  PriorityLevel,
  EmergencyStatus,
  MlcSlipData,
} from "@/types/emergency"

export const EmergencyDeskPage: React.FC = () => {

  // ─── Filter States ──────────────────────────────────────────────────
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | "all">("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [mlcFilter, setMlcFilter] = useState<boolean | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)

  // ─── Modal States ────────────────────────────────────────────────────
  const [admitModalOpen, setAdmitModalOpen] = useState(false)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [mlcModalOpen, setMlcModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const [selectedTriage, setSelectedTriage] = useState<EmergencyTriage | null>(null)
  const [selectedTriageForOt, setSelectedTriageForOt] = useState<EmergencyTriage | null>(null)
  const [selectedTriageForLab, setSelectedTriageForLab] = useState<EmergencyTriage | null>(null)
  const [selectedTriageForIndent, setSelectedTriageForIndent] = useState<EmergencyTriage | null>(null)
  const [mlcSlipData, setMlcSlipData] = useState<MlcSlipData | null>(null)

  // ─── Queries ────────────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    return {
      priority_level: priorityFilter === "all" ? undefined : priorityFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      is_mlc: mlcFilter,
      search: searchTerm || undefined,
      page: currentPage,
      per_page: 15,
    }
  }, [priorityFilter, statusFilter, mlcFilter, searchTerm, currentPage])

  const {
    data: triageResponse,
    isLoading: triagesLoading,
    refetch: refetchTriages,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.emergency.triages(queryParams),
    queryFn: () => emergencyService.getTriages(queryParams),
    refetchInterval: 15000, // Live casualty queue polling every 15s
  })

  const counters = triageResponse?.counters
  const triagesList = triageResponse?.triages?.data || []
  const pagination = triageResponse?.triages

  // ─── Fetch MLC Slip ──────────────────────────────────────────────────
  const handleOpenMlcSlip = async (triage: EmergencyTriage) => {
    setSelectedTriage(triage)
    try {
      const slip = await emergencyService.getMlcSlip(triage.id)
      setMlcSlipData(slip)
      setMlcModalOpen(true)
    } catch (err: any) {
      toast.error(err.message || "Failed to load MLC slip")
    }
  }

  // ─── Table Columns ───────────────────────────────────────────────────
  const columns: Column<EmergencyTriage>[] = [
    {
      key: "priority",
      header: "ESI Priority",
      className: "w-[120px]",
      cell: (row) => {
        if (row.priority_level === "red") {
          return (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold tracking-wider uppercase">
                RED (P1)
              </Badge>
            </div>
          )
        }
        if (row.priority_level === "yellow") {
          return (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold tracking-wider uppercase">
                YELLOW (P2)
              </Badge>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold tracking-wider uppercase">
              GREEN (P3)
            </Badge>
          </div>
        )
      },
    },
    {
      key: "patient",
      header: "Patient & Identification",
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">
              {row.patient_name || row.patient?.name || "Unknown Patient"}
            </span>
            {row.is_unknown_patient && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-300">
                <UserX className="h-2.5 w-2.5 mr-0.5 inline" /> Temp
              </Badge>
            )}
            {row.is_mlc && (
              <Badge className="bg-purple-600/15 text-purple-700 dark:text-purple-300 border-purple-400/30 text-[9px] px-1 py-0">
                ⚖️ MLC
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
            <span>UHID: {row.uhid || row.patient?.uhid || "Pending"}</span>
            <span>•</span>
            <span>Triage: {row.triage_number}</span>
            {row.gender && <span>• {row.gender}</span>}
            {row.approximate_age && <span>• {row.approximate_age} Y</span>}
          </div>
        </div>
      ),
    },
    {
      key: "clinical",
      header: "Clinical Presentation",
      cell: (row) => (
        <div className="space-y-1 max-w-[260px]">
          <div className="text-xs font-medium text-foreground line-clamp-1">
            {row.chief_complaint || "No chief complaint recorded"}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            {row.gcs_score && (
              <span className="bg-muted px-1.5 py-0.5 rounded font-mono font-bold text-foreground">
                GCS: {row.gcs_score}/15
              </span>
            )}
            {row.consciousness_level && (
              <span className="bg-muted px-1.5 py-0.5 rounded capitalize text-muted-foreground">
                {row.consciousness_level}
              </span>
            )}
            {row.initial_vitals?.spo2 && (
              <span className="bg-sky-500/10 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded font-mono">
                SpO2: {row.initial_vitals.spo2}%
              </span>
            )}
            {row.initial_vitals?.bp_systolic && (
              <span className="bg-rose-500/10 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-mono">
                BP: {row.initial_vitals.bp_systolic}/{row.initial_vitals.bp_diastolic || "--"}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Bed / Doctor",
      cell: (row) => (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-foreground font-medium">
            <Bed className="h-3.5 w-3.5 text-muted-foreground" />
            {row.ward?.name ? (
              <span>
                {row.ward.name} • Bed #{row.bed?.bed_number || "--"}
              </span>
            ) : (
              <span className="text-muted-foreground italic">Casualty Bay</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Stethoscope className="h-3 w-3 text-muted-foreground" />
            <span>{row.doctor?.name || "Casualty MO"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[130px]",
      cell: (row) => {
        const statusMap: Record<EmergencyStatus, { label: string; color: string }> = {
          under_treatment: { label: "Under Treatment", color: "bg-rose-500/15 text-rose-700 border-rose-500/30" },
          stabilized: { label: "Stabilized", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
          admitted_to_ipd: { label: "Admitted IPD", color: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
          transferred_external: { label: "Transferred", color: "bg-purple-500/15 text-purple-700 border-purple-500/30" },
          discharged: { label: "Discharged", color: "bg-slate-500/15 text-slate-700 border-slate-500/30" },
          brought_dead: { label: "Brought Dead", color: "bg-zinc-800 text-white border-zinc-900" },
          expired: { label: "Expired", color: "bg-zinc-800 text-white border-zinc-900" },
        }
        const config = statusMap[row.status] || { label: row.status, color: "bg-muted text-foreground" }
        return (
          <div className="space-y-1">
            <Badge className={`${config.color} text-[10px] font-semibold border`}>
              {config.label}
            </Badge>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
              <Clock className="h-2.5 w-2.5" />
              <span>
                {new Date(row.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[240px] text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1 flex-wrap">
          {/* Emergency OT Surgery Requisition */}
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-[11px] font-bold gap-1 bg-purple-700 hover:bg-purple-800 text-white shadow-xs"
            onClick={() => setSelectedTriageForOt(row)}
            title="Rush Patient to Operation Theatre & Book STAT Emergency Surgery"
          >
            <Scissors className="h-3.5 w-3.5" /> ⚡ Rush to OT
          </Button>

          {/* Bedside STAT Lab Requisition */}
          {row.ipd_admission_id && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-1.5 text-[10px] gap-1 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              onClick={() => setSelectedTriageForLab(row)}
              title="Order STAT Bedside Lab Investigations"
            >
              <FlaskConical className="h-3 w-3" /> Lab
            </Button>
          )}

          {/* Crash Cart / STAT Pharmacy Requisition */}
          {row.ipd_admission_id && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-1.5 text-[10px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              onClick={() => setSelectedTriageForIndent(row)}
              title="Request STAT Emergency Drugs from Pharmacy"
            >
              <Pill className="h-3 w-3" /> Rx
            </Button>
          )}

          {/* MLC Slip Button if Medico-Legal */}
          {row.is_mlc && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-1.5 text-[10px] gap-1 text-purple-700 dark:text-purple-300 border-purple-400/40 hover:bg-purple-500/10"
              onClick={() => handleOpenMlcSlip(row)}
              title="Print Police Intimation Memo"
            >
              <FileText className="h-3 w-3" /> Memo
            </Button>
          )}

          {/* Identity Link button if unknown patient */}
          {row.is_unknown_patient && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-1.5 text-[10px] gap-1 text-amber-700 dark:text-amber-400 border-amber-400/40 hover:bg-amber-500/10"
              onClick={() => {
                setSelectedTriage(row)
                setLinkModalOpen(true)
              }}
              title="Post-stabilization Identity Linking (KYC/ABHA)"
            >
              <UserCheck className="h-3 w-3" /> KYC
            </Button>
          )}

          {/* Status Update Button */}
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-[11px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90"
            onClick={() => {
              setSelectedTriage(row)
              setStatusModalOpen(true)
            }}
          >
            Update
          </Button>

          {/* Quick View Button */}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => {
              setSelectedTriage(row)
              setDetailModalOpen(true)
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* ────────────────────────────────────────────────────────────────
          TOP BAR: PAGE HEADER & ACTIONS
         ──────────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Emergency & Trauma Triage Desk"
        subtitle="Fast-track 5-second casualty admissions, ESI priority tagging, unknown casualty management & MLC police intimations"
        badgeText="Live Casualty"
        badgeVariant="destructive"
        icon={Siren}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchTriages()}
              disabled={isRefetching}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md shadow-rose-500/20"
              onClick={() => setAdmitModalOpen(true)}
            >
              <Plus className="h-4 w-4" /> ⚡ Fast-Track ER Admit (5s)
            </Button>
          </div>
        }
      />

      {/* ────────────────────────────────────────────────────────────────
          EMERGENCY PRIORITY COUNTERS (UNIFIED STATCARDSROW)
         ──────────────────────────────────────────────────────────────── */}
      <StatCardsRow
        columns={6}
        stats={[
          {
            title: "RED (P1)",
            value: counters?.red_priority ?? 0,
            description: "Resuscitation / Immediate",
            icon: <Siren className="h-5 w-5 text-rose-600 animate-pulse" />,
            colorScheme: "rose",
            onClick: () => setPriorityFilter(priorityFilter === "red" ? "all" : "red"),
            active: priorityFilter === "red",
          },
          {
            title: "YELLOW (P2)",
            value: counters?.yellow_priority ?? 0,
            description: "Urgent / Emergent",
            icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
            colorScheme: "amber",
            onClick: () => setPriorityFilter(priorityFilter === "yellow" ? "all" : "yellow"),
            active: priorityFilter === "yellow",
          },
          {
            title: "GREEN (P3)",
            value: counters?.green_priority ?? 0,
            description: "Less Urgent / Stable",
            icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
            colorScheme: "emerald",
            onClick: () => setPriorityFilter(priorityFilter === "green" ? "all" : "green"),
            active: priorityFilter === "green",
          },
          {
            title: "ACTIVE IN ER",
            value: counters?.active_in_er ?? 0,
            description: "Under Treatment",
            icon: <Activity className="h-5 w-5" />,
            colorScheme: "cyan",
            onClick: () => setStatusFilter(statusFilter === "under_treatment" ? "all" : "under_treatment"),
            active: statusFilter === "under_treatment",
          },
          {
            title: "MLC CASES",
            value: counters?.mlc_cases ?? 0,
            description: "Medico-Legal Intimations",
            icon: <ShieldAlert className="h-5 w-5" />,
            colorScheme: "purple",
            onClick: () => setMlcFilter(mlcFilter === true ? undefined : true),
            active: mlcFilter === true,
          },
          {
            title: "TODAY TOTAL",
            value: counters?.total_today ?? 0,
            description: "Casualty Footfall",
            icon: <HeartPulse className="h-5 w-5" />,
            colorScheme: "blue",
            onClick: () => {
              setPriorityFilter("all")
              setStatusFilter("all")
              setMlcFilter(undefined)
            },
            active: priorityFilter === "all" && statusFilter === "all" && mlcFilter === undefined,
          },
        ]}
      />

      {/* ────────────────────────────────────────────────────────────────
          FILTER & SEARCH CONTROLS
         ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Priority filter pills */}
          <div className="inline-flex rounded-lg border border-input p-0.5 bg-muted/40">
            <button
              onClick={() => setPriorityFilter("all")}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                priorityFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              All Priorities
            </button>
            <button
              onClick={() => setPriorityFilter("red")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-semibold transition-all ${
                priorityFilter === "red" ? "bg-rose-600 text-white shadow-xs" : "text-rose-600 hover:text-rose-700"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>Red (P1)</span>
            </button>
            <button
              onClick={() => setPriorityFilter("yellow")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-semibold transition-all ${
                priorityFilter === "yellow" ? "bg-amber-600 text-white shadow-xs" : "text-amber-600 hover:text-amber-700"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Yellow (P2)</span>
            </button>
            <button
              onClick={() => setPriorityFilter("green")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-semibold transition-all ${
                priorityFilter === "green" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-600 hover:text-emerald-700"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Green (P3)</span>
            </button>
          </div>

          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs sm:text-sm rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="under_treatment">Under Treatment</option>
            <option value="stabilized">Stabilized</option>
            <option value="admitted_to_ipd">Admitted to IPD</option>
            <option value="transferred_external">Transferred</option>
            <option value="discharged">Discharged</option>
            <option value="brought_dead">Brought Dead</option>
          </select>

          {/* MLC Checkbox button */}
          <Button
            variant={mlcFilter ? "default" : "outline"}
            size="sm"
            className={`h-8 text-xs gap-1.5 ${
              mlcFilter ? "bg-purple-600 hover:bg-purple-700 text-white" : ""
            }`}
            onClick={() => setMlcFilter(mlcFilter ? undefined : true)}
          >
            ⚖️ {mlcFilter ? "Showing MLC Only" : "Filter MLC"}
          </Button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search UHID, Triage #, Patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          CASUALTY TRIAGE DATA TABLE
         ──────────────────────────────────────────────────────────────── */}
      <DataTable
        title="Live Casualty & Triage Cases"
        columns={columns}
        data={triagesList}
        isLoading={triagesLoading}
        rowKey="id"
        emptyTitle="No Emergency Cases Found"
        emptyDescription="No casualty admissions match your current filter parameters."
        currentPage={pagination?.current_page || 1}
        pageSize={pagination?.per_page || 15}
        totalRecords={pagination?.total || 0}
        lastPage={pagination?.last_page || 1}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {/* ─── Modular Emergency Modals ─── */}
      <EmergencyAdmitModal
        open={admitModalOpen}
        onOpenChange={setAdmitModalOpen}
        onSuccess={refetchTriages}
      />

      <EmergencyStatusModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        selectedTriage={selectedTriage}
        onSuccess={refetchTriages}
      />

      <EmergencyPatientLinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        selectedTriage={selectedTriage}
        onSuccess={refetchTriages}
      />

      <EmergencyMlcModal
        open={mlcModalOpen}
        onOpenChange={setMlcModalOpen}
        mlcSlipData={mlcSlipData}
      />

      <EmergencyDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        selectedTriage={selectedTriage}
        onRushToOt={(triage) => setSelectedTriageForOt(triage)}
      />

      {/* ─── Emergency Surgery Booking in OT ─── */}
      {selectedTriageForOt && (
        <ScheduleSurgeryModal
          isOpen={!!selectedTriageForOt}
          onClose={() => setSelectedTriageForOt(null)}
          prefillPatientId={selectedTriageForOt.patient_id ? Number(selectedTriageForOt.patient_id) : undefined}
          prefillPatientName={selectedTriageForOt.patient_name || selectedTriageForOt.patient?.name}
          prefillUhid={selectedTriageForOt.uhid || selectedTriageForOt.patient?.uhid}
          prefillAdmissionId={selectedTriageForOt.ipd_admission_id || undefined}
          prefillDoctorId={selectedTriageForOt.doctor_id ? Number(selectedTriageForOt.doctor_id) : undefined}
          prefillPriority="emergency"
          prefillProcedureName={selectedTriageForOt.chief_complaint || "Emergency Surgical Procedure"}
          onSuccess={() => {
            toast.success("Emergency surgery scheduled in Operation Theatre!")
            refetchTriages()
          }}
        />
      )}

      {/* ─── Bedside STAT Lab Requisition ─── */}
      {selectedTriageForLab && (
        <CreateIpdLabOrderModal
          isOpen={!!selectedTriageForLab}
          onClose={() => setSelectedTriageForLab(null)}
          onSuccess={() => {
            refetchTriages()
          }}
          admissionId={selectedTriageForLab.ipd_admission_id || 0}
          patientName={selectedTriageForLab.patient_name || selectedTriageForLab.patient?.name || "Casualty Patient"}
          uhid={selectedTriageForLab.uhid || selectedTriageForLab.patient?.uhid || ""}
          wardName={selectedTriageForLab.ward?.name || "Emergency & Casualty"}
          bedNumber={selectedTriageForLab.bed?.bed_number || "ER-Bay"}
          doctorId={selectedTriageForLab.doctor_id ? Number(selectedTriageForLab.doctor_id) : null}
          doctorName={selectedTriageForLab.doctor?.name}
        />
      )}

      {/* ─── Crash Cart / STAT Pharmacy Indent ─── */}
      {selectedTriageForIndent && (
        <CreateWardIndentModal
          isOpen={!!selectedTriageForIndent}
          onClose={() => setSelectedTriageForIndent(null)}
          onSuccess={() => {
            refetchTriages()
          }}
          prefillAdmissionId={selectedTriageForIndent.ipd_admission_id || undefined}
          prefillWardName={selectedTriageForIndent.ward?.name || "Emergency & Casualty"}
          prefillBedNumber={selectedTriageForIndent.bed?.bed_number || "ER-Bay"}
          prefillPatientName={selectedTriageForIndent.patient_name || selectedTriageForIndent.patient?.name}
          prefillUhid={selectedTriageForIndent.uhid || selectedTriageForIndent.patient?.uhid}
        />
      )}
    </div>
  )
}

export default EmergencyDeskPage
