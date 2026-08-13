import React, { useCallback, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Building2,
  MapPin,
  Mail,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Activity,
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react"

import { useSearchFilter } from "@/hooks/useSearchFilter"
import { useDisclosure } from "@/hooks/useDisclosure"
import { FormContainer } from "@/components/formContainer"
import { ConfirmDialog } from "@/components/confirmDialog"
import { sectionHeader } from "@/components/sectionHeader"
import { PageHeaderBanner } from "@/components/common/PageHeaderBanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { hospitalService } from "@/services/hospitalService"
import { queryKeys } from "@/constants/queryKeys"
import type { Hospital, CreateHospitalDto } from "@/types/hospital"

const INITIAL_FILTERS = {
  search: "",
  page: 1,
  limit: 10,
}

interface HospitalFormData {
  name: string
  code: string
  abdm_hip_id: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
}

const defaultFormData: HospitalFormData = {
  name: "",
  code: "",
  abdm_hip_id: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
}

const DEMO_HOSPITALS: Hospital[] = [
  {
    id: "demo-1",
    name: "Sandra Boehm",
    code: "24241",
    abdm_hip_id: "62424",
    city: "Pittsfield",
    state: "California",
    email: "",
    phone: "",
    address: "Pittsfield, California",
  },
  {
    id: "demo-2",
    name: "Enrique Haag",
    code: "57124",
    abdm_hip_id: "39694",
    city: "Lynwood",
    state: "Oklahoma",
    email: "",
    phone: "",
    address: "Lynwood, Oklahoma",
  },
  {
    id: "demo-3",
    name: "Rico Harris",
    code: "66583",
    abdm_hip_id: "10687",
    city: "Cathedral City",
    state: "Alabama",
    email: "",
    phone: "",
    address: "Cathedral City, Alabama",
  },
  {
    id: "demo-4",
    name: "City Care",
    code: "CCH-01",
    abdm_hip_id: "HIP-9999",
    city: "New Delhi",
    state: "Delhi",
    email: "contact@citycare.com",
    phone: "011-23456789",
    address: "123 Main St, Sector 4",
  },
  {
    id: "demo-5",
    name: "Demo Care Hospital",
    code: "HIP-01",
    abdm_hip_id: "HIP-DEMO-001",
    city: "Bengaluru",
    state: "Karnataka",
    email: "admin@democare.org",
    phone: "080-99887766",
    address: "123 Demo St, Testing City",
  },
]

export const HospitalsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)

  const dialogDisclosure = useDisclosure<Hospital & { viewMode?: boolean }>()
  const deleteDisclosure = useDisclosure<Hospital>()

  const [formData, setFormData] = useState<HospitalFormData>(defaultFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Fetch Hospitals from API
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.hospitals.list(filter),
    queryFn: () => hospitalService.getHospitals(filter),
  })

  const rawApiList = data?.data || (Array.isArray(data) ? data : [])
  const meta = data?.meta

  const hospitalsList = useMemo(() => {
    if (data !== undefined) return rawApiList
    return DEMO_HOSPITALS
  }, [data, rawApiList])

  const totalCount = meta?.total ?? hospitalsList.length
  const currentPage = meta?.current_page ?? filter.page
  const limit = meta?.per_page ?? filter.limit
  const lastPage = meta?.last_page ?? Math.max(1, Math.ceil(totalCount / limit))

  const activeCount = useMemo(() => {
    return hospitalsList.length
  }, [hospitalsList])

  const abdmPercentage = useMemo(() => {
    if (!hospitalsList.length) return "100%"
    const linked = hospitalsList.filter((h) => h.abdm_hip_id).length
    return `${Math.round((linked / hospitalsList.length) * 100)}%`
  }, [hospitalsList])

  const filteredHospitals = useMemo(() => {
    if (!filter.search) return hospitalsList
    const term = filter.search.toLowerCase()
    return hospitalsList.filter(
      (h) =>
        h.name?.toLowerCase().includes(term) ||
        h.code?.toLowerCase().includes(term) ||
        h.abdm_hip_id?.toLowerCase().includes(term) ||
        h.city?.toLowerCase().includes(term) ||
        h.state?.toLowerCase().includes(term) ||
        h.email?.toLowerCase().includes(term) ||
        h.phone?.toLowerCase().includes(term)
    )
  }, [hospitalsList, filter.search])

  const handleFilterChange = useCallback(
    (updates: Record<string, any>) => {
      handleFilter({ ...updates, page: 1 })
    },
    [handleFilter]
  )

  // Dialog Handlers
  const handleOpenDialog = (
    item?: Hospital | null,
    viewMode: boolean = false
  ) => {
    setFormErrors({})
    if (item) {
      setFormData({
        name: item.name || "",
        code: item.code || "",
        abdm_hip_id: item.abdm_hip_id || "",
        email: item.email || "",
        phone: item.phone || "",
        address: item.address || "",
        city: item.city || "",
        state: item.state || "",
        pincode: item.pincode || "",
      })
      dialogDisclosure.onOpen({ ...item, viewMode })
    } else {
      setFormData(defaultFormData)
      dialogDisclosure.onOpen({ id: "", name: "", viewMode: false })
    }
  }

  const handleCloseDialog = () => {
    dialogDisclosure.onClose()
    setFormData(defaultFormData)
    setFormErrors({})
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: (dto: CreateHospitalDto) => hospitalService.createHospital(dto),
    onSuccess: () => {
      toast.success("Hospital registered successfully")
      queryClient.invalidateQueries({ queryKey: queryKeys.hospitals.all })
      handleCloseDialog()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to register hospital")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string | number
      dto: CreateHospitalDto
    }) => hospitalService.updateHospital(id, dto),
    onSuccess: () => {
      toast.success("Hospital updated successfully")
      queryClient.invalidateQueries({ queryKey: queryKeys.hospitals.all })
      handleCloseDialog()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update hospital")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => hospitalService.deleteHospital(id),
    onSuccess: () => {
      toast.success("Hospital deleted successfully")
      queryClient.invalidateQueries({ queryKey: queryKeys.hospitals.all })
      deleteDisclosure.onClose()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete hospital")
    },
  })

  const handleInputChange = (field: keyof HospitalFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const errors: Record<string, string> = {}
    if (!formData.name.trim()) {
      errors.name = "Hospital facility name is required"
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const isEditMode =
      !!dialogDisclosure.data?.id &&
      !String(dialogDisclosure.data?.id).startsWith("demo-")
    if (isEditMode && dialogDisclosure.data?.id) {
      updateMutation.mutate({ id: dialogDisclosure.data.id, dto: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isViewMode = !!dialogDisclosure.data?.viewMode
  const isEditing = !!dialogDisclosure.data?.id && !isViewMode
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const fromItem = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1
  const toItem = totalCount === 0 ? 0 : Math.min(currentPage * limit, totalCount)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (lastPage <= 7) {
      for (let i = 1; i <= lastPage; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push("...")
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(lastPage - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < lastPage - 2) pages.push("...")
      pages.push(lastPage)
    }
    return pages
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Component */}
      <PageHeaderBanner
        title="Super Admin – Hospital Facilities"
        badgeText="Super Admin Portal"
        subtitle="Onboard, manage, and authorize healthcare facilities registered with NHA ABDM registry."
        imageSrc="/hospital.png"
        imageAlt="Hospital Facility"
        actions={
          <Button
            onClick={() => handleOpenDialog(null, false)}
            className="bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98]"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Onboard Hospital
          </Button>
        }
      />

      {/* 2. Top Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Facilities */}
        <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-2xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Total Facilities
            </p>
            <h3 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">
              {totalCount}
            </h3>
            <p className="text-xs font-medium text-muted-foreground/80">
              All registered hospitals
            </p>
          </div>
        </div>

        {/* Card 2: Active Facilities */}
        <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-2xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Active Facilities
            </p>
            <h3 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">
              {activeCount}
            </h3>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {totalCount > 0
                ? `${Math.round((activeCount / totalCount) * 100)}% of total`
                : "100% of total"}
            </p>
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-2xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Pending Review
            </p>
            <h3 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">
              0
            </h3>
            <p className="text-xs font-medium text-muted-foreground/80">
              Awaiting verification
            </p>
          </div>
        </div>

        {/* Card 4: Inactive Facilities */}
        <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-2xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Inactive Facilities
            </p>
            <h3 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">
              0
            </h3>
            <p className="text-xs font-medium text-muted-foreground/80">
              Deactivated facilities
            </p>
          </div>
        </div>

        {/* Card 5: ABDM Compliance */}
        <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-2xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              ABDM Compliance
            </p>
            <h3 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">
              {abdmPercentage}
            </h3>
            <p className="text-xs font-medium text-muted-foreground/80">
              Network compliance rate
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Registered Hospital Facilities Card */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xs">
        {/* Card Header & Search */}
        <div className="space-y-4 border-b border-border/60 p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                Registered Hospital Facilities
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Filter and search all onboarded medical facilities in the
                network.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-border text-xs font-semibold"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters &gt;
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search facility name, ABDM HIP ID, city, email..."
              value={filter.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              className="h-10 rounded-xl border-border/80 bg-background/50 pl-10 text-sm focus-visible:ring-blue-600"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="relative overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border/70 bg-muted/30 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              <tr>
                <th className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    HOSPITAL FACILITY <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    ABDM FACILITY HIP ID <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-4">LOCATION</th>
                <th className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    CONTACT DETAILS <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    STATUS <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    Loading hospital facilities...
                  </td>
                </tr>
              ) : filteredHospitals.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No hospital facilities found matching your search.
                  </td>
                </tr>
              ) : (
                filteredHospitals.map((row) => (
                  <tr
                    key={String(row.id)}
                    className="transition-colors hover:bg-muted/20"
                  >
                    {/* Hospital Facility */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">
                              {row.name}
                            </span>
                            <CheckCircle2 className="h-4 w-4 fill-blue-600/20 text-blue-600" />
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            {row.code && (
                              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold">
                                {row.code}
                              </span>
                            )}
                            {(row.city || row.state) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {[row.city, row.state]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* ABDM Facility HIP ID */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 fill-emerald-500/20 text-emerald-500" />
                        <span className="font-mono text-xs font-bold text-foreground">
                          {row.abdm_hip_id || "NOT_LINKED"}
                        </span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-xs font-medium text-foreground">
                        <p>{row.city || "—"}</p>
                        <p className="text-muted-foreground">{row.state}</p>
                      </div>
                    </td>

                    {/* Contact Details */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        <span>{row.email || "N/A"}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        ACTIVE
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDialog(row, true)}
                          title="View Details"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDialog(row, false)}
                          title="Edit Hospital"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDisclosure.onOpen(row)}
                          title="Delete Hospital"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/70 p-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p className="font-medium">
            Showing {fromItem} to {toItem} of {totalCount} facilities
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filter.limit}
              onChange={(e) =>
                handleFilter({ limit: Number(e.target.value), page: 1 })
              }
              className="h-8 rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 rounded-lg px-2.5 text-xs"
                disabled={currentPage <= 1}
                onClick={() => handleFilter({ page: currentPage - 1 })}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>

              {getPageNumbers().map((page, idx) =>
                typeof page === "number" ? (
                  <Button
                    key={page}
                    size="sm"
                    variant={page === currentPage ? "default" : "ghost"}
                    onClick={() => handleFilter({ page })}
                    className={`h-8 w-8 rounded-lg p-0 text-xs font-bold ${
                      page === currentPage
                        ? "bg-blue-600 text-white"
                        : "text-muted-foreground"
                    }`}
                  >
                    {page}
                  </Button>
                ) : (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-muted-foreground"
                  >
                    ...
                  </span>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 rounded-lg px-2.5 text-xs"
                disabled={currentPage >= lastPage}
                onClick={() => handleFilter({ page: currentPage + 1 })}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Form Container Modal (Onboard / Edit / View) */}
      <FormContainer
        open={dialogDisclosure.isOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog()
        }}
        title={
          isViewMode
            ? `Facility Details - ${formData.name}`
            : isEditing
              ? `Edit Hospital Facility`
              : `Onboard New Hospital Facility`
        }
        description={
          isViewMode
            ? "View registered healthcare facility parameters and ABDM integration state."
            : "Enter required details to register or update a partner hospital."
        }
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={handleCloseDialog} type="button">
              {isViewMode ? "Close" : "Cancel"}
            </Button>
            {!isViewMode && (
              <Button
                type="submit"
                form="hospital-form"
                disabled={isSubmitting}
                className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Onboard Hospital"}
              </Button>
            )}
          </div>
        }
      >
        <form id="hospital-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Section 01 */}
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
            {sectionHeader("01", "Facility Identification")}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="hosp-name"
                  className="font-semibold after:ml-0.5 after:text-destructive after:content-['*']"
                >
                  Facility Name
                </Label>
                <Input
                  id="hosp-name"
                  placeholder="e.g. City Care Super Specialty Hospital"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  disabled={isViewMode}
                  className={
                    formErrors.name
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                {formErrors.name && (
                  <p className="text-xs text-destructive">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hosp-code" className="font-semibold">
                  Facility Code
                </Label>
                <Input
                  id="hosp-code"
                  placeholder="e.g. CCH-01"
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  disabled={isViewMode}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hosp-hip-id" className="font-semibold">
                  ABDM HIP ID (HPR)
                </Label>
                <Input
                  id="hosp-hip-id"
                  placeholder="e.g. HIP-1000452"
                  value={formData.abdm_hip_id}
                  onChange={(e) =>
                    handleInputChange("abdm_hip_id", e.target.value)
                  }
                  disabled={isViewMode}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 02 */}
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
            {sectionHeader("02", "Contact & Location Details")}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hosp-email" className="font-semibold">
                  Official Email
                </Label>
                <Input
                  id="hosp-email"
                  type="email"
                  placeholder="e.g. contact@citycarehospital.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={isViewMode}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hosp-phone" className="font-semibold">
                  Contact Phone
                </Label>
                <Input
                  id="hosp-phone"
                  placeholder="e.g. +91 11 2345 6789"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  disabled={isViewMode}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="hosp-address" className="font-semibold">
                  Street Address
                </Label>
                <Input
                  id="hosp-address"
                  placeholder="e.g. Plot 45, Knowledge Park III"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  disabled={isViewMode}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hosp-city" className="font-semibold">
                  City
                </Label>
                <Input
                  id="hosp-city"
                  placeholder="e.g. New Delhi"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  disabled={isViewMode}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hosp-state" className="font-semibold">
                  State
                </Label>
                <Input
                  id="hosp-state"
                  placeholder="e.g. Delhi"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  disabled={isViewMode}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="hosp-pincode" className="font-semibold">
                  Pincode
                </Label>
                <Input
                  id="hosp-pincode"
                  placeholder="e.g. 110001"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange("pincode", e.target.value)}
                  disabled={isViewMode}
                />
              </div>
            </div>
          </div>
        </form>
      </FormContainer>

      {/* 5. Delete Confirmation Modal */}
      <ConfirmDialog
        open={deleteDisclosure.isOpen}
        onOpenChange={deleteDisclosure.onClose}
        title="Delete Hospital Facility"
        description={`Are you sure you want to delete ${deleteDisclosure.data?.name || "this hospital"}? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteDisclosure.data?.id) {
            deleteMutation.mutate(deleteDisclosure.data.id)
          }
        }}
        isLoading={deleteMutation.isPending}
        confirmText="Delete Facility"
        variant="danger"
      />
    </div>
  )
}

export default HospitalsPage
