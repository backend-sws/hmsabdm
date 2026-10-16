import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import {
  Bed,
  Plus,
  Search,
  RefreshCw,
  User,
  ArrowRightLeft,
  LogOut,
  AlertTriangle,
  Stethoscope,
  Filter,
  Eye,
  Building,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  Clock,
  UserPlus,
  CheckCircle2,
  Settings2,
} from "lucide-react"

import { PageHeader } from "@/components/common/PageHeader"
import { StatCardsRow } from "@/components/common/stat-cards-row"
import { SectionCard } from "@/components/SectionCard"
import { DataTable, type Column } from "@/components/common/DataTable"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WardBedManagementView } from "@/components/ipd/WardBedManagementView"

import { ipdService } from "@/services/ipdService"
import { doctorService } from "@/services/doctorService"
import { patientService } from "@/services/patientService"
import { queryKeys } from "@/constants/queryKeys"
import type {
  BedMatrixResponse,
  BedMatrixWard,
  BedMatrixBed,
  IpdWard,
  IpdBed,
  IpdAdmission,
  AdmitPatientPayload,
  BedStatus,
} from "@/types/ipd"
import type { Patient } from "@/types/patient"

export const IpdDeskPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<"matrix" | "admissions" | "referrals" | "wards_setup">("matrix")
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>("all")
  const [admissionsSearch, setAdmissionsSearch] = useState("")

  // Modals state
  const [admitModalOpen, setAdmitModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [selectedAdmissionForTransfer, setSelectedAdmissionForTransfer] = useState<IpdAdmission | null>(null)
  const [newBedId, setNewBedId] = useState<number | "">("")

  // Quick pre-selected Ward & Bed when clicking "Admit Here" on a vacant bed in matrix
  const [preSelectedWardId, setPreSelectedWardId] = useState<number | null>(null)
  const [preSelectedBedId, setPreSelectedBedId] = useState<number | null>(null)

  // Referral selected for admission
  const [referralForAdmission, setReferralForAdmission] = useState<any | null>(null)

  // ─── Query: Pending OPD Admission Referrals ──────────────────────────
  const {
    data: opdReferrals = [],
    isLoading: referralsLoading,
    refetch: refetchReferrals,
  } = useQuery({
    queryKey: ["ipd", "opd-referrals"],
    queryFn: () => ipdService.getOpdReferrals(),
    refetchInterval: 20_000,
  })

  // ─── Queries ────────────────────────────────────────────────────────
  const {
    data: bedMatrixData,
    isLoading: matrixLoading,
    refetch: refetchMatrix,
    isRefetching: matrixRefetching,
  } = useQuery<BedMatrixResponse>({
    queryKey: queryKeys.ipd.bedMatrix,
    queryFn: ipdService.getBedMatrix,
    refetchInterval: 20_000, // Real-time poll every 20s
  })

  const {
    data: admissionsRaw,
    isLoading: admissionsLoading,
    refetch: refetchAdmissions,
  } = useQuery({
    queryKey: queryKeys.ipd.admissions({ status: "admitted" }),
    queryFn: () => ipdService.getAdmissions({ status: "admitted" }),
    refetchInterval: 30_000,
  })

  const admissionsList = useMemo<IpdAdmission[]>(() => {
    if (Array.isArray(admissionsRaw)) return admissionsRaw
    if (admissionsRaw && Array.isArray((admissionsRaw as any).data)) return (admissionsRaw as any).data
    return []
  }, [admissionsRaw])

  const { data: rawWards = [] } = useQuery({
    queryKey: queryKeys.ipd.wards,
    queryFn: () => ipdService.getWards(),
  })
  const wardsList = useMemo<IpdWard[]>(() => {
    if (Array.isArray(rawWards)) return rawWards
    if (rawWards && Array.isArray((rawWards as any).data)) return (rawWards as any).data
    return []
  }, [rawWards])

  const { data: doctorsData } = useQuery({
    queryKey: queryKeys.doctors.list(),
    queryFn: () => doctorService.getDoctors({ limit: 100 }),
  })
  const doctorsList = useMemo(() => {
    if (Array.isArray(doctorsData)) return doctorsData
    return doctorsData?.data || []
  }, [doctorsData])

  const { data: rawAvailableBeds = [] } = useQuery({
    queryKey: queryKeys.ipd.availableBeds(preSelectedWardId || undefined),
    queryFn: () => ipdService.getAvailableBeds(preSelectedWardId || undefined),
    enabled: admitModalOpen || transferModalOpen,
  })
  const availableBedsList = useMemo<IpdBed[]>(() => {
    if (Array.isArray(rawAvailableBeds)) return rawAvailableBeds
    if (rawAvailableBeds && Array.isArray((rawAvailableBeds as any).data)) return (rawAvailableBeds as any).data
    return []
  }, [rawAvailableBeds])

  // ─── Mutations ──────────────────────────────────────────────────────
  const transferBedMutation = useMutation({
    mutationFn: () => {
      if (!selectedAdmissionForTransfer || !newBedId) {
        throw new Error("Select a bed")
      }
      return ipdService.transferBed(selectedAdmissionForTransfer.id, {
        new_bed_id: Number(newBedId),
      })
    },
    onSuccess: () => {
      toast.success("Patient transferred to new bed successfully!")
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.bedMatrix })
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.admissions() })
      setTransferModalOpen(false)
      setSelectedAdmissionForTransfer(null)
      setNewBedId("")
    },
    onError: (err: any) => {
      toast.error(err.message || "Bed transfer failed.")
    },
  })

  const dischargeMutation = useMutation({
    mutationFn: (admissionId: number) =>
      ipdService.dischargePatient(admissionId, { mark_bed_cleaning: true }),
    onSuccess: () => {
      toast.success("Patient discharged successfully! Bed is marked for housekeeping.")
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.bedMatrix })
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.admissions() })
    },
    onError: (err: any) => {
      toast.error(err.message || "Discharge failed.")
    },
  })

  const updateBedStatusMutation = useMutation({
    mutationFn: ({ bedId, status }: { bedId: number; status: BedStatus }) =>
      ipdService.updateBed(bedId, { status }),
    onSuccess: (_, variables) => {
      const label =
        variables.status === "available"
          ? "Bed marked as Cleaned & Available!"
          : variables.status === "cleaning"
          ? "Bed marked for Cleaning / Housekeeping."
          : `Bed status updated to ${variables.status}.`
      toast.success(label)
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.bedMatrix })
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.availableBeds() })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update bed status.")
    },
  })

  // Summary stats
  const summary = (bedMatrixData as any)?.overview || bedMatrixData?.summary || {
    total_beds: 0,
    available_beds: 0,
    occupied_beds: 0,
    cleaning_beds: 0,
    maintenance_beds: 0,
    occupancy_rate: 0,
    occupancy_percentage: 0,
  }

  // Filter wards in Matrix view
  const displayedWards = useMemo(() => {
    if (!bedMatrixData?.wards) return []
    if (selectedWardFilter === "all") return bedMatrixData.wards
    return bedMatrixData.wards.filter((w) => String(w.id) === selectedWardFilter)
  }, [bedMatrixData, selectedWardFilter])

  // Filter admissions in Directory view
  const filteredAdmissions = useMemo(() => {
    const list = Array.isArray(admissionsList) ? admissionsList : []
    if (!admissionsSearch.trim()) return list
    const q = admissionsSearch.toLowerCase()
    return list.filter(
      (a) =>
        a.ipd_number?.toLowerCase().includes(q) ||
        a.patient?.name?.toLowerCase().includes(q) ||
        a.patient?.uhid?.toLowerCase().includes(q) ||
        a.patient?.mobile?.includes(q) ||
        a.doctor?.name?.toLowerCase().includes(q) ||
        a.ward?.name?.toLowerCase().includes(q) ||
        a.bed?.bed_number?.toLowerCase().includes(q)
    )
  }, [admissionsList, admissionsSearch])

  // Table Columns
  const admissionColumns: Column<IpdAdmission>[] = [
    {
      header: "IPD No / Admission",
      key: "ipd_number",
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5 font-bold font-mono text-primary text-sm">
            {row.ipd_number}
            {row.is_mlc && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                MLC
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground capitalize">
            {row.admission_type || "Planned"}
          </span>
        </div>
      ),
    },
    {
      header: "Patient Demographics",
      key: "patient",
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground text-sm">{row.patient?.name || "N/A"}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>UHID: {row.patient?.uhid}</span>
            {row.patient?.gender && <span>• {row.patient.gender}</span>}
          </div>
        </div>
      ),
    },
    {
      header: "Ward & Bed",
      key: "ward",
      cell: (row) => (
        <div>
          <Badge variant="outline" className="font-semibold text-xs border-primary/30 text-primary">
            {row.ward?.name || "Ward"}
          </Badge>
          <p className="text-xs font-mono font-bold text-foreground mt-0.5">
            Bed #{row.bed?.bed_number || "N/A"}
          </p>
        </div>
      ),
    },
    {
      header: "Attending Consultant",
      key: "doctor",
      cell: (row) => (
        <div>
          <p className="font-medium text-xs text-foreground">{row.doctor?.name || "Duty Doctor"}</p>
          <p className="text-[11px] text-muted-foreground">{row.doctor?.specialization || "General"}</p>
        </div>
      ),
    },
    {
      header: "Admitted On / Stay",
      key: "admission_date",
      cell: (row) => {
        const dateStr = row.admission_date
          ? new Date(row.admission_date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "N/A"
        return (
          <div className="text-xs">
            <span className="text-foreground font-medium">{dateStr}</span>
            <span className="block text-[11px] text-muted-foreground">Status: Admitted</span>
          </div>
        )
      },
    },
    {
      header: "Actions",
      key: "actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs gap-1"
            onClick={() => navigate(`/ipd/admissions/${row.id}`)}
          >
            <Eye className="h-3.5 w-3.5" /> Bedside Chart
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => {
              setSelectedAdmissionForTransfer(row)
              setPreSelectedWardId(row.ward?.id || null)
              setTransferModalOpen(true)
            }}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (window.confirm(`Discharge patient ${row.patient?.name}? Bed will be freed immediately.`)) {
                dischargeMutation.mutate(row.id)
              }
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        title="IPD Inpatient & Bed Desk"
        subtitle="Manage hospital wards, visual bed occupancy matrix, inpatient admissions, and bedside charts."
        icon={Bed}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchMatrix()
                refetchAdmissions()
              }}
              disabled={matrixRefetching}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${matrixRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              variant={activeTab === "wards_setup" ? "default" : "outline"}
              onClick={() => setActiveTab(activeTab === "wards_setup" ? "matrix" : "wards_setup")}
              className="gap-1.5 text-xs font-semibold"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {activeTab === "wards_setup" ? "Back to Live Matrix" : "Manage Wards & Beds"}
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setPreSelectedWardId(null)
                setPreSelectedBedId(null)
                setAdmitModalOpen(true)
              }}
              className="gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Plus className="h-4 w-4" /> New Admission
            </Button>
          </div>
        }
      />

      {/* ── Key Metrics Strip (Unified StatCardsRow) ── */}
      <StatCardsRow
        columns={6}
        stats={[
          {
            title: "Total Beds",
            value: summary.total_beds,
            icon: <Bed className="h-5 w-5" />,
            colorScheme: "blue",
          },
          {
            title: "Available (Vacant)",
            value: summary.available_beds,
            icon: <Sparkles className="h-5 w-5" />,
            colorScheme: "emerald",
          },
          {
            title: "Admitted Inpatients",
            value: summary.occupied_beds,
            icon: <User className="h-5 w-5" />,
            colorScheme: "rose",
          },
          {
            title: "Needs Cleaning",
            value: summary.cleaning_beds || 0,
            icon: <Sparkles className="h-5 w-5" />,
            colorScheme: "cyan",
          },
          {
            title: "Maintenance / Blocked",
            value: summary.maintenance_beds,
            icon: <AlertTriangle className="h-5 w-5" />,
            colorScheme: "amber",
          },
          {
            title: "Occupancy Rate",
            value: `${Number(summary.occupancy_rate ?? summary.occupancy_percentage ?? 0).toFixed(1)}%`,
            icon: <Activity className="h-5 w-5" />,
            colorScheme: "purple",
          },
        ]}
      />

      {/* ── View Switcher Tabs ── */}
      <div className="flex border-b border-border bg-card/60 p-1.5 rounded-xl shadow-xs gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "matrix"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          Live Visual Bed Matrix
        </button>

        <button
          onClick={() => setActiveTab("admissions")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "admissions"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Building className="h-4 w-4" />
          Active Inpatients Directory ({admissionsList.length})
        </button>

        <button
          onClick={() => setActiveTab("referrals")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "referrals"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          Pending OPD Admissions
          {opdReferrals.length > 0 && (
            <span className="ml-1.5 rounded-full bg-rose-600 text-white text-[10px] px-1.5 py-0.5 font-bold leading-none animate-pulse">
              {opdReferrals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("wards_setup")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "wards_setup"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Settings2 className="h-4 w-4 text-purple-500" />
          Wards & Bed Setup (Pricing)
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          TAB 1: LIVE VISUAL BED MATRIX
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          {/* Ward Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card rounded-xl border border-border/80">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Filter Ward:</span>
              <select
                value={selectedWardFilter}
                onChange={(e) => setSelectedWardFilter(e.target.value)}
                className="text-xs rounded-md border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Wards ({bedMatrixData?.wards?.length || 0})</option>
                {bedMatrixData?.wards?.map((ward) => (
                  <option key={ward.id} value={String(ward.id)}>
                    {ward.name} ({ward.available_beds}/{ward.total_beds} vacant)
                  </option>
                ))}
              </select>
            </div>

            {/* Status Legend */}
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Vacant
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                Needs Cleaning
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Maintenance
              </span>
            </div>
          </div>

          {matrixLoading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : displayedWards.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-xl text-muted-foreground">
              No ward or bed records found. Please configure wards and beds in Hospital Settings.
            </div>
          ) : (
            <div className="space-y-6">
              {displayedWards.map((ward) => (
                <WardSectionCard
                  key={ward.id}
                  ward={ward}
                  onAdmitBed={(bed) => {
                    setPreSelectedWardId(ward.id)
                    setPreSelectedBedId(bed.id)
                    setAdmitModalOpen(true)
                  }}
                  onViewAdmission={(admId) => navigate(`/ipd/admissions/${admId}`)}
                  onUpdateBedStatus={(bedId, status) =>
                    updateBedStatusMutation.mutate({ bedId, status })
                  }
                  isUpdatingBed={updateBedStatusMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 2: ACTIVE INPATIENTS DIRECTORY
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "admissions" && (
        <SectionCard
          title="Active Inpatients Directory"
          description="Live roster of all admitted patients across hospital wards."
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by IPD, UHID, Patient, Bed..."
                  value={admissionsSearch}
                  onChange={(e) => setAdmissionsSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <DataTable
              columns={admissionColumns}
              data={filteredAdmissions}
              isLoading={admissionsLoading}
            />
          </div>
        </SectionCard>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 3: PENDING OPD ADMISSION REFERRALS
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "referrals" && (
        <SectionCard
          title="Pending OPD Admission Referrals"
          description="Patients advised for in-patient bed admission by OPD consulting doctors."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchReferrals()}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          }
        >
          <div className="space-y-4">
            {referralsLoading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : opdReferrals.length === 0 ? (
              <div className="py-16 text-center rounded-xl border border-dashed border-border/80 bg-card/50">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-semibold text-foreground">No Pending Referrals</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  All patients advised for admission from OPD consultations have either been admitted or transferred.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {opdReferrals.map((ref: any) => {
                  const isEmergency = ref.admit_priority === "emergency"
                  const isUrgent = ref.admit_priority === "urgent"

                  return (
                    <Card
                      key={ref.prescription_id}
                      className={`relative overflow-hidden transition-all border shadow-xs hover:shadow-md ${
                        isEmergency
                          ? "border-rose-500/50 bg-rose-500/5 dark:bg-rose-950/20"
                          : isUrgent
                          ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/20"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-foreground">{ref.patient_name}</h4>
                              <Badge
                                variant={isEmergency ? "destructive" : isUrgent ? "outline" : "secondary"}
                                className={`text-[10px] uppercase font-bold tracking-wider ${
                                  isUrgent ? "bg-amber-500/10 text-amber-600 border-amber-300" : ""
                                }`}
                              >
                                {ref.admit_priority || "Routine"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {ref.uhid} • {ref.gender || "M"}/{ref.age || "N/A"} • +91 {ref.patient_mobile || "N/A"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            Token #{ref.token_number || "—"}
                          </Badge>
                        </div>

                        <div className="rounded-lg bg-background/80 p-2.5 border border-border/60 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Stethoscope className="h-3.5 w-3.5 text-primary" />
                              Advised by:
                            </span>
                            <span className="font-medium text-foreground">
                              {ref.doctor_name || "Doctor"}
                            </span>
                          </div>
                          {ref.recommended_ward && (
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Bed className="h-3.5 w-3.5 text-blue-500" />
                                Recommended Ward:
                              </span>
                              <Badge variant="outline" className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40">
                                {ref.recommended_ward}
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              Advised Time:
                            </span>
                            <span className="font-mono text-[11px]">
                              {ref.created_at ? new Date(ref.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
                            </span>
                          </div>
                        </div>

                        {ref.disposition_notes && (
                          <div className="text-xs bg-accent/40 rounded-lg p-2 text-foreground/90 border border-border/40">
                            <span className="font-semibold text-muted-foreground text-[10px] uppercase block mb-0.5">
                              Clinical Advice / Reason:
                            </span>
                            <p className="line-clamp-2 italic">{ref.disposition_notes}</p>
                          </div>
                        )}

                        <Button
                          onClick={() => {
                            setReferralForAdmission(ref)
                            setPreSelectedWardId(null)
                            setPreSelectedBedId(null)
                            setAdmitModalOpen(true)
                          }}
                          className="w-full gap-2 text-xs font-semibold shadow-xs"
                          size="sm"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Allocate Bed & Admit Now
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 4: WARDS & BED SETUP (PRICING & ROOM CONFIGURATION)
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "wards_setup" && (
        <WardBedManagementView />
      )}

      {/* ────────────────────────────────────────────────────────────────
          MODAL 1: NEW IPD ADMISSION DRAWER
         ──────────────────────────────────────────────────────────────── */}
      <AdmitPatientModal
        open={admitModalOpen}
        onOpenChange={(open) => {
          setAdmitModalOpen(open)
          if (!open) {
            setReferralForAdmission(null)
          }
        }}
        preSelectedWardId={preSelectedWardId}
        preSelectedBedId={preSelectedBedId}
        referralData={referralForAdmission}
        wards={wardsList}
        doctors={doctorsList}
        availableBeds={availableBedsList}
        onAdmitted={(newAdm) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.ipd.bedMatrix })
          queryClient.invalidateQueries({ queryKey: queryKeys.ipd.admissions() })
          queryClient.invalidateQueries({ queryKey: ["ipd", "opd-referrals"] })
          setAdmitModalOpen(false)
          setReferralForAdmission(null)
          navigate(`/ipd/admissions/${newAdm.id}`)
        }}
      />

      {/* ────────────────────────────────────────────────────────────────
          MODAL 2: TRANSFER BED MODAL
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        title="Transfer Patient Bed"
        description="Select a vacant bed to relocate the patient."
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => setTransferModalOpen(false)}
              disabled={transferBedMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => transferBedMutation.mutate()}
              disabled={!newBedId || transferBedMutation.isPending}
            >
              {transferBedMutation.isPending ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </div>
        }
      >
        {selectedAdmissionForTransfer && (
          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-lg border border-border bg-accent/30 space-y-1">
              <p className="font-semibold text-foreground text-sm">
                {selectedAdmissionForTransfer.patient?.name}
              </p>
              <p className="text-muted-foreground font-mono">
                Current Bed: {selectedAdmissionForTransfer.ward?.name} • Bed #
                {selectedAdmissionForTransfer.bed?.bed_number}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Select New Available Bed *</Label>
              <select
                value={newBedId}
                onChange={(e) => setNewBedId(Number(e.target.value))}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">-- Choose Vacant Bed --</option>
                {availableBedsList.map((bed) => (
                  <option key={bed.id} value={bed.id}>
                    Bed #{bed.bed_number} (₹{bed.daily_charge || 0}/day)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </FormContainer>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Helper Component: Ward Section with Visual Bed Grid
// ──────────────────────────────────────────────────────────────────────
interface WardSectionCardProps {
  ward: BedMatrixWard
  onAdmitBed: (bed: BedMatrixBed) => void
  onViewAdmission: (admissionId: number) => void
  onUpdateBedStatus: (bedId: number, status: BedStatus) => void
  isUpdatingBed?: boolean
}

const WardSectionCard: React.FC<WardSectionCardProps> = ({
  ward,
  onAdmitBed,
  onViewAdmission,
  onUpdateBedStatus,
  isUpdatingBed = false,
}) => {
  const cleaningBedsCount = ward.beds.filter((b) => b.status === "cleaning").length

  return (
    <Card className="shadow-xs border border-border">
      {/* Ward Header Banner */}
      <div className="p-4 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-3 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            {ward.code || "W"}
          </div>
          <div>
            <h4 className="font-bold text-base text-foreground flex items-center gap-2">
              {ward.name}
              {ward.floor && (
                <span className="text-xs font-normal text-muted-foreground">({ward.floor})</span>
              )}
            </h4>
            <span className="text-xs text-muted-foreground">
              Tariff: ₹{ward.daily_charge}/day
            </span>
          </div>
        </div>

        {/* Ward Bed Stats */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-300">
            {ward.available_beds} Vacant
          </Badge>
          <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-600 border-rose-300">
            {ward.occupied_beds} Occupied
          </Badge>
          {cleaningBedsCount > 0 && (
            <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600 border-cyan-300">
              {cleaningBedsCount} Cleaning
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs font-mono">
            Total: {ward.total_beds}
          </Badge>
        </div>
      </div>

      {/* Beds Grid */}
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {ward.beds.map((bed) => {
            const isAvailable = bed.status === "available"
            const isOccupied = bed.status === "occupied"
            const isCleaning = bed.status === "cleaning"
            const isMaintenance = bed.status === "maintenance"

            return (
              <div
                key={bed.id}
                className={`group relative rounded-xl border p-3.5 transition-all flex flex-col justify-between min-h-[145px] ${
                  isAvailable
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500 hover:shadow-xs"
                    : isOccupied
                    ? "border-rose-500/30 bg-rose-500/5 shadow-2xs hover:border-rose-500"
                    : isCleaning
                    ? "border-cyan-500/40 bg-cyan-500/10 shadow-2xs hover:border-cyan-500"
                    : "border-amber-500/30 bg-amber-500/5 opacity-80"
                }`}
              >
                {/* ── Hover 360° Inpatient Quick Preview Tooltip ── */}
                {isOccupied && bed.admission && (
                  <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 delay-75 absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-72 p-3 bg-popover/95 backdrop-blur-md text-popover-foreground border border-border shadow-xl rounded-xl z-50 pointer-events-none">
                    {/* Tooltip Arrow */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-popover rotate-45 border-b border-r border-border" />

                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground">
                            {bed.admission.patient?.name || "Patient"}
                          </span>
                          {bed.admission.is_mlc && (
                            <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5">
                              MLC
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {bed.admission.patient?.uhid} • {bed.admission.patient?.gender || "M"}/{bed.admission.patient?.age ?? "—"} yrs
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0 bg-primary/5 text-primary border-primary/20">
                        {bed.admission.ipd_number}
                      </Badge>
                    </div>

                    {/* Content Grid */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Stethoscope className="h-3 w-3 text-primary" /> Doctor:
                        </span>
                        <span className="font-medium text-foreground text-right truncate max-w-[140px]">
                          {bed.admission.doctor?.name || "Attending Doctor"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-500" /> Stay Duration:
                        </span>
                        <span className="font-medium font-mono text-foreground">
                          {bed.admission.elapsed_days}d {bed.admission.elapsed_hours % 24}h
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-primary/5 rounded-md p-1.5 border border-primary/10">
                        <span className="flex items-center gap-1 font-semibold text-primary text-[11px]">
                          <DollarSign className="h-3.5 w-3.5" /> Running Bill:
                        </span>
                        <span className="font-bold font-mono text-foreground text-xs">
                          ₹{Number(bed.admission.running_bill || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {bed.admission.latest_vital && (
                        <div className="pt-1 border-t border-border/40">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                            Latest Vitals:
                          </span>
                          <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-mono">
                            {bed.admission.latest_vital.bp_systolic ? (
                              <div className="bg-muted/50 rounded p-1">
                                <span className="text-muted-foreground block text-[9px]">BP</span>
                                <span className="font-bold text-foreground">
                                  {bed.admission.latest_vital.bp_systolic}/{bed.admission.latest_vital.bp_diastolic || "—"}
                                </span>
                              </div>
                            ) : null}
                            {bed.admission.latest_vital.pulse ? (
                              <div className="bg-muted/50 rounded p-1">
                                <span className="text-muted-foreground block text-[9px]">Pulse</span>
                                <span className="font-bold text-foreground">{bed.admission.latest_vital.pulse}</span>
                              </div>
                            ) : null}
                            {bed.admission.latest_vital.spo2 ? (
                              <div className="bg-muted/50 rounded p-1">
                                <span className="text-muted-foreground block text-[9px]">SpO2</span>
                                <span className="font-bold text-foreground">{bed.admission.latest_vital.spo2}%</span>
                              </div>
                            ) : null}
                            {bed.admission.latest_vital.temperature ? (
                              <div className="bg-muted/50 rounded p-1">
                                <span className="text-muted-foreground block text-[9px]">Temp</span>
                                <span className="font-bold text-foreground">{bed.admission.latest_vital.temperature}°F</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bed Top Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-1.5 font-bold font-mono text-sm text-foreground">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    Bed #{bed.bed_number}
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isAvailable
                        ? "bg-emerald-500"
                        : isOccupied
                        ? "bg-rose-500 animate-pulse"
                        : isCleaning
                        ? "bg-cyan-500 animate-pulse"
                        : "bg-amber-500"
                    }`}
                    title={
                      isAvailable
                        ? "Vacant / Available"
                        : isOccupied
                        ? "Occupied"
                        : isCleaning
                        ? "Needs Cleaning / Housekeeping"
                        : "Under Maintenance"
                    }
                  />
                </div>

                {/* Bed Middle Status / Patient Info */}
                <div className="py-2.5 space-y-1">
                  {isAvailable && (
                    <div className="text-center py-2">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        Available Bed
                      </span>
                      <p className="text-[11px] text-muted-foreground">₹{bed.daily_charge}/day</p>
                    </div>
                  )}

                  {isOccupied && bed.admission && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground truncate max-w-[120px]">
                          {bed.admission.patient?.name || "Patient"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {bed.admission.elapsed_days}d {bed.admission.elapsed_hours % 24}h
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {bed.admission.patient?.uhid}
                      </p>
                      <p className="text-[11px] text-foreground font-medium truncate flex items-center gap-1">
                        <Stethoscope className="h-3 w-3 text-primary" />
                        {bed.admission.doctor?.name || "Doctor"}
                      </p>
                    </div>
                  )}

                  {isCleaning && (
                    <div className="text-center py-2 space-y-0.5">
                      <div className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700 dark:text-cyan-400">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
                        Needs Cleaning
                      </div>
                      <p className="text-[10px] text-muted-foreground">Housekeeping Pending</p>
                    </div>
                  )}

                  {isMaintenance && (
                    <div className="text-center py-2 text-xs text-amber-600 font-medium">
                      Under Maintenance
                    </div>
                  )}
                </div>

                {/* Bed Bottom Action */}
                <div className="pt-2 border-t border-border/40">
                  {isAvailable ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => onAdmitBed(bed)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Admit Here
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-cyan-600 hover:bg-cyan-500/10 text-xs"
                        title="Mark for Cleaning"
                        onClick={() => onUpdateBedStatus(bed.id, "cleaning")}
                        disabled={isUpdatingBed}
                      >
                        <Sparkles className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : isOccupied && bed.admission ? (
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                      onClick={() => onViewAdmission(bed.admission!.id)}
                    >
                      <Eye className="h-3 w-3 mr-1" /> Chart
                    </Button>
                  ) : isCleaning ? (
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-medium shadow-xs"
                      onClick={() => onUpdateBedStatus(bed.id, "available")}
                      disabled={isUpdatingBed}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Cleaned
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                      onClick={() => onUpdateBedStatus(bed.id, "available")}
                      disabled={isUpdatingBed}
                    >
                      Mark Available
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Helper Modal: New IPD Admission Modal
// ──────────────────────────────────────────────────────────────────────
interface AdmitPatientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preSelectedWardId: number | null
  preSelectedBedId: number | null
  referralData?: any | null
  wards: any[]
  doctors: any[]
  availableBeds: any[]
  onAdmitted: (newAdmission: IpdAdmission) => void
}

const AdmitPatientModal: React.FC<AdmitPatientModalProps> = ({
  open,
  onOpenChange,
  preSelectedWardId,
  preSelectedBedId,
  referralData,
  wards,
  doctors,
  availableBeds,
  onAdmitted,
}) => {
  const [patientLookupQuery, setPatientLookupQuery] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  // Direct walk-in demographics (if not using existing patient)
  const [patientName, setPatientName] = useState("")
  const [patientMobile, setPatientMobile] = useState("")
  const [patientGender, setPatientGender] = useState<"M" | "F" | "O">("M")
  const [patientAddress, setPatientAddress] = useState("")
  const [patientCity, setPatientCity] = useState("")
  const [patientPincode, setPatientPincode] = useState("")

  // Admission parameters
  const [wardId, setWardId] = useState<number | "">(preSelectedWardId || "")
  const [bedId, setBedId] = useState<number | "">(preSelectedBedId || "")
  const [doctorId, setDoctorId] = useState<number | "">("")
  const [admissionType, setAdmissionType] = useState<string>("planned")
  const [admissionReason, setAdmissionReason] = useState("")
  const [advanceDeposit, setAdvanceDeposit] = useState("5000")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [isMlc, setIsMlc] = useState(false)
  const [attendantName, setAttendantName] = useState("")
  const [attendantPhone, setAttendantPhone] = useState("")

  // Fetch registered patients for lookup
  const { data: patientsData } = useQuery({
    queryKey: queryKeys.patients.list({ search: patientLookupQuery, limit: 10 }),
    queryFn: () => patientService.getPatients({ search: patientLookupQuery, limit: 10 }),
    enabled: patientLookupQuery.length >= 2,
  })

  // Set default bed when available beds load or preSelected changes
  React.useEffect(() => {
    if (preSelectedWardId) setWardId(preSelectedWardId)
    if (preSelectedBedId) setBedId(preSelectedBedId)
  }, [preSelectedWardId, preSelectedBedId])

  // Populate from referral data if opened from OPD Referrals queue
  React.useEffect(() => {
    if (referralData && open) {
      setSelectedPatient({
        id: referralData.patient_id,
        name: referralData.patient_name,
        uhid: referralData.uhid,
        mobile: referralData.patient_mobile || "",
        gender: referralData.gender || "M",
        age: referralData.age || 0,
      } as any)
      if (referralData.doctor_id) {
        setDoctorId(referralData.doctor_id)
      }
      if (referralData.admit_priority === "emergency") {
        setAdmissionType("emergency")
      } else {
        setAdmissionType("planned")
      }
      if (referralData.disposition_notes) {
        setAdmissionReason(`OPD Referral: ${referralData.disposition_notes}`)
      }
      if (referralData.recommended_ward && wards.length > 0) {
        const matched = wards.find((w: any) =>
          w.name.toLowerCase().includes(referralData.recommended_ward.toLowerCase())
        )
        if (matched) {
          setWardId(matched.id)
        }
      }
    }
  }, [referralData, open, wards])

  const admitMutation = useMutation({
    mutationFn: async () => {
      if (!bedId) throw new Error("Please select an available bed")
      if (!doctorId) throw new Error("Please select a treating doctor")
      if (!selectedPatient && !patientName) throw new Error("Patient name or selection required")

      const payload: AdmitPatientPayload = {
        patient_id: selectedPatient ? Number(selectedPatient.id) : undefined,
        name: selectedPatient ? undefined : patientName,
        mobile: selectedPatient ? undefined : patientMobile,
        gender: selectedPatient ? undefined : patientGender,
        address: selectedPatient ? undefined : patientAddress || undefined,
        city: selectedPatient ? undefined : patientCity || undefined,
        pincode: selectedPatient ? undefined : patientPincode || undefined,
        ward_id: wardId ? Number(wardId) : undefined,
        bed_id: Number(bedId),
        doctor_id: Number(doctorId),
        admission_type: admissionType as any,
        admission_reason: admissionReason || undefined,
        advance_deposit: Number(advanceDeposit) || 0,
        payment_method: paymentMethod,
        is_mlc: isMlc,
        attendant_name: attendantName || undefined,
        attendant_phone: attendantPhone || undefined,
      }
      return ipdService.admitPatient(payload)
    },
    onSuccess: (res) => {
      toast.success(`Patient admitted successfully! IPD No: ${res.ipd_number}`)
      onAdmitted(res)
    },
    onError: (err: any) => {
      toast.error(err.message || "Admission failed.")
    },
  })

  return (
    <FormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Direct IPD Admission & Bed Allocation"
      description="Issue official IPD Admission Slip (Parcha), assign hospital bed, and record advance deposit."
      size="xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={admitMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => admitMutation.mutate()}
            disabled={(!selectedPatient && !patientName) || !bedId || !doctorId || admitMutation.isPending}
            className="gap-2 font-semibold shadow-xs"
          >
            {admitMutation.isPending ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <><Bed className="h-4 w-4" /> Confirm & Issue IPD Parcha</>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 py-2">
        {referralData && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-500/10 p-3.5 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">
                Direct Admission from OPD Consultation (Token #{referralData.token_number || referralData.visit_id})
              </p>
              <p className="text-muted-foreground">
                Advised by <span className="font-semibold text-foreground">{referralData.doctor_name || "Doctor"}</span> • Priority:{" "}
                <span className="uppercase font-bold text-amber-600 dark:text-amber-400">
                  {referralData.admit_priority || "Routine"}
                </span>
                {referralData.recommended_ward && (
                  <span>
                    {" "}• Advised Ward: <span className="font-semibold text-foreground">{referralData.recommended_ward}</span>
                  </span>
                )}
              </p>
              {referralData.disposition_notes && (
                <p className="italic text-foreground/90 bg-background/70 p-2 rounded-lg border border-border/50 text-[11px] mt-1">
                  "{referralData.disposition_notes}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* Section 1: Patient Selection */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <User className="h-4 w-4 text-primary" />
            1. Patient Identification
          </h4>

          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
              <div>
                <p className="font-bold text-sm text-foreground">{selectedPatient.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  UHID: {selectedPatient.uhid} • +91 {selectedPatient.mobile || "N/A"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPatient(null)}
                className="text-xs h-7"
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="patient-search">Search Registered Patient (UHID / Mobile / Name)</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="patient-search"
                    placeholder="Type at least 2 chars..."
                    value={patientLookupQuery}
                    onChange={(e) => setPatientLookupQuery(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
                {/* Search Dropdown Results */}
                {patientsData?.data && patientsData.data.length > 0 && (
                  <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-border bg-popover shadow-md divide-y divide-border">
                    {patientsData.data.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p)
                          setPatientLookupQuery("")
                        }}
                        className="p-2.5 hover:bg-accent cursor-pointer flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold">{p.name}</span>
                        <span className="font-mono text-muted-foreground">{p.uhid}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border" />
                <span className="flex-shrink mx-3 text-[11px] text-muted-foreground uppercase font-semibold">
                  Or Direct Walk-in Inpatient
                </span>
                <div className="flex-grow border-t border-border" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Patient name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input
                    placeholder="10-digit"
                    value={patientMobile}
                    onChange={(e) => setPatientMobile(e.target.value)}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <Label>Address</Label>
                  <Input
                    placeholder="Street / House No / Colony"
                    value={patientAddress}
                    onChange={(e) => setPatientAddress(e.target.value)}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label>City / Town</Label>
                  <Input
                    placeholder="City"
                    value={patientCity}
                    onChange={(e) => setPatientCity(e.target.value)}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input
                    placeholder="6-digit PIN"
                    value={patientPincode}
                    onChange={(e) => setPatientPincode(e.target.value)}
                    className="text-xs mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Ward & Bed Allocation */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <Bed className="h-4 w-4 text-primary" />
            2. Ward & Bed Allocation
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Hospital Ward</Label>
              <select
                value={wardId}
                onChange={(e) => {
                  setWardId(Number(e.target.value))
                  setBedId("") // Reset bed when ward changes
                }}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="">-- All Wards --</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} (₹{w.daily_charge}/day)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Vacant Bed *</Label>
              <select
                value={bedId}
                onChange={(e) => setBedId(Number(e.target.value))}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 font-mono font-medium"
              >
                <option value="">-- Select Available Bed --</option>
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bed #{b.bed_number} (₹{b.daily_charge || 0}/day)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Clinical & Admission Details */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <Stethoscope className="h-4 w-4 text-primary" />
            3. Treating Doctor & Clinical Details
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Attending Consultant *</Label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(Number(e.target.value))}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="">-- Select Doctor --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialization || "Consultant"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Admission Type</Label>
              <select
                value={admissionType}
                onChange={(e) => setAdmissionType(e.target.value)}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 capitalize"
              >
                <option value="planned">Planned Admission</option>
                <option value="emergency">Emergency</option>
                <option value="day_care">Day Care</option>
                <option value="maternity">Maternity</option>
                <option value="transfer">Transfer from other Hospital</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <Label>Provisional Diagnosis / Reason for Admission</Label>
              <Input
                placeholder="e.g. Acute Appendicitis, Observation post RTA, Dengue with Thrombocytopenia"
                value={admissionReason}
                onChange={(e) => setAdmissionReason(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is-mlc"
                checked={isMlc}
                onChange={(e) => setIsMlc(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <Label htmlFor="is-mlc" className="cursor-pointer font-medium text-xs text-rose-600 dark:text-rose-400">
                Medico-Legal Case (MLC) Flag
              </Label>
            </div>
          </div>
        </div>

        {/* Section 4: Advance Payment & Attendant */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <DollarSign className="h-4 w-4 text-primary" />
              Advance Deposit
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={advanceDeposit}
                  onChange={(e) => setAdvanceDeposit(e.target.value)}
                  className="text-xs mt-1 font-mono"
                />
              </div>
              <div>
                <Label>Method</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="insurance">Insurance Cashless</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-primary" />
              Attendant Info (Optional)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Attendant Name</Label>
                <Input
                  placeholder="Relative name"
                  value={attendantName}
                  onChange={(e) => setAttendantName(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="Mobile"
                  value={attendantPhone}
                  onChange={(e) => setAttendantPhone(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </FormContainer>
  )
}

export default IpdDeskPage
