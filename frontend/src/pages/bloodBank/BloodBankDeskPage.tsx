import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Droplet,
  Plus,
  RefreshCw,
  Search,
  Layers,
  FlaskConical,
  GitCompare,
  ShieldAlert,
  ShieldCheck,
  Clock,
  ThermometerSnowflake,
  Activity,
  FileSpreadsheet,
  Printer,
  UserCheck,
  Building,
  Heart,
  FileHeart,
  SlidersHorizontal,
} from "lucide-react"

import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"

import {
  BloodGroupMatrixCard,
  RegisterDonorModal,
  DonorScreeningModal,
  TtiTestWorkbenchModal,
  ComponentSeparationModal,
  CreateBloodRequisitionModal,
  CrossmatchWorkbenchModal,
  PrintCompatibilityTagModal,
  HemovigilanceReactionModal,
  ScreeningConfigModal,
} from "@/components/bloodBank"

import { bloodBankService } from "@/services/bloodBankService"
import { queryKeys } from "@/constants/queryKeys"
import type {
  BloodDonor,
  BloodUnit,
  BloodRequisition,
  BloodCrossmatch,
  BloodGroup,
} from "@/types/bloodBank"

export const BloodBankDeskPage: React.FC = () => {
  const queryClient = useQueryClient()

  // Active Tab: 'units' | 'requisitions' | 'donors' | 'camps' | 'reactions'
  const [activeTab, setActiveTab] = useState<
    "units" | "requisitions" | "donors" | "camps" | "reactions"
  >("units")

  // Modal Open States
  const [isRegisterDonorOpen, setIsRegisterDonorOpen] = useState(false)
  const [selectedDonorForScreening, setSelectedDonorForScreening] = useState<BloodDonor | null>(null)
  const [selectedUnitForTti, setSelectedUnitForTti] = useState<BloodUnit | null>(null)
  const [selectedUnitForSeparation, setSelectedUnitForSeparation] = useState<BloodUnit | null>(null)
  const [isCreateRequisitionOpen, setIsCreateRequisitionOpen] = useState(false)
  const [selectedReqForCrossmatch, setSelectedReqForCrossmatch] = useState<BloodRequisition | null>(null)
  const [selectedCrossmatchForTag, setSelectedCrossmatchForTag] = useState<BloodCrossmatch | null>(null)
  const [isReactionModalOpen, setIsReactionModalOpen] = useState(false)
  const [isCreateCampOpen, setIsCreateCampOpen] = useState(false)
  const [isScreeningConfigOpen, setIsScreeningConfigOpen] = useState(false)

  // Camp creation form state
  const [campName, setCampName] = useState("")
  const [organizerName, setOrganizerName] = useState("")
  const [campLocation, setCampLocation] = useState("")
  const [campDate, setCampDate] = useState("")
  const [targetUnits, setTargetUnits] = useState(100)
  const [coordinatorContact, setCoordinatorContact] = useState("")

  // Filter States
  const [unitSearch, setUnitSearch] = useState("")
  const [unitComponentFilter, setUnitComponentFilter] = useState("all")
  const [unitStatusFilter, setUnitStatusFilter] = useState("all")
  const [unitGroupFilter, setUnitGroupFilter] = useState("all")

  const [reqSearch, setReqSearch] = useState("")
  const [reqStatusFilter, setReqStatusFilter] = useState("all")
  const [reqUrgencyFilter, setReqUrgencyFilter] = useState("all")

  const [donorSearch, setDonorSearch] = useState("")
  const [donorTypeFilter, setDonorTypeFilter] = useState("all")
  const [donorDeferralFilter, setDonorDeferralFilter] = useState("all")

  // 1. Dashboard Query
  const {
    data: dashboardData,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: queryKeys.bloodBank.dashboard,
    queryFn: () => bloodBankService.getDashboard(),
    refetchInterval: 30000,
  })

  // 2. Units Query
  const { data: unitsData, isLoading: loadingUnits } = useQuery({
    queryKey: queryKeys.bloodBank.units({
      search: unitSearch,
      component_type: unitComponentFilter,
      status: unitStatusFilter,
      blood_group: unitGroupFilter,
    }),
    queryFn: () =>
      bloodBankService.getBloodUnits({
        search: unitSearch || undefined,
        component_type: unitComponentFilter !== "all" ? unitComponentFilter : undefined,
        status: unitStatusFilter !== "all" ? unitStatusFilter : undefined,
        blood_group: unitGroupFilter !== "all" ? unitGroupFilter : undefined,
        per_page: 50,
      }),
    enabled: activeTab === "units",
  })

  // 3. Requisitions Query
  const { data: reqsData, isLoading: loadingReqs } = useQuery({
    queryKey: queryKeys.bloodBank.requisitions({
      search: reqSearch,
      status: reqStatusFilter,
      urgency: reqUrgencyFilter,
    }),
    queryFn: () =>
      bloodBankService.getRequisitions({
        search: reqSearch || undefined,
        status: reqStatusFilter !== "all" ? reqStatusFilter : undefined,
        urgency: reqUrgencyFilter !== "all" ? reqUrgencyFilter : undefined,
        per_page: 50,
      }),
    enabled: activeTab === "requisitions",
  })

  // 4. Donors Query
  const { data: donorsData, isLoading: loadingDonors } = useQuery({
    queryKey: queryKeys.bloodBank.donors({
      search: donorSearch,
      donor_type: donorTypeFilter,
      deferral_status: donorDeferralFilter,
    }),
    queryFn: () =>
      bloodBankService.getDonors({
        search: donorSearch || undefined,
        donor_type: donorTypeFilter !== "all" ? donorTypeFilter : undefined,
        deferral_status: donorDeferralFilter !== "all" ? donorDeferralFilter : undefined,
        per_page: 50,
      }),
    enabled: activeTab === "donors",
  })

  // 5. Camps Query
  const { data: campsData, isLoading: loadingCamps } = useQuery({
    queryKey: queryKeys.bloodBank.camps(),
    queryFn: () => bloodBankService.getCamps({ per_page: 30 }),
    enabled: activeTab === "camps",
  })

  // Create Camp Mutation
  const createCampMutation = useMutation({
    mutationFn: () => {
      if (!campName || !organizerName || !campLocation || !campDate) {
        throw new Error("Please fill all mandatory camp details")
      }
      return bloodBankService.createCamp({
        camp_name: campName,
        organizer_name: organizerName,
        location: campLocation,
        camp_date: campDate,
        target_units: Number(targetUnits),
        coordinator_contact: coordinatorContact || undefined,
      })
    },
    onSuccess: () => {
      toast.success("Outdoor Blood Donation Camp scheduled successfully!")
      queryClient.invalidateQueries({ queryKey: queryKeys.bloodBank.camps() })
      setIsCreateCampOpen(false)
      setCampName("")
      setOrganizerName("")
      setCampLocation("")
      setCampDate("")
      setTargetUnits(100)
      setCoordinatorContact("")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to schedule camp")
    },
  })

  const summary = dashboardData?.summary

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <PageHeader
        title="Blood Bank & Transfusion Medicine"
        subtitle="Schedule F & NABH Certified • ISBT 128 Traceability • CAT Gel-Card Crossmatch • National Hemovigilance (HvPI)"
        icon={Droplet}
        badge={
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
              Govt. Licensed Blood Centre
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchDashboard()
                queryClient.invalidateQueries({ queryKey: queryKeys.bloodBank.all })
                toast.success("Blood bank live inventory refreshed")
              }}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsReactionModalOpen(true)}
              className="gap-1.5 text-xs text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Report HvPI Reaction
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreateRequisitionOpen(true)}
              className="gap-1.5 text-xs border-blue-300 dark:border-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              + Indent Requisition
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsScreeningConfigOpen(true)}
              className="gap-1.5 text-xs text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              Screening Setup & Vitals
            </Button>

            <Button
              size="sm"
              onClick={() => setIsRegisterDonorOpen(true)}
              className="gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4" />
              + Register Donor
            </Button>
          </div>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Available */}
        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Available Safe</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {summary?.total_available ?? "..."}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">units</span>
          </div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-1">
            Cleared for transfusion
          </p>
        </div>

        {/* Quarantine Units */}
        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>In Quarantine</span>
            <FlaskConical className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
              {summary?.total_quarantine ?? "..."}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">units</span>
          </div>
          <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">
            Awaiting 5-marker TTI test
          </p>
        </div>

        {/* Reserved Units */}
        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/20 dark:to-slate-900 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Reserved for OT</span>
            <GitCompare className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-blue-700 dark:text-blue-400">
              {summary?.total_reserved ?? "..."}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">units</span>
          </div>
          <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-1">
            Crossmatched (48h lock)
          </p>
        </div>

        {/* Expiring Soon */}
        <div
          className={`p-3.5 rounded-xl border shadow-2xs ${
            (summary?.expiring_soon_48h ?? 0) > 0
              ? "border-red-300 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Expiring &lt;48h</span>
            <Clock className={`w-4 h-4 ${(summary?.expiring_soon_48h ?? 0) > 0 ? "text-red-600" : "text-slate-400"}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black ${
                (summary?.expiring_soon_48h ?? 0) > 0
                  ? "text-red-700 dark:text-red-400"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {summary?.expiring_soon_48h ?? 0}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">units</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Platelets / whole blood</p>
        </div>

        {/* Today Collections */}
        <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-slate-900 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Collected Today</span>
            <Heart className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400">
              {summary?.collections_today ?? 0}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">donations</span>
          </div>
          <p className="text-[10px] text-indigo-700 dark:text-indigo-300 mt-1">
            Issued: {summary?.issues_today ?? 0} units
          </p>
        </div>

        {/* Pending Requisitions */}
        <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-slate-900 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Pending Indents</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-700 dark:text-purple-400">
              {summary?.pending_requisitions ?? 0}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">orders</span>
          </div>
          <p className="text-[10px] text-purple-700 dark:text-purple-300 mt-1">
            Reactions active: {summary?.active_reactions ?? 0}
          </p>
        </div>
      </div>

      {/* 8-Group Live Matrix Card */}
      <BloodGroupMatrixCard
        matrix={dashboardData?.matrix || []}
        selectedGroup={unitGroupFilter}
        onSelectGroup={(grp) => setUnitGroupFilter(grp)}
      />

      {/* Navigation Tabs Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-px">
          {[
            { id: "units", label: "Blood Units & Inventory", icon: Droplet, count: unitsData?.meta?.total },
            { id: "requisitions", label: "Indents & Crossmatch Queue", icon: GitCompare, count: summary?.pending_requisitions },
            { id: "donors", label: "Donors & Medical Screening", icon: UserCheck, count: donorsData?.meta?.total },
            { id: "camps", label: "Outdoor Donation Drives", icon: Building },
            { id: "reactions", label: "HvPI Hemovigilance Reactions", icon: ShieldAlert, count: summary?.active_reactions },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? "border-red-600 text-red-600 dark:text-red-400 bg-red-50/40 dark:bg-red-950/20"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-red-600 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* TAB 1: UNITS INVENTORY */}
      {activeTab === "units" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-2xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder="Search by Barcode (e.g. BAG-2026-00001)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={unitGroupFilter}
                onChange={(e) => setUnitGroupFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Blood Groups</option>
                {(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as BloodGroup[]).map((grp) => (
                  <option key={grp} value={grp}>{grp}</option>
                ))}
              </select>

              <select
                value={unitComponentFilter}
                onChange={(e) => setUnitComponentFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Components</option>
                <option value="prbc">Packed RBC (PRBC)</option>
                <option value="ffp">Fresh Frozen Plasma</option>
                <option value="platelets">Platelets (RDP)</option>
                <option value="whole_blood">Whole Blood</option>
                <option value="cryo">Cryoprecipitate</option>
                <option value="sdp">Single Donor Platelet</option>
              </select>

              <select
                value={unitStatusFilter}
                onChange={(e) => setUnitStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available (Safe)</option>
                <option value="quarantine">Quarantine</option>
                <option value="reserved">Reserved (OT/Ward)</option>
                <option value="issued">Issued</option>
                <option value="discarded">Discarded</option>
              </select>
            </div>
          </div>

          {/* Units Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Unit Barcode</th>
                    <th className="px-4 py-3">Blood Group</th>
                    <th className="px-4 py-3">Component & Volume</th>
                    <th className="px-4 py-3">Collection / Expiry</th>
                    <th className="px-4 py-3">Climate Storage</th>
                    <th className="px-4 py-3">TTI Clearance</th>
                    <th className="px-4 py-3">Current Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingUnits ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        Loading blood units inventory...
                      </td>
                    </tr>
                  ) : unitsData?.data?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        No blood units found matching current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    unitsData?.data?.map((unit) => {
                      const isQuarantine = unit.status === "quarantine"
                      const isAvailable = unit.status === "available"
                      const isWholeBlood = unit.component_type === "whole_blood"

                      return (
                        <tr key={unit.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {unit.unit_barcode}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-300">
                              {unit.blood_group}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold uppercase text-slate-800 dark:text-slate-200">
                              {unit.component_type.replace("_", " ")}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {unit.volume_ml} mL • {unit.bag_type || "Single Bag"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            <div>Coll: {unit.collection_date}</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              Exp: {unit.expiry_date}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                              <ThermometerSnowflake className="w-3.5 h-3.5 text-blue-500" />
                              {unit.storage_equipment.replace("_", " ")}
                            </span>
                            {unit.storage_location && (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                Loc: {unit.storage_location}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {unit.tti_status === "tested_safe" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900">
                                <ShieldCheck className="w-3 h-3" /> Safe
                              </span>
                            ) : unit.tti_status === "reactive_discarded" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900">
                                <ShieldAlert className="w-3 h-3" /> Reactive
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900">
                                <Clock className="w-3 h-3" /> In Testing
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                                unit.status === "available"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : unit.status === "reserved"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  : unit.status === "quarantine"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : unit.status === "issued"
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {unit.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Run TTI Serology Button */}
                              {isQuarantine && (
                                <button
                                  onClick={() => setSelectedUnitForTti(unit)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-2xs flex items-center gap-1 transition"
                                >
                                  <FlaskConical className="w-3 h-3" />
                                  Test TTI
                                </button>
                              )}

                              {/* Separate Fraction Button */}
                              {isWholeBlood && (isAvailable || isQuarantine) && (
                                <button
                                  onClick={() => setSelectedUnitForSeparation(unit)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs flex items-center gap-1 transition"
                                >
                                  <Layers className="w-3 h-3" />
                                  Fractionate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REQUISITIONS & CROSSMATCH QUEUE */}
      {activeTab === "requisitions" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-2xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
                placeholder="Search Indents by Requisition # or Patient..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={reqUrgencyFilter}
                onChange={(e) => setReqUrgencyFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Urgency Levels</option>
                <option value="routine">Routine (4-6h)</option>
                <option value="urgent">Urgent (1-2h)</option>
                <option value="emergency_un_crossmatched">Emergency (STAT)</option>
                <option value="mtp">Massive Transfusion (MTP)</option>
              </select>

              <select
                value={reqStatusFilter}
                onChange={(e) => setReqStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Requisition Statuses</option>
                <option value="pending">Pending</option>
                <option value="sample_received">Sample Received</option>
                <option value="crossmatched">Crossmatched</option>
                <option value="issued">Issued</option>
              </select>
            </div>
          </div>

          {/* Requisitions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Indent #</th>
                    <th className="px-4 py-3">Urgency & Indication</th>
                    <th className="px-4 py-3">Recipient Patient</th>
                    <th className="px-4 py-3">Component / Group</th>
                    <th className="px-4 py-3">Units (Req/Cross/Iss)</th>
                    <th className="px-4 py-3">Ordering Doctor</th>
                    <th className="px-4 py-3">Indent Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingReqs ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        Loading blood requisitions queue...
                      </td>
                    </tr>
                  ) : reqsData?.data?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        No requisitions found in current queue.
                      </td>
                    </tr>
                  ) : (
                    reqsData?.data?.map((req) => {
                      const hasCrossmatches = req.crossmatches && req.crossmatches.length > 0

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {req.requisition_number}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block ${
                                req.urgency === "emergency_un_crossmatched" || req.urgency === "mtp"
                                  ? "bg-red-600 text-white animate-pulse-subtle"
                                  : req.urgency === "urgent"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              }`}
                            >
                              {req.urgency.replace(/_/g, " ")}
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5 truncate max-w-[200px]">
                              {req.clinical_indication || "Standard Crossmatch"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {req.patient?.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 block">
                              UHID: {req.patient?.uhid}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded text-[11px]">
                                {req.blood_group_needed}
                              </span>
                              <span className="uppercase font-semibold text-slate-700 dark:text-slate-300">
                                {req.component_needed.replace("_", " ")}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {req.units_requested}
                            </span>
                            <span className="text-slate-400"> / {req.units_crossmatched} / {req.units_issued}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            Dr. {req.doctor?.name || "Consultant"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                                req.status === "issued"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : req.status === "crossmatched"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {req.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedReqForCrossmatch(req)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-2xs flex items-center gap-1 transition"
                              >
                                <GitCompare className="w-3 h-3" />
                                Crossmatch
                              </button>

                              {hasCrossmatches && (
                                <button
                                  onClick={() => setSelectedCrossmatchForTag(req.crossmatches![0])}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1 transition"
                                  title="Print NABH Transfusion Compatibility Tag"
                                >
                                  <Printer className="w-3 h-3" />
                                  Tag
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DONORS & SCREENING */}
      {activeTab === "donors" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-2xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={donorSearch}
                onChange={(e) => setDonorSearch(e.target.value)}
                placeholder="Search donors by Name, Mobile, or Donor #..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={donorTypeFilter}
                onChange={(e) => setDonorTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Donor Types</option>
                <option value="voluntary">Voluntary Non-Remunerated</option>
                <option value="replacement">Family / Replacement</option>
              </select>

              <select
                value={donorDeferralFilter}
                onChange={(e) => setDonorDeferralFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Eligibility</option>
                <option value="eligible">Eligible</option>
                <option value="temporary_deferred">Temporary Deferred</option>
                <option value="permanent_deferred">Permanent Deferred</option>
              </select>
            </div>
          </div>

          {/* Donors Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Donor Number</th>
                    <th className="px-4 py-3">Full Name & Mobile</th>
                    <th className="px-4 py-3">Blood Group</th>
                    <th className="px-4 py-3">Age / Gender</th>
                    <th className="px-4 py-3">Donor Type</th>
                    <th className="px-4 py-3">Total Donations</th>
                    <th className="px-4 py-3">Deferral Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingDonors ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        Loading donors directory...
                      </td>
                    </tr>
                  ) : donorsData?.data?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        No donors found. Click "+ Register Donor" to enroll a new voluntary or replacement donor.
                      </td>
                    </tr>
                  ) : (
                    donorsData?.data?.map((donor) => {
                      const isEligible = donor.deferral_status === "eligible"

                      return (
                        <tr key={donor.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {donor.donor_number}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {donor.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              📱 {donor.mobile}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-300">
                              {donor.blood_group}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {donor.age} yrs • {donor.gender}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                                donor.donor_type === "voluntary"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              }`}
                            >
                              {donor.donor_type}
                            </span>
                            {donor.patient && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                                For: {donor.patient.name}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">
                            {donor.total_donations} time(s)
                            {donor.last_donated_at && (
                              <span className="text-[10px] text-slate-400 block">
                                Last: {donor.last_donated_at.split("T")[0]}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                isEligible
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {donor.deferral_status.replace("_", " ")}
                            </span>
                            {donor.deferral_reason && (
                              <span className="text-[10px] text-red-500 block truncate max-w-[150px]">
                                {donor.deferral_reason}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedDonorForScreening(donor)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs flex items-center gap-1 transition ml-auto"
                            >
                              <FileHeart className="w-3 h-3" />
                              Screen & Vitals
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OUTDOOR CAMPS */}
      {activeTab === "camps" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Outdoor Voluntary Blood Donation Camps & Drives
              </h3>
              <p className="text-xs text-slate-500">
                Community blood drives with colleges, corporates, and NGOs
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateCampOpen(true)}
              className="gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Schedule New Camp
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingCamps ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                Loading outdoor blood donation camps...
              </div>
            ) : campsData?.data?.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                No blood donation camps scheduled yet. Click "Schedule New Camp" to plan a corporate or college donation drive.
              </div>
            ) : (
              campsData?.data?.map((camp) => {
                const percent = Math.min(100, Math.round((camp.units_collected / (camp.target_units || 1)) * 100))

                return (
                  <div
                    key={camp.id}
                    className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {camp.camp_name}
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3.5 h-3.5" />
                          {camp.organizer_name}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          camp.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : camp.status === "in_progress"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <p>📍 Location: {camp.location}</p>
                      <p>📅 Date: {camp.camp_date}</p>
                      {camp.coordinator_contact && <p>📞 Coordinator: {camp.coordinator_contact}</p>}
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600 dark:text-slate-400">Target Progress</span>
                        <span className="text-red-600 dark:text-red-400 font-bold">
                          {camp.units_collected} / {camp.target_units} Units ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-600 to-rose-600 h-2 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: REACTIONS / HEMOVIGILANCE */}
      {activeTab === "reactions" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                  National Hemovigilance Programme of India (HvPI) Desk
                </h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                  Statutory surveillance of adverse transfusion reactions in coordination with Pharmacovigilance Programme of India (PvPI). All reported events automatically quarantine remaining donor stock.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsReactionModalOpen(true)}
              className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white shrink-0"
            >
              <ShieldAlert className="w-4 h-4" />
              Report New Reaction
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              HvPI Transfusion Vigilance Active
            </p>
            <p className="text-slate-400 mt-1">
              Zero un-investigated sentinel reactions recorded. Any report logged via the desk will appear here with root-cause analysis findings.
            </p>
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* 1. Register Donor Modal */}
      <RegisterDonorModal
        isOpen={isRegisterDonorOpen}
        onClose={() => setIsRegisterDonorOpen(false)}
        onSuccess={(donor) => {
          setSelectedDonorForScreening(donor)
        }}
      />

      {/* 2. Donor Screening & Medical Exam Modal */}
      <DonorScreeningModal
        isOpen={!!selectedDonorForScreening}
        onClose={() => setSelectedDonorForScreening(null)}
        donor={selectedDonorForScreening}
      />

      {/* 3. TTI Pathogen Testing Modal */}
      <TtiTestWorkbenchModal
        isOpen={!!selectedUnitForTti}
        onClose={() => setSelectedUnitForTti(null)}
        unit={selectedUnitForTti}
      />

      {/* 4. Refrigerated Centrifuge Component Separation Modal */}
      <ComponentSeparationModal
        isOpen={!!selectedUnitForSeparation}
        onClose={() => setSelectedUnitForSeparation(null)}
        unit={selectedUnitForSeparation}
      />

      {/* 5. Create Blood Requisition Modal */}
      <CreateBloodRequisitionModal
        isOpen={isCreateRequisitionOpen}
        onClose={() => setIsCreateRequisitionOpen(false)}
        onSuccess={() => {
          setActiveTab("requisitions")
        }}
      />

      {/* 6. Crossmatch & Issue Desk Modal */}
      <CrossmatchWorkbenchModal
        isOpen={!!selectedReqForCrossmatch}
        onClose={() => setSelectedReqForCrossmatch(null)}
        requisition={selectedReqForCrossmatch}
        onPrintTag={(crossmatch) => {
          setSelectedCrossmatchForTag(crossmatch)
        }}
      />

      {/* 7. Print Compatibility Tag Modal */}
      <PrintCompatibilityTagModal
        isOpen={!!selectedCrossmatchForTag}
        onClose={() => setSelectedCrossmatchForTag(null)}
        crossmatch={selectedCrossmatchForTag}
      />

      {/* 8. Hemovigilance Adverse Reaction Modal */}
      <HemovigilanceReactionModal
        isOpen={isReactionModalOpen}
        onClose={() => setIsReactionModalOpen(false)}
      />

      {/* 9. Schedule New Camp Modal */}
      {isCreateCampOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="w-5 h-5 text-red-600" />
                Schedule Outdoor Blood Donation Drive
              </h3>
              <button
                onClick={() => setIsCreateCampOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createCampMutation.mutate()
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Camp Title / Name *
                </label>
                <input
                  type="text"
                  required
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="e.g. Rotary Club Annual Mega Blood Drive"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Partner / Organizing Body *
                </label>
                <input
                  type="text"
                  required
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="e.g. Red Cross Society / Infosys Campus"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Camp Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={campDate}
                    onChange={(e) => setCampDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Target Units *
                  </label>
                  <input
                    type="number"
                    required
                    value={targetUnits}
                    onChange={(e) => setTargetUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Venue / Location Address *
                </label>
                <input
                  type="text"
                  required
                  value={campLocation}
                  onChange={(e) => setCampLocation(e.target.value)}
                  placeholder="e.g. Community Centre Auditorium, Sector 14"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Coordinator Name & Phone
                </label>
                <input
                  type="text"
                  value={coordinatorContact}
                  onChange={(e) => setCoordinatorContact(e.target.value)}
                  placeholder="e.g. Rajesh Sharma (+91 98765 43210)"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateCampOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createCampMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {createCampMutation.isPending ? "Scheduling..." : "Schedule Camp"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Screening Protocol Setup Modal */}
      <ScreeningConfigModal
        isOpen={isScreeningConfigOpen}
        onClose={() => setIsScreeningConfigOpen(false)}
      />
    </div>
  )
}

export default BloodBankDeskPage
