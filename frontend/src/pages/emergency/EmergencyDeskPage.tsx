import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Siren,
  AlertTriangle,
  HeartPulse,
  Activity,
  UserX,
  FileText,
  Printer,
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
} from "lucide-react"

import { PageHeader } from "@/components/common/PageHeader"
import { DataTable, type Column } from "@/components/common/DataTable"
import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { emergencyService } from "@/services/emergencyService"
import { doctorService } from "@/services/doctorService"
import { ipdService } from "@/services/ipdService"
import { queryKeys } from "@/constants/queryKeys"
import type {
  EmergencyTriage,
  PriorityLevel,
  EmergencyStatus,
  TriageAdmissionPayload,
  LinkPatientPayload,
  MlcSlipData,
} from "@/types/emergency"

export const EmergencyDeskPage: React.FC = () => {
  const queryClient = useQueryClient()

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

  // Master Queries for Modal
  const { data: doctorsData } = useQuery({
    queryKey: queryKeys.doctors.list(),
    queryFn: () => doctorService.getDoctors({ limit: 100 }),
    enabled: admitModalOpen,
  })
  const doctorsList = useMemo(() => doctorsData?.data || [], [doctorsData])

  const { data: wards = [] } = useQuery({
    queryKey: queryKeys.ipd.wards,
    queryFn: () => ipdService.getWards(),
    enabled: admitModalOpen,
  })

  const [selectedWardId, setSelectedWardId] = useState<number | undefined>(undefined)
  const { data: availableBeds = [] } = useQuery({
    queryKey: queryKeys.ipd.availableBeds(selectedWardId),
    queryFn: () => ipdService.getAvailableBeds(selectedWardId),
    enabled: admitModalOpen && !!selectedWardId,
  })

  // ─── Fast-Track Admit Form State ─────────────────────────────────────
  const initialAdmitState: TriageAdmissionPayload = {
    is_unknown_patient: false,
    patient_name: "",
    gender: "M",
    approximate_age: undefined,
    brought_by: "Ambulance",
    brought_by_contact: "",
    priority_level: "red",
    triage_category: "Trauma",
    chief_complaint: "",
    consciousness_level: "alert",
    gcs_score: 15,
    initial_vitals: {
      bp_systolic: undefined,
      bp_diastolic: undefined,
      pulse: undefined,
      spo2: undefined,
      temperature: undefined,
      respiratory_rate: undefined,
    },
    is_mlc: false,
    police_station: "",
    police_officer_name: "",
    police_buckle_number: "",
    incident_place: "",
    mlc_injuries_details: "",
    doctor_id: undefined,
    ward_id: undefined,
    bed_id: undefined,
    advance_deposit: 0,
    clinical_notes: "",
  }

  const [admitPayload, setAdmitPayload] = useState<TriageAdmissionPayload>(initialAdmitState)

  const admitMutation = useMutation({
    mutationFn: () => emergencyService.admitTriage(admitPayload),
    onSuccess: (res) => {
      toast.success(
        `Emergency Casualty Admitted! Triage #${res.triage_number} | UHID: ${res.uhid || res.patient?.uhid}`
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.emergency.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.bedMatrix })
      setAdmitModalOpen(false)
      setAdmitPayload(initialAdmitState)
    },
    onError: (err: any) => {
      toast.error(err.message || "Emergency admission failed.")
    },
  })

  // ─── Status Update Form State ────────────────────────────────────────
  const [statusUpdate, setStatusUpdate] = useState<{
    status: EmergencyStatus
    notes: string
  }>({
    status: "stabilized",
    notes: "",
  })

  const updateStatusMutation = useMutation({
    mutationFn: () => {
      if (!selectedTriage) throw new Error("No triage selected")
      return emergencyService.updateStatus(selectedTriage.id, statusUpdate)
    },
    onSuccess: (res) => {
      toast.success(`Triage #${res.triage_number} status updated to ${res.status.replace(/_/g, " ").toUpperCase()}`)
      queryClient.invalidateQueries({ queryKey: queryKeys.emergency.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.bedMatrix })
      setStatusModalOpen(false)
      setSelectedTriage(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update clinical status")
    },
  })

  // ─── Link Patient Identity Form State ────────────────────────────────
  const [linkMode, setLinkMode] = useState<"lookup" | "demographics">("demographics")
  const [linkPayload, setLinkPayload] = useState<LinkPatientPayload>({
    uhid: "",
    name: "",
    mobile: "",
    gender: "M",
    dob: "",
    blood_group: "",
    abha_number: "",
    abha_address: "",
    id_proof_type: "aadhaar",
    id_proof_number: "",
    address: "",
  })

  const linkPatientMutation = useMutation({
    mutationFn: () => {
      if (!selectedTriage) throw new Error("No triage selected")
      return emergencyService.linkPatient(selectedTriage.id, linkPayload)
    },
    onSuccess: (res) => {
      toast.success(`Patient identity verified & linked to Triage #${res.triage_number}!`)
      queryClient.invalidateQueries({ queryKey: queryKeys.emergency.all })
      setLinkModalOpen(false)
      setSelectedTriage(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to link patient identity")
    },
  })

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
      className: "w-[170px] text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* MLC Slip Button if Medico-Legal */}
          {row.is_mlc && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] gap-1 text-purple-700 dark:text-purple-300 border-purple-400/40 hover:bg-purple-500/10"
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
              className="h-7 px-2 text-[10px] gap-1 text-amber-700 dark:text-amber-400 border-amber-400/40 hover:bg-amber-500/10"
              onClick={() => {
                setSelectedTriage(row)
                setLinkPayload({
                  name: row.patient_name || "",
                  gender: row.gender || "M",
                  mobile: "",
                  dob: "",
                  blood_group: "",
                  abha_number: "",
                  abha_address: "",
                  id_proof_type: "aadhaar",
                  id_proof_number: "",
                  address: "",
                })
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
            className="h-7 px-2.5 text-[11px] gap-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90"
            onClick={() => {
              setSelectedTriage(row)
              setStatusUpdate({
                status: row.status === "under_treatment" ? "stabilized" : row.status,
                notes: "",
              })
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
          EMERGENCY PRIORITY COUNTERS (KPI CARDS)
         ──────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* RED PRIORITY */}
        <div
          onClick={() => setPriorityFilter(priorityFilter === "red" ? "all" : "red")}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
            priorityFilter === "red"
              ? "border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/20 shadow-md"
              : "border-border bg-card hover:border-rose-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              RED (P1)
            </span>
            <Siren className="h-4 w-4 text-rose-600 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2">
            {counters?.red_priority ?? 0}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Resuscitation / Immediate</p>
        </div>

        {/* YELLOW PRIORITY */}
        <div
          onClick={() => setPriorityFilter(priorityFilter === "yellow" ? "all" : "yellow")}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
            priorityFilter === "yellow"
              ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-md"
              : "border-border bg-card hover:border-amber-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              YELLOW (P2)
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {counters?.yellow_priority ?? 0}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Urgent / Emergent</p>
        </div>

        {/* GREEN PRIORITY */}
        <div
          onClick={() => setPriorityFilter(priorityFilter === "green" ? "all" : "green")}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
            priorityFilter === "green"
              ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-md"
              : "border-border bg-card hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              GREEN (P3)
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {counters?.green_priority ?? 0}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Less Urgent / Stable</p>
        </div>

        {/* ACTIVE IN CASUALTY */}
        <div
          onClick={() => setStatusFilter(statusFilter === "under_treatment" ? "all" : "under_treatment")}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
            statusFilter === "under_treatment"
              ? "border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/20 shadow-md"
              : "border-border bg-card hover:border-sky-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              ACTIVE IN ER
            </span>
            <Activity className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-2">
            {counters?.active_in_er ?? 0}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Under Treatment</p>
        </div>

        {/* MLC CASES */}
        <div
          onClick={() => setMlcFilter(mlcFilter === true ? undefined : true)}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
            mlcFilter === true
              ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20 shadow-md"
              : "border-border bg-card hover:border-purple-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              MLC CASES
            </span>
            <ShieldAlert className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-2">
            {counters?.mlc_cases ?? 0}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Medico-Legal Intimations</p>
        </div>

        {/* TOTAL ADMITTED TODAY */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              TODAY TOTAL
            </span>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">
            {counters?.total_today ?? 0}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Casualty Footfall</p>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          FILTER & SEARCH CONTROLS
         ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Priority filter pills */}
          <div className="inline-flex rounded-lg border border-input p-0.5 bg-muted/40">
            <button
              onClick={() => setPriorityFilter("all")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                priorityFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              All Priorities
            </button>
            <button
              onClick={() => setPriorityFilter("red")}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                priorityFilter === "red" ? "bg-rose-600 text-white shadow-xs" : "text-rose-600 hover:text-rose-700"
              }`}
            >
              🔴 Red
            </button>
            <button
              onClick={() => setPriorityFilter("yellow")}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                priorityFilter === "yellow" ? "bg-amber-600 text-white shadow-xs" : "text-amber-600 hover:text-amber-700"
              }`}
            >
              🟡 Yellow
            </button>
            <button
              onClick={() => setPriorityFilter("green")}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                priorityFilter === "green" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-600 hover:text-emerald-700"
              }`}
            >
              🟢 Green
            </button>
          </div>

          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden"
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

      {/* ────────────────────────────────────────────────────────────────
          MODAL: 5-SECOND FAST-TRACK ER ADMISSION
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={admitModalOpen}
        onOpenChange={setAdmitModalOpen}
        title="⚡ Fast-Track 5-Second ER Casualty Admission"
        description="Immediate admission for trauma/emergency. Generates temporary UHID (EMG-2026-XXXXX) for unknown patients."
        size="xl"
        footer={
          <div className="flex justify-between items-center w-full">
            <span className="text-[11px] text-muted-foreground">
              * Red priority cases bypass standard registration queues
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAdmitModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => admitMutation.mutate()}
                disabled={admitMutation.isPending}
                className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {admitMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
                ⚡ Instant Admit & Triage
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5 text-xs">
          {/* ESI Priority Visual Selector */}
          <div>
            <Label className="font-bold text-xs uppercase tracking-wider mb-2 block">
              1. ESI Triage Priority Level *
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {/* RED */}
              <div
                onClick={() => setAdmitPayload({ ...admitPayload, priority_level: "red" })}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  admitPayload.priority_level === "red"
                    ? "border-rose-600 bg-rose-500/15 ring-2 ring-rose-500/30"
                    : "border-border bg-card hover:border-rose-500/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-600 animate-pulse"></span>
                  <span className="font-bold text-sm text-rose-600 dark:text-rose-400">
                    🔴 RED (Immediate)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Resuscitation. Life or limb threat. Immediate intervention.
                </p>
              </div>

              {/* YELLOW */}
              <div
                onClick={() => setAdmitPayload({ ...admitPayload, priority_level: "yellow" })}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  admitPayload.priority_level === "yellow"
                    ? "border-amber-600 bg-amber-500/15 ring-2 ring-amber-500/30"
                    : "border-border bg-card hover:border-amber-500/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                  <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                    🟡 YELLOW (Urgent)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Emergent condition. High risk. Severe pain or distress.
                </p>
              </div>

              {/* GREEN */}
              <div
                onClick={() => setAdmitPayload({ ...admitPayload, priority_level: "green" })}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  admitPayload.priority_level === "green"
                    ? "border-emerald-600 bg-emerald-500/15 ring-2 ring-emerald-500/30"
                    : "border-border bg-card hover:border-emerald-500/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    🟢 GREEN (Stable)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Non-urgent condition. Normal vitals. Walking wounded.
                </p>
              </div>
            </div>
          </div>

          {/* Patient Identification Mode */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs uppercase tracking-wider">
                2. Casualty Patient Identification
              </Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={admitPayload.is_unknown_patient}
                  onChange={(e) =>
                    setAdmitPayload({
                      ...admitPayload,
                      is_unknown_patient: e.target.checked,
                      patient_name: e.target.checked ? "" : admitPayload.patient_name,
                    })
                  }
                  className="rounded border-input text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Unidentified / Unknown Patient (Auto-assign Temp UHID)
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Label>Patient Name</Label>
                <Input
                  value={admitPayload.patient_name || ""}
                  onChange={(e) => setAdmitPayload({ ...admitPayload, patient_name: e.target.value })}
                  placeholder={
                    admitPayload.is_unknown_patient
                      ? "Auto-generated: Unknown Male/Female (EMG-...)"
                      : "Enter patient name if known"
                  }
                  disabled={admitPayload.is_unknown_patient}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label>Gender</Label>
                <select
                  value={admitPayload.gender || "M"}
                  onChange={(e) => setAdmitPayload({ ...admitPayload, gender: e.target.value as any })}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              <div>
                <Label>Approximate Age (Years)</Label>
                <Input
                  type="number"
                  value={admitPayload.approximate_age || ""}
                  onChange={(e) =>
                    setAdmitPayload({
                      ...admitPayload,
                      approximate_age: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 35"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <Label>Brought By</Label>
                <select
                  value={admitPayload.brought_by || "Ambulance"}
                  onChange={(e) => setAdmitPayload({ ...admitPayload, brought_by: e.target.value })}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                >
                  <option value="Ambulance">108 / Private Ambulance</option>
                  <option value="Police">Police PCR Van</option>
                  <option value="Relative">Relative / Family Member</option>
                  <option value="Good Samaritan">Good Samaritan / Bystander</option>
                  <option value="Self">Self / Walk-in</option>
                </select>
              </div>

              <div>
                <Label>Brought By Contact / Phone</Label>
                <Input
                  value={admitPayload.brought_by_contact || ""}
                  onChange={(e) => setAdmitPayload({ ...admitPayload, brought_by_contact: e.target.value })}
                  placeholder="Mobile number of driver or relative"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Clinical & Triage Details */}
          <div className="space-y-3">
            <Label className="font-bold text-xs uppercase tracking-wider block">
              3. Clinical Triage & Presentation
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Triage Category</Label>
                <select
                  value={admitPayload.triage_category || "Trauma"}
                  onChange={(e) => setAdmitPayload({ ...admitPayload, triage_category: e.target.value })}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                >
                  <option value="Trauma">Trauma / RTA / Fall</option>
                  <option value="Cardiac">Chest Pain / Acute Coronary / Cardiac</option>
                  <option value="Respiratory">Severe Breathlessness / Asthma</option>
                  <option value="Neurological">Stroke / Seizure / Altered Sensorium</option>
                  <option value="Poisoning">Poisoning / Snake Bite / Overdose</option>
                  <option value="Burn">Burn / Electrical Injury</option>
                  <option value="Sepsis">Severe Sepsis / Shock</option>
                  <option value="Other">General Emergency</option>
                </select>
              </div>

              <div>
                <Label>Consciousness (AVPU)</Label>
                <select
                  value={admitPayload.consciousness_level || "alert"}
                  onChange={(e) =>
                    setAdmitPayload({
                      ...admitPayload,
                      consciousness_level: e.target.value as any,
                    })
                  }
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                >
                  <option value="alert">Alert (Fully conscious)</option>
                  <option value="voice">Responds to Voice</option>
                  <option value="pain">Responds to Pain only</option>
                  <option value="unresponsive">Unresponsive / Comatose</option>
                </select>
              </div>

              <div>
                <Label>Glasgow Coma Scale (GCS 3–15)</Label>
                <Input
                  type="number"
                  min={3}
                  max={15}
                  value={admitPayload.gcs_score ?? 15}
                  onChange={(e) =>
                    setAdmitPayload({
                      ...admitPayload,
                      gcs_score: Number(e.target.value),
                    })
                  }
                  placeholder="3 to 15"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label>Chief Complaint & Circumstances of Injury *</Label>
              <Input
                value={admitPayload.chief_complaint || ""}
                onChange={(e) => setAdmitPayload({ ...admitPayload, chief_complaint: e.target.value })}
                placeholder="e.g. Unconscious male found on roadside, bleeding from forehead and ear, suspected RTA"
                className="mt-1 text-xs"
              />
            </div>

            {/* Initial Vitals Strip */}
            <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Rapid Vitals Baseline
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block">BP Systolic</span>
                  <Input
                    type="number"
                    value={admitPayload.initial_vitals?.bp_systolic || ""}
                    onChange={(e) =>
                      setAdmitPayload({
                        ...admitPayload,
                        initial_vitals: {
                          ...admitPayload.initial_vitals,
                          bp_systolic: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="mmHg"
                    className="text-xs h-7 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">BP Diastolic</span>
                  <Input
                    type="number"
                    value={admitPayload.initial_vitals?.bp_diastolic || ""}
                    onChange={(e) =>
                      setAdmitPayload({
                        ...admitPayload,
                        initial_vitals: {
                          ...admitPayload.initial_vitals,
                          bp_diastolic: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="mmHg"
                    className="text-xs h-7 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Pulse (BPM)</span>
                  <Input
                    type="number"
                    value={admitPayload.initial_vitals?.pulse || ""}
                    onChange={(e) =>
                      setAdmitPayload({
                        ...admitPayload,
                        initial_vitals: {
                          ...admitPayload.initial_vitals,
                          pulse: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="bpm"
                    className="text-xs h-7 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">SpO2 (%)</span>
                  <Input
                    type="number"
                    value={admitPayload.initial_vitals?.spo2 || ""}
                    onChange={(e) =>
                      setAdmitPayload({
                        ...admitPayload,
                        initial_vitals: {
                          ...admitPayload.initial_vitals,
                          spo2: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="%"
                    className="text-xs h-7 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Temp (°F)</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={admitPayload.initial_vitals?.temperature || ""}
                    onChange={(e) =>
                      setAdmitPayload({
                        ...admitPayload,
                        initial_vitals: {
                          ...admitPayload.initial_vitals,
                          temperature: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="°F"
                    className="text-xs h-7 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Resp Rate (/min)</span>
                  <Input
                    type="number"
                    value={admitPayload.initial_vitals?.respiratory_rate || ""}
                    onChange={(e) =>
                      setAdmitPayload({
                        ...admitPayload,
                        initial_vitals: {
                          ...admitPayload.initial_vitals,
                          respiratory_rate: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="/min"
                    className="text-xs h-7 mt-0.5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Allocation & Doctor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Attending Casualty Doctor</Label>
              <select
                value={admitPayload.doctor_id || ""}
                onChange={(e) =>
                  setAdmitPayload({
                    ...admitPayload,
                    doctor_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="">Auto-assign Duty CMO</option>
                {doctorsList.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name} ({doc.specialization || "Casualty"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Immediate Bed Ward (Optional)</Label>
              <select
                value={selectedWardId || ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined
                  setSelectedWardId(val)
                  setAdmitPayload({ ...admitPayload, ward_id: val, bed_id: undefined })
                }}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="">Allocate Casualty Bay Bed</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Available Bed</Label>
              <select
                value={admitPayload.bed_id || ""}
                onChange={(e) =>
                  setAdmitPayload({
                    ...admitPayload,
                    bed_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                disabled={!selectedWardId}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 disabled:opacity-50"
              >
                <option value="">Select Bed</option>
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bed #{b.bed_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* MLC (Medico-Legal Case) Intimation Section */}
          <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-purple-600" />
                <span className="font-bold text-xs uppercase tracking-wider text-purple-800 dark:text-purple-300">
                  4. Medico-Legal Case (MLC) Police Intimation
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={admitPayload.is_mlc}
                  onChange={(e) => setAdmitPayload({ ...admitPayload, is_mlc: e.target.checked })}
                  className="rounded border-input text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  Register as MLC Case
                </span>
              </label>
            </div>

            {admitPayload.is_mlc && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Police Station Jurisdiction</Label>
                    <Input
                      value={admitPayload.police_station || ""}
                      onChange={(e) => setAdmitPayload({ ...admitPayload, police_station: e.target.value })}
                      placeholder="e.g. Connaught Place PS"
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <Label>Reporting Police Officer</Label>
                    <Input
                      value={admitPayload.police_officer_name || ""}
                      onChange={(e) =>
                        setAdmitPayload({ ...admitPayload, police_officer_name: e.target.value })
                      }
                      placeholder="e.g. SI Kuldeep Singh"
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <Label>Officer Buckle / Badge No.</Label>
                    <Input
                      value={admitPayload.police_buckle_number || ""}
                      onChange={(e) =>
                        setAdmitPayload({ ...admitPayload, police_buckle_number: e.target.value })
                      }
                      placeholder="e.g. CP-4421"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Place of Incident</Label>
                    <Input
                      value={admitPayload.incident_place || ""}
                      onChange={(e) => setAdmitPayload({ ...admitPayload, incident_place: e.target.value })}
                      placeholder="e.g. Outer Ring Road near Flyover"
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <Label>Nature & Location of Injuries</Label>
                    <Input
                      value={admitPayload.mlc_injuries_details || ""}
                      onChange={(e) =>
                        setAdmitPayload({ ...admitPayload, mlc_injuries_details: e.target.value })
                      }
                      placeholder="e.g. 5cm laceration on forehead, fracture right tibia"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: UPDATE CLINICAL STATUS
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        title="Update Casualty Clinical Status"
        description={`Triage #${selectedTriage?.triage_number} • Patient: ${selectedTriage?.patient_name}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateStatusMutation.mutate()}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-1" />}
              Save Status Transition
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <Label>Target Status *</Label>
            <select
              value={statusUpdate.status}
              onChange={(e) =>
                setStatusUpdate({ ...statusUpdate, status: e.target.value as EmergencyStatus })
              }
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 font-semibold"
            >
              <option value="under_treatment">🔴 Under ER Treatment (Active)</option>
              <option value="stabilized">🟢 Stabilized in Casualty</option>
              <option value="admitted_to_ipd">🏥 Admitted to Inpatient Ward (IPD)</option>
              <option value="transferred_external">🚑 Transferred to Higher Facility</option>
              <option value="discharged">✅ Discharged from Casualty</option>
              <option value="brought_dead">⬛ Brought Dead</option>
              <option value="expired">⬛ Expired in Casualty</option>
            </select>
          </div>

          <div>
            <Label>Clinical Transition Notes</Label>
            <textarea
              rows={3}
              value={statusUpdate.notes}
              onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
              placeholder="e.g. Vitals normalized post IV fluids and oxygenation. Shifted to Ward 3."
              className="w-full text-xs rounded-md border border-input bg-background p-2.5 mt-1"
            />
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: POST-STABILIZATION IDENTITY LINKING (KYC / ABHA)
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        title="Post-Stabilization Patient Identity Linking"
        description={`Merge temporary casualty profile (Triage #${selectedTriage?.triage_number}) with verified KYC or ABHA demographics`}
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <span className="text-[11px] text-muted-foreground">
              Upgrades temporary emergency record to full permanent patient
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLinkModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => linkPatientMutation.mutate()}
                disabled={linkPatientMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {linkPatientMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-1" />}
                Confirm Identity Linking
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="flex rounded-lg border border-input p-0.5 bg-muted/30">
            <button
              onClick={() => setLinkMode("demographics")}
              className={`flex-1 py-1.5 rounded-md font-semibold text-xs ${
                linkMode === "demographics" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
              }`}
            >
              Verify Demographics / ABHA
            </button>
            <button
              onClick={() => setLinkMode("lookup")}
              className={`flex-1 py-1.5 rounded-md font-semibold text-xs ${
                linkMode === "lookup" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
              }`}
            >
              Merge to Existing Registered UHID
            </button>
          </div>

          {linkMode === "lookup" ? (
            <div className="space-y-3">
              <div>
                <Label>Existing Patient Permanent UHID *</Label>
                <Input
                  value={linkPayload.uhid || ""}
                  onChange={(e) => setLinkPayload({ ...linkPayload, uhid: e.target.value })}
                  placeholder="e.g. UHID-2026-00042"
                  className="mt-1 text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  All vitals, orders, and triage records will be merged under this registered patient.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Verified Full Name *</Label>
                  <Input
                    value={linkPayload.name || ""}
                    onChange={(e) => setLinkPayload({ ...linkPayload, name: e.target.value })}
                    placeholder="Full legal name"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label>Mobile Number</Label>
                  <Input
                    value={linkPayload.mobile || ""}
                    onChange={(e) => setLinkPayload({ ...linkPayload, mobile: e.target.value })}
                    placeholder="10-digit mobile"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={linkPayload.dob || ""}
                    onChange={(e) => setLinkPayload({ ...linkPayload, dob: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <select
                    value={linkPayload.gender || "M"}
                    onChange={(e) => setLinkPayload({ ...linkPayload, gender: e.target.value as any })}
                    className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
                <div>
                  <Label>Blood Group</Label>
                  <select
                    value={linkPayload.blood_group || ""}
                    onChange={(e) => setLinkPayload({ ...linkPayload, blood_group: e.target.value })}
                    className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                  >
                    <option value="">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ABHA Number (Optional)</Label>
                  <Input
                    value={linkPayload.abha_number || ""}
                    onChange={(e) => setLinkPayload({ ...linkPayload, abha_number: e.target.value })}
                    placeholder="14-digit ABHA number"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label>ABHA Address (e.g. name@abdm)</Label>
                  <Input
                    value={linkPayload.abha_address || ""}
                    onChange={(e) => setLinkPayload({ ...linkPayload, abha_address: e.target.value })}
                    placeholder="user@abdm"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ID Proof Type</Label>
                  <select
                    value={linkPayload.id_proof_type || "aadhaar"}
                    onChange={(e) => setLinkPayload({ ...linkPayload, id_proof_type: e.target.value })}
                    className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                  >
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="voter_id">Voter ID</option>
                    <option value="driving_license">Driving License</option>
                  </select>
                </div>
                <div>
                  <Label>ID Proof Number</Label>
                  <Input
                    value={linkPayload.id_proof_number || ""}
                    onChange={(e) => setLinkPayload({ ...linkPayload, id_proof_number: e.target.value })}
                    placeholder="ID card number"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label>Residential Address</Label>
                <Input
                  value={linkPayload.address || ""}
                  onChange={(e) => setLinkPayload({ ...linkPayload, address: e.target.value })}
                  placeholder="Full street address and pin code"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: OFFICIAL POLICE INTIMATION MEMO (MLC SLIP)
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={mlcModalOpen}
        onOpenChange={setMlcModalOpen}
        title="Official Medico-Legal Case (MLC) Police Intimation Memo"
        description="Statutory Police Notification under CrPC for Casualty & Trauma Cases"
        size="xl"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setMlcModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => window.print()} className="gap-2 bg-purple-700 hover:bg-purple-800 text-white">
              <Printer className="h-4 w-4" /> Print Police Memo
            </Button>
          </div>
        }
      >
        {mlcSlipData && (
          <div className="p-6 border-2 border-dashed border-purple-500/40 rounded-2xl bg-purple-500/5 space-y-4 text-xs font-mono">
            {/* Header */}
            <div className="text-center pb-3 border-b border-border/80">
              <h2 className="font-bold text-lg text-foreground uppercase tracking-widest">
                {mlcSlipData.hospital.name}
              </h2>
              <p className="text-[11px] text-muted-foreground uppercase">
                Department of Emergency Medicine & Casualty Services
              </p>
              <div className="inline-block mt-2 px-3 py-1 bg-purple-600 text-white rounded font-bold text-xs uppercase tracking-wider">
                POLICE INTIMATION MEMO (MLC)
              </div>
            </div>

            {/* Memo & Police Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-border/80 pb-3">
              <div>
                <span className="text-muted-foreground block text-[10px]">MLC NUMBER:</span>
                <span className="font-bold text-purple-700 dark:text-purple-300">
                  {mlcSlipData.mlc_details.mlc_number}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">TRIAGE NUMBER:</span>
                <span className="font-bold">{mlcSlipData.mlc_details.triage_number}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">POLICE STATION:</span>
                <span className="font-bold">{mlcSlipData.mlc_details.police_station}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">OFFICER / BUCKLE:</span>
                <span className="font-bold">
                  {mlcSlipData.mlc_details.police_officer_name || "--"} /{" "}
                  {mlcSlipData.mlc_details.police_buckle_number || "--"}
                </span>
              </div>
            </div>

            {/* Patient Demographics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-border/80 pb-3">
              <div>
                <span className="text-muted-foreground block text-[10px]">PATIENT NAME:</span>
                <span className="font-bold">{mlcSlipData.patient.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">UHID / GENDER / AGE:</span>
                <span className="font-bold">
                  {mlcSlipData.patient.uhid || "EMG-TEMP"} • {mlcSlipData.patient.gender} •{" "}
                  {mlcSlipData.patient.approximate_age} Y
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">BROUGHT BY:</span>
                <span className="font-bold">
                  {mlcSlipData.patient.brought_by} ({mlcSlipData.patient.brought_by_phone || "--"})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">INCIDENT SPOT:</span>
                <span className="font-bold">{mlcSlipData.mlc_details.incident_place || "--"}</span>
              </div>
            </div>

            {/* Medical Findings */}
            <div className="space-y-2 border-b border-border/80 pb-3">
              <span className="text-muted-foreground block text-[10px]">
                NATURE & LOCATION OF INJURIES:
              </span>
              <p className="p-2.5 rounded bg-background border border-border text-foreground font-sans text-xs">
                {mlcSlipData.mlc_details.injuries_description}
              </p>
              <div className="flex gap-4 text-[11px] pt-1">
                <span>
                  <strong>GCS Score:</strong> {mlcSlipData.clinical_assessment.gcs_score ?? "--"}/15
                </span>
                <span>
                  <strong>Consciousness:</strong> {mlcSlipData.clinical_assessment.consciousness_level ?? "--"}
                </span>
                <span>
                  <strong>Priority:</strong> {mlcSlipData.clinical_assessment.priority_level?.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Legal Declaration & Doctor Sign */}
            <div className="pt-2 space-y-4">
              <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                "{mlcSlipData.declaration}"
              </p>

              <div className="flex justify-between items-end pt-4 border-t border-dashed border-border/80">
                <div>
                  <span className="text-[10px] text-muted-foreground block">INTIMATION TIME:</span>
                  <span className="font-bold">
                    {new Date(mlcSlipData.generated_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <div className="h-10 border-b border-muted-foreground/40 w-44 mb-1"></div>
                  <span className="font-bold block">{mlcSlipData.clinical_assessment.examining_doctor}</span>
                  <span className="text-[10px] text-muted-foreground block">
                    Reg / HPR ID: {mlcSlipData.clinical_assessment.doctor_reg_no || "Verified"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: QUICK VIEW CASUALTY DETAILS
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title="Casualty Case File"
        description={`Triage #${selectedTriage?.triage_number}`}
        size="md"
        footer={
          <Button onClick={() => setDetailModalOpen(false)} className="w-full">
            Close Case File
          </Button>
        }
      >
        {selectedTriage && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
              <div className="flex justify-between font-bold text-foreground">
                <span>{selectedTriage.patient_name}</span>
                <Badge
                  className={
                    selectedTriage.priority_level === "red"
                      ? "bg-rose-600 text-white"
                      : selectedTriage.priority_level === "yellow"
                      ? "bg-amber-600 text-white"
                      : "bg-emerald-600 text-white"
                  }
                >
                  {selectedTriage.priority_level.toUpperCase()}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground">
                UHID: {selectedTriage.uhid || "Temporary"} • {selectedTriage.gender} •{" "}
                {selectedTriage.approximate_age} Years
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground block font-semibold text-[10px]">
                CHIEF COMPLAINT:
              </span>
              <p className="p-2 rounded bg-background border border-border text-foreground">
                {selectedTriage.chief_complaint || "N/A"}
              </p>
            </div>

            {selectedTriage.clinical_notes && (
              <div className="space-y-1">
                <span className="text-muted-foreground block font-semibold text-[10px]">
                  CLINICAL NOTES:
                </span>
                <p className="p-2 rounded bg-background border border-border text-foreground font-mono text-[11px] whitespace-pre-line">
                  {selectedTriage.clinical_notes}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">Brought By:</span>
                <span className="font-semibold text-foreground">
                  {selectedTriage.brought_by || "Self"} ({selectedTriage.brought_by_contact || "N/A"})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Arrival Time:</span>
                <span className="font-semibold text-foreground">
                  {new Date(selectedTriage.arrival_time).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </FormContainer>
    </div>
  )
}

export default EmergencyDeskPage
