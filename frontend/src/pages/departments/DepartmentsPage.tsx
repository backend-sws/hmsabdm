import { useCallback, useMemo } from "react"
import {
  Eye,
  Pencil,
  Plus,
  Trash2,
  Stethoscope,
  CheckCircle2,
  ShieldAlert,
  Users,
  Activity,
  Building2,
} from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/StatusBadge"
import { FilterBar } from "@/components/filter-bar"
import SectionCard from "@/components/SectionCard"
import StatCardsRow, { type StatItem } from "@/components/common/stat-cards-row"
import { PageHeader } from "@/components/common/PageHeader"
import DataTable, { type DataTableColumn } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/confirmDialog"
import { useDisclosure } from "@/hooks/useDisclosure"
import { useSearchFilter } from "@/hooks/useSearchFilter"
import { departmentService } from "@/services/departmentService"
import { queryKeys } from "@/constants/queryKeys"
import { INITIAL_FILTERS, STATUS_OPTIONS } from "@/constants/department.constants"
import DepartmentEdit from "@/components/modals/departmentEdit"
import type { Department } from "@/types/department"

export function DepartmentsPage() {
  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)
  const queryClient = useQueryClient()
  const deleteDisclosure = useDisclosure<Department>()
  const editDisclosure = useDisclosure<Department & { viewMode?: boolean }>()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.departments.list(filter),
    queryFn: () => departmentService.getDepartments(filter),
  })

  const departmentsList: Department[] = (data as any)?.data || []
  const meta = (data as any)?.meta || {}

  const deleteDepartmentMutation = useMutation({
    mutationFn: (id: string | number) => departmentService.deleteDepartment(id),
    onSuccess: () => {
      toast.success("Department deleted successfully")
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all })
      deleteDisclosure.onClose()
    },
    meta: {
      errorTitle: "Failed to delete department",
    },
  })

  const handleFilterChange = useCallback(
    (updates: Record<string, any>) => handleFilter({ ...updates, page: 1 }),
    [handleFilter]
  )

  const stats: StatItem[] = useMemo(() => {
    const total = meta.total || departmentsList.length || 0
    const activeCount = departmentsList.filter((d) => d.is_active !== false).length
    const inactiveCount = departmentsList.filter((d) => d.is_active === false).length
    const totalDoctors = departmentsList.reduce(
      (sum, d) => sum + (d.doctors_count || 0),
      0
    )

    return [
      {
        title: "Clinical Units",
        value: total,
        description: "Registered hospital wings",
        icon: <Stethoscope className="h-6 w-6" />,
        colorScheme: "blue",
      },
      {
        title: "Active Departments",
        value: activeCount,
        description:
          total > 0
            ? `${Math.round((activeCount / total) * 100)}% active`
            : "100% active",
        icon: <CheckCircle2 className="h-6 w-6" />,
        colorScheme: "emerald",
      },
      {
        title: "Inactive Wings",
        value: inactiveCount,
        description: "Suspended/Inactive units",
        icon: <ShieldAlert className="h-6 w-6" />,
        colorScheme: "amber",
      },
      {
        title: "Assigned Medical Staff",
        value: totalDoctors,
        description: "Doctors across departments",
        icon: <Users className="h-6 w-6" />,
        colorScheme: "purple",
      },
      {
        title: "Operational Status",
        value: "100%",
        description: "Network readiness",
        icon: <Activity className="h-6 w-6" />,
        colorScheme: "cyan",
      },
    ]
  }, [meta, departmentsList])

  const columns = useMemo<DataTableColumn<Department>[]>(
    () => [
      {
        key: "name",
        header: "Department Wing",
        render: (row) => (
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                {row.name}
                {row.code && (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                    {row.code}
                  </span>
                )}
              </div>
              {row.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {row.description}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "doctors_count",
        header: "Assigned Physicians",
        render: (row) => (
          <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{row.doctors_count || 0} Doctors</span>
          </div>
        ),
      },
      {
        key: "is_active",
        header: "Status",
        render: (row) => (
          <StatusBadge status={row.is_active !== false ? "ACTIVE" : "INACTIVE"} />
        ),
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
      <PageHeader
        title="Hospital Clinical Departments"
        subtitle="Manage hospital clinical departments, OPD wings, and assigned medical staff."
        badgeText="Core Infrastructure"
        badgeVariant="default"
        icon={Building2}
        actions={
          <Button
            onClick={() => editDisclosure.onOpen()}
            className="bg-primary font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] h-9 gap-1.5 text-xs sm:text-sm shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        }
      />

      <StatCardsRow stats={stats} isLoading={isLoading} />

      <SectionCard
        title="Active Clinical Departments"
        description="Filter and search all registered departments and medical units."
        actions={
          <Button
            onClick={() => editDisclosure.onOpen()}
            className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        }
      >
        <div className="space-y-4">
          <FilterBar
            values={filter}
            onChange={handleFilterChange}
          >
            <FilterBar.Search
              name="search"
              placeholder="Search department name, code, description..."
              className="w-[320px]"
            />
            <FilterBar.Select
              name="status"
              placeholder="All Statuses"
              options={STATUS_OPTIONS}
              className="w-[180px]"
            />
          </FilterBar>

          <DataTable
            columns={columns}
            data={departmentsList}
            rowKey="id"
            currentPage={filter.page}
            pageSize={filter.limit}
            totalRecords={meta.total || departmentsList.length}
            lastPage={meta.last_page || 1}
            isLoading={isLoading}
            onPageChange={(page) => handleFilter({ page })}
            handlePageSizeChange={(limit) => handleFilter({ limit, page: 1 })}
            emptyTitle="No clinical departments found"
            emptyDescription="Try adjusting your search criteria or register a new clinical department."
          />
        </div>
      </SectionCard>

      <DepartmentEdit
        open={editDisclosure.isOpen}
        onClose={editDisclosure.onClose}
        department={editDisclosure.data}
      />

      <ConfirmDialog
        open={deleteDisclosure.isOpen}
        onOpenChange={deleteDisclosure.onClose}
        title="Delete Department"
        description={`Delete ${deleteDisclosure.data?.name || "this department"}? This action cannot be undone.`}
        onConfirm={() =>
          deleteDepartmentMutation.mutate(deleteDisclosure.data?.id || "")
        }
        isLoading={deleteDepartmentMutation.isPending}
        confirmText="Delete Department"
        variant="danger"
      />
    </div>
  )
}

export default DepartmentsPage
