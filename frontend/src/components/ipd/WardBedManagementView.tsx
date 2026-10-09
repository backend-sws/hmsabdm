import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Bed,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Sparkles,
  Layers,
  Wrench,
  CheckCircle2,
  Building,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { FormContainer } from "@/components/formContainer"
import { ipdService } from "@/services/ipdService"
import { queryKeys } from "@/constants/queryKeys"
import type { CreateWardPayload, UpdateWardPayload, CreateBedPayload, BatchCreateBedsPayload } from "@/types/ipd"

export const WardBedManagementView: React.FC = () => {
  const queryClient = useQueryClient()

  // ─── Filter & Search States ─────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [genderFilter, setGenderFilter] = useState<string>("all")
  const [collapsedWards, setCollapsedWards] = useState<Record<number, boolean>>({})

  // ─── Modal States ───────────────────────────────────────────────────
  const [wardModalOpen, setWardModalOpen] = useState(false)
  const [editingWard, setEditingWard] = useState<any | null>(null)
  const [wardForm, setWardForm] = useState({
    name: "",
    code: "",
    floor: "",
    gender_type: "all" as "all" | "male" | "female",
    daily_charge: 1000,
    is_active: true,
    initial_beds_count: 0,
    bed_prefix: "",
    sync_bed_charges: false,
  })

  const [bedModalOpen, setBedModalOpen] = useState(false)
  const [editingBed, setEditingBed] = useState<any | null>(null)
  const [selectedWardForBed, setSelectedWardForBed] = useState<any | null>(null)
  const [bedForm, setBedForm] = useState({
    bed_number: "",
    daily_charge: 1000,
    status: "available" as "available" | "maintenance",
    is_active: true,
  })

  const [batchBedModalOpen, setBatchBedModalOpen] = useState(false)
  const [selectedWardForBatch, setSelectedWardForBatch] = useState<any | null>(null)
  const [batchForm, setBatchForm] = useState({
    prefix: "BED-",
    start_number: 1,
    end_number: 10,
    daily_charge: 1000,
  })

  // ─── Query: All Wards with Beds ─────────────────────────────────────
  const {
    data: wards = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["ipd", "all-wards", searchQuery],
    queryFn: () => ipdService.getAllWards({ search: searchQuery }),
    staleTime: 5000,
  })

  // ─── Mutations ──────────────────────────────────────────────────────
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["ipd", "all-wards"] })
    queryClient.invalidateQueries({ queryKey: queryKeys.ipd.bedMatrix })
    queryClient.invalidateQueries({ queryKey: queryKeys.ipd.wards })
    queryClient.invalidateQueries({ queryKey: queryKeys.ipd.availableBeds() })
  }

  // 1. Create Ward
  const createWardMutation = useMutation({
    mutationFn: (payload: CreateWardPayload) => ipdService.createWard(payload),
    onSuccess: (newWard) => {
      toast.success(`Ward '${newWard.name}' created successfully!`)
      invalidateAll()
      setWardModalOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create ward")
    },
  })

  // 2. Update Ward
  const updateWardMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateWardPayload }) =>
      ipdService.updateWard(id, payload),
    onSuccess: (updated) => {
      toast.success(`Ward '${updated.name}' updated successfully!`)
      invalidateAll()
      setWardModalOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update ward")
    },
  })

  // 3. Delete Ward
  const deleteWardMutation = useMutation({
    mutationFn: (wardId: number) => ipdService.deleteWard(wardId),
    onSuccess: () => {
      toast.success("Ward and vacant beds deleted successfully!")
      invalidateAll()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete ward")
    },
  })

  // 4. Create Single Bed
  const createBedMutation = useMutation({
    mutationFn: (payload: CreateBedPayload) => ipdService.createBed(payload),
    onSuccess: (newBed) => {
      toast.success(`Bed #${newBed.bed_number} added successfully!`)
      invalidateAll()
      setBedModalOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add bed")
    },
  })

  // 5. Batch Create Beds
  const batchCreateBedsMutation = useMutation({
    mutationFn: (payload: BatchCreateBedsPayload) => ipdService.batchCreateBeds(payload),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Beds generated successfully!")
      invalidateAll()
      setBatchBedModalOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to batch create beds")
    },
  })

  // 6. Update Bed
  const updateBedMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      ipdService.updateBed(id, payload),
    onSuccess: () => {
      toast.success("Bed updated successfully!")
      invalidateAll()
      setBedModalOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update bed")
    },
  })

  // 7. Delete Bed
  const deleteBedMutation = useMutation({
    mutationFn: (bedId: number) => ipdService.deleteBed(bedId),
    onSuccess: () => {
      toast.success("Bed deleted successfully!")
      invalidateAll()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete bed")
    },
  })

  // ─── Handlers ───────────────────────────────────────────────────────
  const openCreateWard = () => {
    setEditingWard(null)
    setWardForm({
      name: "",
      code: "",
      floor: "1st Floor",
      gender_type: "all",
      daily_charge: 1000,
      is_active: true,
      initial_beds_count: 5,
      bed_prefix: "BED-",
      sync_bed_charges: false,
    })
    setWardModalOpen(true)
  }

  const openEditWard = (ward: any) => {
    setEditingWard(ward)
    setWardForm({
      name: ward.name,
      code: ward.code || "",
      floor: ward.floor || "",
      gender_type: ward.gender_type || "all",
      daily_charge: Number(ward.daily_charge || 1000),
      is_active: Boolean(ward.is_active),
      initial_beds_count: 0,
      bed_prefix: "",
      sync_bed_charges: false,
    })
    setWardModalOpen(true)
  }

  const openAddBed = (ward: any) => {
    setSelectedWardForBed(ward)
    setEditingBed(null)
    const nextNum = (ward.beds?.length || 0) + 1
    const prefix = ward.code ? `${ward.code}-` : "BED-"
    setBedForm({
      bed_number: `${prefix}${String(nextNum).padStart(2, "0")}`,
      daily_charge: Number(ward.daily_charge || 1000),
      status: "available",
      is_active: true,
    })
    setBedModalOpen(true)
  }

  const openEditBed = (ward: any, bed: any) => {
    setSelectedWardForBed(ward)
    setEditingBed(bed)
    setBedForm({
      bed_number: bed.bed_number,
      daily_charge: Number(bed.daily_charge || ward.daily_charge || 1000),
      status: bed.status === "maintenance" ? "maintenance" : "available",
      is_active: Boolean(bed.is_active),
    })
    setBedModalOpen(true)
  }

  const openBatchBeds = (ward: any) => {
    setSelectedWardForBatch(ward)
    const count = ward.beds?.length || 0
    const prefix = ward.code ? `${ward.code}-` : "BED-"
    setBatchForm({
      prefix,
      start_number: count + 1,
      end_number: count + 5,
      daily_charge: Number(ward.daily_charge || 1000),
    })
    setBatchBedModalOpen(true)
  }

  const toggleCollapse = (wardId: number) => {
    setCollapsedWards((prev) => ({ ...prev, [wardId]: !prev[wardId] }))
  }

  // ─── Filtered Wards ─────────────────────────────────────────────────
  const filteredWards = useMemo(() => {
    return wards.filter((w: any) => {
      if (genderFilter !== "all" && w.gender_type !== genderFilter) return false
      return true
    })
  }, [wards, genderFilter])

  // ─── Metrics ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    let totalBeds = 0
    let availableBeds = 0
    let occupiedBeds = 0
    let maintenanceBeds = 0
    let totalDailyChargeSum = 0

    wards.forEach((w: any) => {
      totalBeds += Number(w.total_beds || w.beds?.length || 0)
      availableBeds += Number(w.available_beds || 0)
      occupiedBeds += Number(w.occupied_beds || 0)
      maintenanceBeds += Number(w.maintenance_beds || 0)
      totalDailyChargeSum += Number(w.daily_charge || 0)
    })

    const avgPrice = wards.length > 0 ? Math.round(totalDailyChargeSum / wards.length) : 0

    return {
      totalWards: wards.length,
      totalBeds,
      availableBeds,
      occupiedBeds,
      maintenanceBeds,
      avgPrice,
    }
  }, [wards])

  return (
    <div className="space-y-6">
      {/* ── Top Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="shadow-2xs border-border/80">
          <CardContent className="p-3.5 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Total Wards</p>
              <h3 className="text-lg font-bold text-foreground">{metrics.totalWards}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border/80">
          <CardContent className="p-3.5 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Bed className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Total Beds</p>
              <h3 className="text-lg font-bold text-foreground">{metrics.totalBeds}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border/80">
          <CardContent className="p-3.5 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Vacant Beds</p>
              <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {metrics.availableBeds}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border/80">
          <CardContent className="p-3.5 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Occupied Beds</p>
              <h3 className="text-lg font-bold text-rose-700 dark:text-rose-400">
                {metrics.occupiedBeds}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border/80">
          <CardContent className="p-3.5 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Maintenance</p>
              <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400">
                {metrics.maintenanceBeds}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border/80">
          <CardContent className="p-3.5 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Avg Room Rent</p>
              <h3 className="text-lg font-bold text-foreground">₹{metrics.avgPrice}/d</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Toolbar: Search & Create Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-card rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ward name, code, floor, beds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-background"
            />
          </div>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground h-9 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Gender Wards</option>
            <option value="male">Male Only</option>
            <option value="female">Female Only</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={openCreateWard}
            className="gap-1.5 text-xs font-semibold shadow-xs h-9"
          >
            <Plus className="h-4 w-4" />
            Create New Ward
          </Button>
        </div>
      </div>

      {/* ── Wards List & Nested Bed Roster ── */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredWards.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border/80 bg-card/50">
          <Building className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h4 className="text-base font-semibold text-foreground">No Wards Configured Yet</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Set up hospital wards, floors, room rent pricing, and assign bed numbers to activate in-patient admissions.
          </p>
          <Button onClick={openCreateWard} className="mt-4 gap-1.5 text-xs font-semibold">
            <Plus className="h-4 w-4" /> Create First Ward
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredWards.map((ward: any) => {
            const isCollapsed = Boolean(collapsedWards[ward.id])
            const total = Number(ward.total_beds || ward.beds?.length || 0)
            const available = Number(ward.available_beds || 0)
            const occupied = Number(ward.occupied_beds || 0)
            const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0

            return (
              <Card
                key={ward.id}
                className="overflow-hidden border border-border/90 shadow-2xs rounded-2xl transition-all"
              >
                {/* Ward Header */}
                <div className="p-4 sm:p-5 bg-card border-b border-border/70 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(ward.id)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                      title={isCollapsed ? "Expand bed roster" : "Collapse bed roster"}
                    >
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                          <Building className="h-4 w-4 text-primary" />
                          {ward.name}
                        </h3>
                        {ward.code && (
                          <Badge variant="outline" className="font-mono text-[10px] font-semibold">
                            {ward.code}
                          </Badge>
                        )}
                        {ward.floor && (
                          <Badge variant="secondary" className="text-[10px]">
                            {ward.floor}
                          </Badge>
                        )}
                        {ward.gender_type && ward.gender_type !== "all" && (
                          <Badge
                            className={`text-[10px] uppercase font-bold ${
                              ward.gender_type === "female"
                                ? "bg-pink-500/10 text-pink-600 border border-pink-300"
                                : "bg-blue-500/10 text-blue-600 border border-blue-300"
                            }`}
                          >
                            {ward.gender_type}
                          </Badge>
                        )}
                      </div>

                      {/* Capacity Bar */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Capacity: <strong className="text-foreground">{total}</strong> beds
                        </span>
                        <span>•</span>
                        <span className="text-emerald-600 font-medium">
                          {available} vacant
                        </span>
                        <span>•</span>
                        <span className="text-rose-600 font-medium">
                          {occupied} occupied ({occupancyPct}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ward Pricing & Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Daily Room Rent Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        Room Rent:
                      </span>
                      <span className="text-sm font-bold font-mono">
                        ₹{Number(ward.daily_charge || 0).toLocaleString("en-IN")}/day
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddBed(ward)}
                      className="text-xs h-8 gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Bed
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBatchBeds(ward)}
                      className="text-xs h-8 gap-1 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Batch Beds
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditWard(ward)}
                      className="text-xs h-8 gap-1"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit & Rent
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (occupied > 0) {
                          toast.error(
                            `Cannot delete '${ward.name}': ${occupied} patient(s) currently admitted.`
                          )
                          return
                        }
                        if (
                          window.confirm(
                            `Are you sure you want to delete '${ward.name}' and all its vacant beds?`
                          )
                        ) {
                          deleteWardMutation.mutate(ward.id)
                        }
                      }}
                      className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Nested Bed Grid */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-5 bg-muted/10">
                    {(!ward.beds || ward.beds.length === 0) ? (
                      <div className="py-8 text-center rounded-xl border border-dashed border-border/80 bg-background">
                        <Bed className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-xs text-muted-foreground">
                          No beds created in this ward yet.
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAddBed(ward)}
                            className="text-xs h-7 gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add Bed
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openBatchBeds(ward)}
                            className="text-xs h-7 gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Sparkles className="h-3 w-3" /> Generate Batch Beds
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {ward.beds.map((bed: any) => {
                          const isAvailable = bed.status === "available"
                          const isOccupied = bed.status === "occupied"
                          const isMaintenance = bed.status === "maintenance"
                          const bedRate = Number(
                            bed.daily_charge !== null && bed.daily_charge !== undefined
                              ? bed.daily_charge
                              : ward.daily_charge || 0
                          )
                          const hasCustomRate =
                            bed.daily_charge !== null &&
                            bed.daily_charge !== undefined &&
                            Number(bed.daily_charge) !== Number(ward.daily_charge)

                          return (
                            <div
                              key={bed.id}
                              className={`rounded-xl border p-3 flex flex-col justify-between transition-all space-y-2 bg-card ${
                                isAvailable
                                  ? "border-emerald-500/30 hover:border-emerald-500 hover:shadow-xs"
                                  : isOccupied
                                  ? "border-rose-500/40 bg-rose-500/5 shadow-2xs"
                                  : "border-amber-500/30 bg-amber-500/5"
                              }`}
                            >
                              {/* Bed Header */}
                              <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                                <div className="flex items-center gap-1.5 font-bold font-mono text-sm text-foreground">
                                  <Bed className="h-4 w-4 text-muted-foreground" />
                                  <span>Bed #{bed.bed_number}</span>
                                </div>
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    isAvailable
                                      ? "bg-emerald-500"
                                      : isOccupied
                                      ? "bg-rose-500 animate-pulse"
                                      : "bg-amber-500"
                                  }`}
                                />
                              </div>

                              {/* Bed Status & Occupant / Pricing */}
                              <div className="space-y-1 text-xs py-1">
                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant={
                                      isAvailable
                                        ? "outline"
                                        : isOccupied
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    className={`text-[9px] uppercase font-bold tracking-wider ${
                                      isAvailable
                                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400"
                                        : isMaintenance
                                        ? "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400"
                                        : ""
                                    }`}
                                  >
                                    {isAvailable ? "Vacant" : isOccupied ? "Occupied" : "Maintenance"}
                                  </Badge>

                                  <div className="text-right">
                                    <span className="font-mono font-bold text-foreground">
                                      ₹{bedRate}/d
                                    </span>
                                    {hasCustomRate && (
                                      <span className="block text-[9px] text-purple-600 font-semibold">
                                        Custom rate
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {isOccupied && bed.current_admission && (
                                  <div className="pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                                    <p className="font-semibold text-foreground truncate">
                                      {bed.current_admission.patient?.name || "Admitted Patient"}
                                    </p>
                                    <p className="font-mono text-[10px]">
                                      {bed.current_admission.patient?.uhid}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Bed Actions */}
                              <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1">
                                  {isAvailable ? (
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      onClick={() =>
                                        updateBedMutation.mutate({
                                          id: bed.id,
                                          payload: { status: "maintenance" },
                                        })
                                      }
                                      className="text-[10px] h-6 px-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                      title="Mark bed as under maintenance / blocked"
                                    >
                                      Block
                                    </Button>
                                  ) : isMaintenance ? (
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      onClick={() =>
                                        updateBedMutation.mutate({
                                          id: bed.id,
                                          payload: { status: "available" },
                                        })
                                      }
                                      className="text-[10px] h-6 px-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                      title="Make bed vacant and ready for admission"
                                    >
                                      Unblock
                                    </Button>
                                  ) : null}

                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => openEditBed(ward, bed)}
                                    className="text-[10px] h-6 px-1.5 text-muted-foreground hover:text-foreground"
                                    title="Edit bed number & pricing"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>

                                {!isOccupied && (
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `Delete Bed #${bed.bed_number} from ${ward.name}?`
                                        )
                                      ) {
                                        deleteBedMutation.mutate(bed.id)
                                      }
                                    }}
                                    className="text-[10px] h-6 px-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          MODAL 1: CREATE / EDIT WARD & ROOM PRICING
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={wardModalOpen}
        onOpenChange={setWardModalOpen}
        title={editingWard ? `Edit Ward: ${editingWard.name}` : "Create New Hospital Ward"}
        description="Configure ward identity, floor location, gender eligibility, and daily room rent pricing."
        size="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setWardModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!wardForm.name.trim()) {
                  toast.error("Ward Name is required")
                  return
                }
                if (editingWard) {
                  updateWardMutation.mutate({
                    id: editingWard.id,
                    payload: {
                      name: wardForm.name,
                      code: wardForm.code || undefined,
                      floor: wardForm.floor || undefined,
                      gender_type: wardForm.gender_type,
                      daily_charge: Number(wardForm.daily_charge),
                      is_active: wardForm.is_active,
                      sync_bed_charges: wardForm.sync_bed_charges,
                    },
                  })
                } else {
                  createWardMutation.mutate({
                    name: wardForm.name,
                    code: wardForm.code || undefined,
                    floor: wardForm.floor || undefined,
                    gender_type: wardForm.gender_type,
                    daily_charge: Number(wardForm.daily_charge),
                    is_active: wardForm.is_active,
                    initial_beds_count: Number(wardForm.initial_beds_count) || 0,
                    bed_prefix: wardForm.bed_prefix || undefined,
                  })
                }
              }}
              disabled={createWardMutation.isPending || updateWardMutation.isPending}
              className="gap-2 font-semibold shadow-xs"
            >
              {createWardMutation.isPending || updateWardMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : editingWard ? (
                "Update Ward & Pricing"
              ) : (
                "Create Ward & Initialize Beds"
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Ward Name *</Label>
              <Input
                placeholder="e.g. Intensive Care Unit (ICU) / Male General Ward"
                value={wardForm.name}
                onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })}
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label>Ward Code / Acronym</Label>
              <Input
                placeholder="e.g. ICU, MMW, DLX-A"
                value={wardForm.code}
                onChange={(e) => setWardForm({ ...wardForm, code: e.target.value.toUpperCase() })}
                className="text-xs mt-1 font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Floor / Wing</Label>
              <Input
                placeholder="e.g. 2nd Floor, Wing B"
                value={wardForm.floor}
                onChange={(e) => setWardForm({ ...wardForm, floor: e.target.value })}
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label>Gender Category</Label>
              <select
                value={wardForm.gender_type}
                onChange={(e) =>
                  setWardForm({ ...wardForm, gender_type: e.target.value as any })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="all">Unisex / All Genders</option>
                <option value="male">Male Only</option>
                <option value="female">Female Only</option>
              </select>
            </div>

            <div>
              <Label className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> Room Rent (₹ / Day) *
              </Label>
              <Input
                type="number"
                min="0"
                value={wardForm.daily_charge}
                onChange={(e) =>
                  setWardForm({ ...wardForm, daily_charge: parseFloat(e.target.value) || 0 })
                }
                className="text-xs mt-1 font-mono font-bold text-emerald-700 dark:text-emerald-400"
              />
            </div>
          </div>

          {editingWard && (
            <div className="p-3 rounded-lg border border-border bg-accent/20 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Sync Bed Daily Charges</p>
                <p className="text-[11px] text-muted-foreground">
                  Update all existing beds in this ward to the new daily room rent rate of ₹
                  {wardForm.daily_charge}/day.
                </p>
              </div>
              <input
                type="checkbox"
                checked={wardForm.sync_bed_charges}
                onChange={(e) =>
                  setWardForm({ ...wardForm, sync_bed_charges: e.target.checked })
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>
          )}

          {!editingWard && (
            <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold">
                <Sparkles className="h-4 w-4" />
                <span>Quick Starter: Auto-Generate Initial Beds</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Number of initial beds to create</Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="e.g. 10"
                    value={wardForm.initial_beds_count}
                    onChange={(e) =>
                      setWardForm({
                        ...wardForm,
                        initial_beds_count: parseInt(e.target.value) || 0,
                      })
                    }
                    className="text-xs mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label>Bed prefix</Label>
                  <Input
                    placeholder="e.g. ICU- or BED-"
                    value={wardForm.bed_prefix}
                    onChange={(e) =>
                      setWardForm({ ...wardForm, bed_prefix: e.target.value })
                    }
                    className="text-xs mt-1 font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL 2: ADD / EDIT SINGLE BED
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={bedModalOpen}
        onOpenChange={setBedModalOpen}
        title={editingBed ? `Edit Bed #${editingBed.bed_number}` : `Add Bed to ${selectedWardForBed?.name}`}
        description="Configure bed number, daily charge override, and operational status."
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setBedModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!bedForm.bed_number.trim()) {
                  toast.error("Bed Number is required")
                  return
                }
                if (editingBed) {
                  updateBedMutation.mutate({
                    id: editingBed.id,
                    payload: {
                      bed_number: bedForm.bed_number,
                      daily_charge: Number(bedForm.daily_charge),
                      status: bedForm.status,
                      is_active: bedForm.is_active,
                    },
                  })
                } else {
                  createBedMutation.mutate({
                    ward_id: selectedWardForBed.id,
                    bed_number: bedForm.bed_number,
                    daily_charge: Number(bedForm.daily_charge),
                    status: bedForm.status,
                    is_active: bedForm.is_active,
                  })
                }
              }}
              disabled={createBedMutation.isPending || updateBedMutation.isPending}
              className="gap-2 font-semibold shadow-xs"
            >
              {createBedMutation.isPending || updateBedMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : editingBed ? (
                "Save Bed Details"
              ) : (
                "Confirm & Add Bed"
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          <div>
            <Label>Bed Number / Code *</Label>
            <Input
              placeholder="e.g. 101, ICU-04, B-12"
              value={bedForm.bed_number}
              onChange={(e) => setBedForm({ ...bedForm, bed_number: e.target.value })}
              className="text-xs mt-1 font-mono font-bold"
            />
          </div>

          <div>
            <Label className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" /> Daily Rate Override (₹ / Day)
            </Label>
            <Input
              type="number"
              min="0"
              value={bedForm.daily_charge}
              onChange={(e) =>
                setBedForm({ ...bedForm, daily_charge: parseFloat(e.target.value) || 0 })
              }
              className="text-xs mt-1 font-mono font-bold text-emerald-700 dark:text-emerald-400"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Leave set to ward rent (₹{selectedWardForBed?.daily_charge}/day) or enter a custom rate for ventilators / specialized equipment.
            </p>
          </div>

          <div>
            <Label>Initial Operational Status</Label>
            <select
              value={bedForm.status}
              disabled={editingBed?.status === "occupied"}
              onChange={(e) => setBedForm({ ...bedForm, status: e.target.value as any })}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
            >
              <option value="available">Available (Ready for Inpatient Admission)</option>
              <option value="maintenance">Under Maintenance / Blocked</option>
            </select>
            {editingBed?.status === "occupied" && (
              <p className="text-[11px] text-rose-600 mt-1">
                Bed is currently occupied by an admitted inpatient.
              </p>
            )}
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL 3: BATCH GENERATE BEDS (LIGHTNING FAST)
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={batchBedModalOpen}
        onOpenChange={setBatchBedModalOpen}
        title={`Batch Generate Beds: ${selectedWardForBatch?.name}`}
        description="Quickly generate a sequence of multiple hospital beds with automatic numbering in 1 click."
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setBatchBedModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (batchForm.start_number > batchForm.end_number) {
                  toast.error("Start number must be less than or equal to end number")
                  return
                }
                batchCreateBedsMutation.mutate({
                  ward_id: selectedWardForBatch.id,
                  prefix: batchForm.prefix,
                  start_number: batchForm.start_number,
                  end_number: batchForm.end_number,
                  daily_charge: Number(batchForm.daily_charge),
                })
              }}
              disabled={batchCreateBedsMutation.isPending}
              className="gap-2 font-semibold shadow-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              {batchCreateBedsMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                `Generate ${Math.max(0, batchForm.end_number - batchForm.start_number + 1)} Beds`
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          <div>
            <Label>Bed Number Prefix</Label>
            <Input
              placeholder="e.g. ICU-, BED-, W1-"
              value={batchForm.prefix}
              onChange={(e) => setBatchForm({ ...batchForm, prefix: e.target.value })}
              className="text-xs mt-1 font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Sequence # *</Label>
              <Input
                type="number"
                min="1"
                value={batchForm.start_number}
                onChange={(e) =>
                  setBatchForm({ ...batchForm, start_number: parseInt(e.target.value) || 1 })
                }
                className="text-xs mt-1 font-mono"
              />
            </div>
            <div>
              <Label>End Sequence # *</Label>
              <Input
                type="number"
                min="1"
                value={batchForm.end_number}
                onChange={(e) =>
                  setBatchForm({ ...batchForm, end_number: parseInt(e.target.value) || 1 })
                }
                className="text-xs mt-1 font-mono"
              />
            </div>
          </div>

          <div>
            <Label className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" /> Daily Rate for These Beds (₹ / Day)
            </Label>
            <Input
              type="number"
              min="0"
              value={batchForm.daily_charge}
              onChange={(e) =>
                setBatchForm({ ...batchForm, daily_charge: parseFloat(e.target.value) || 0 })
              }
              className="text-xs mt-1 font-mono font-bold text-emerald-700 dark:text-emerald-400"
            />
          </div>

          <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 text-purple-900 dark:text-purple-200">
            <span className="font-semibold block">Preview Example:</span>
            <span className="font-mono text-[11px] text-muted-foreground mt-0.5 block">
              Will generate beds:{" "}
              <strong>
                {batchForm.prefix}
                {String(batchForm.start_number).padStart(2, "0")}
              </strong>{" "}
              through{" "}
              <strong>
                {batchForm.prefix}
                {String(batchForm.end_number).padStart(2, "0")}
              </strong>{" "}
              (Total {Math.max(0, batchForm.end_number - batchForm.start_number + 1)} beds)
            </span>
          </div>
        </div>
      </FormContainer>
    </div>
  )
}
export default WardBedManagementView
