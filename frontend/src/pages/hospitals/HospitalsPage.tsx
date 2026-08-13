import { useCallback, useMemo } from "react"
import {
  Eye,
  Pencil,
  Plus,
  Trash2,
  Building2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Activity,
} from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/StatusBadge"
import { FilterBar } from "@/components/filter-bar"
import SectionCard from "@/components/SectionCard"
import StatCardsRow, { type StatItem } from "@/components/common/stat-cards-row"
import PageHeaderBanner from "@/components/common/PageHeaderBanner"
import DataTable, { type DataTableColumn } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/confirmDialog"
import { useDisclosure } from "@/hooks/useDisclosure"
import { useSearchFilter } from "@/hooks/useSearchFilter"
import { hospitalService } from "@/services/hospitalService"
import { queryKeys } from "@/constants/queryKeys"
import { INITIAL_FILTERS } from "@/constants/hospital.constants"
import HospitalEdit from "@/components/modals/hospitalEdit"
import type { Hospital } from "@/types/hospital"

export function HospitalsPage() {
  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)
  const queryClient = useQueryClient()
  const deleteDisclosure = useDisclosure<Hospital>()
  const editDisclosure = useDisclosure<Hospital & { viewMode?: boolean }>()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.hospitals.list(filter),
    queryFn: () => hospitalService.getHospitals(filter),
  })

  const hospitalsList: Hospital[] = (data as any)?.data || []
  const meta = (data as any)?.meta || {}

  const deleteHospitalMutation = useMutation({
    mutationFn: (id: string | number) => hospitalService.deleteHospital(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hospitals.all })
      deleteDisclosure.onClose()
    },
  })

  const handleFilterChange = useCallback(
    (updates: Record<string, any>) => handleFilter({ ...updates, page: 1 }),
    [handleFilter]
  )

  const stats: StatItem[] = useMemo(() => {
    const total = meta.total || hospitalsList.length || 0
    const active = hospitalsList.length
    const linkedCount = hospitalsList.filter((h) => h.abdm_hip_id).length
    const abdmPct =
      hospitalsList.length > 0
        ? `${Math.round((linkedCount / hospitalsList.length) * 100)}%`
        : "100%"

    return [
      {
        title: "Total Facilities",
        value: total,
        description: "All registered hospitals",
        icon: <Building2 className="h-6 w-6" />,
        colorScheme: "blue",
      },
      {
        title: "Active Facilities",
        value: active,
        description:
          total > 0
            ? `${Math.round((active / total) * 100)}% of total`
            : "100% of total",
        icon: <CheckCircle2 className="h-6 w-6" />,
        colorScheme: "emerald",
      },
      {
        title: "Pending Review",
        value: 0,
        description: "Awaiting verification",
        icon: <Clock className="h-6 w-6" />,
        colorScheme: "purple",
      },
      {
        title: "Inactive Facilities",
        value: 0,
        description: "Deactivated facilities",
        icon: <ShieldAlert className="h-6 w-6" />,
        colorScheme: "rose",
      },
      {
        title: "ABDM Compliance",
        value: abdmPct,
        description: "Network compliance rate",
        icon: <Activity className="h-6 w-6" />,
        colorScheme: "cyan",
      },
    ]
  }, [meta, hospitalsList])

  const columns = useMemo<DataTableColumn<Hospital>[]>(
    () => [
      {
        key: "name",
        header: "Hospital Facility",
        render: (row) => (
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                {row.name}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {row.code && (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold">
                    {row.code}
                  </span>
                )}
                {(row.city || row.state) && (
                  <span>
                    {[row.city, row.state].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "abdm_hip_id",
        header: "ABDM Facility HIP ID",
        render: (row) => (
          <span className="font-mono text-xs font-bold text-foreground">
            {row.abdm_hip_id || "NOT_LINKED"}
          </span>
        ),
      },
      {
        key: "location",
        header: "Location",
        render: (row) => (
          <div className="text-xs">
            <p className="font-medium text-foreground">{row.city || "—"}</p>
            <p className="text-muted-foreground">{row.state}</p>
          </div>
        ),
      },
      {
        key: "contact",
        header: "Contact Details",
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.email || "N/A"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: () => <StatusBadge status="ACTIVE" />,
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => editDisclosure.onOpen({ ...row, viewMode: true })}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => editDisclosure.onOpen(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => deleteDisclosure.onOpen(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [editDisclosure, deleteDisclosure]
  )

  return (
    <div className="space-y-6">
      {/* <PageHeaderBanner
        title="Super Admin – Hospital Facilities"
        badgeText="Super Admin Portal"
        subtitle="Onboard, manage, and authorize healthcare facilities registered with NHA ABDM registry."
        imageSrc="/hospital.png"
        imageAlt="Hospital Facility"
      /> */}

      <StatCardsRow stats={stats} isLoading={isLoading} />

      <SectionCard
        title="Registered Hospital Facilities"
        description="Filter and search all onboarded medical facilities in the network."
        actions={
          <Button
            onClick={() => editDisclosure.onOpen()}
            className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Onboard Hospital
          </Button>
        }
      >
        <div className="space-y-4">
          <FilterBar
            values={{ search: filter.search }}
            onChange={handleFilterChange}
          >
            <FilterBar.Search
              name="search"
              placeholder="Search facility name, ABDM HIP ID, city, email..."
              className="w-[350px]"
            />
          </FilterBar>

          <DataTable
            columns={columns}
            data={hospitalsList}
            rowKey="id"
            currentPage={filter.page}
            pageSize={filter.limit}
            totalRecords={meta.total || hospitalsList.length}
            lastPage={meta.last_page || 1}
            isLoading={isLoading}
            onPageChange={(page) => handleFilter({ page })}
            handlePageSizeChange={(limit) => handleFilter({ limit, page: 1 })}
            emptyTitle="No hospital facilities found"
            emptyDescription="Try adjusting your search criteria or onboard a new hospital facility."
          />
        </div>
      </SectionCard>

      <HospitalEdit
        open={editDisclosure.isOpen}
        onClose={editDisclosure.onClose}
        hospital={editDisclosure.data}
      />

      <ConfirmDialog
        open={deleteDisclosure.isOpen}
        onOpenChange={deleteDisclosure.onClose}
        title="Delete Hospital Facility"
        description={`Delete ${deleteDisclosure.data?.name || "this hospital facility"}? This action cannot be undone.`}
        onConfirm={() =>
          deleteHospitalMutation.mutate(deleteDisclosure.data?.id || "")
        }
        isLoading={deleteHospitalMutation.isPending}
        confirmText="Delete Facility"
        variant="danger"
      />
    </div>
  )
}

export default HospitalsPage
