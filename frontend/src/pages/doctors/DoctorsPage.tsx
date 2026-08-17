import { useCallback, useMemo } from "react"
import {
  Eye,
  Pencil,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  ShieldAlert,
  Activity,
  Clock,
} from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

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
import { doctorService } from "@/services/doctorService"
import { departmentService } from "@/services/departmentService"
import { queryKeys } from "@/constants/queryKeys"
import {
  INITIAL_FILTERS,
  STATUS_OPTIONS,
  DAYS_OF_WEEK,
} from "@/constants/doctor.constants"
import DoctorEdit from "@/components/modals/doctorEdit"
import type { Doctor } from "@/types/doctor"

export function DoctorsPage() {
  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)
  const queryClient = useQueryClient()
  const deleteDisclosure = useDisclosure<Doctor>()
  const editDisclosure = useDisclosure<Doctor & { viewMode?: boolean }>()

  // Fetch doctors list
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.doctors.list(filter),
    queryFn: () => doctorService.getDoctors(filter),
  })

  const doctorsList = data?.data || []
  const meta: any = data?.meta || {}

  // Fetch active departments for the filter dropdown
  const { data: deptData } = useQuery({
    queryKey: queryKeys.departments.all,
    queryFn: () =>
      departmentService.getDepartments({ all: true, is_active: true }),
  })
  const departments = Array.isArray(deptData)
    ? deptData
    : (deptData as any)?.data || []

  const departmentOptions = useMemo(() => {
    return departments.map((dept: any) => ({
      label: dept.name,
      value: String(dept.id),
    }))
  }, [departments])

  const deleteDoctorMutation = useMutation({
    mutationFn: (id: string | number) => doctorService.deleteDoctor(id),
    onSuccess: () => {
      toast.success("Doctor profile deleted successfully")
      queryClient.invalidateQueries({ queryKey: queryKeys.doctors.all })
      deleteDisclosure.onClose()
    },
    meta: {
      errorTitle: "Failed to delete doctor profile",
    },
  })

  const handleFilterChange = useCallback(
    (updates: Record<string, any>) => handleFilter({ ...updates, page: 1 }),
    [handleFilter]
  )

  const stats: StatItem[] = useMemo(() => {
    const total = meta.total || doctorsList.length || 0
    const activeCount = doctorsList.filter((d) => d.is_active !== false).length
    const inactiveCount = doctorsList.filter(
      (d) => d.is_active === false
    ).length
    const uniqueSpecialties = new Set(
      doctorsList.map((d) => d.specialization).filter(Boolean)
    ).size

    return [
      {
        title: "Total Physicians",
        value: total,
        description: "Registered medical staff",
        icon: <Users className="h-6 w-6" />,
        colorScheme: "blue",
      },
      {
        title: "Active Roster",
        value: activeCount,
        description:
          total > 0
            ? `${Math.round((activeCount / total) * 100)}% active`
            : "100% active",
        icon: <CheckCircle2 className="h-6 w-6" />,
        colorScheme: "emerald",
      },
      {
        title: "Inactive Staff",
        value: inactiveCount,
        description: "Suspended or off-roster",
        icon: <ShieldAlert className="h-6 w-6" />,
        colorScheme: "amber",
      },
      {
        title: "Medical Specialties",
        value: uniqueSpecialties,
        description: "Distinct clinical areas",
        icon: <Activity className="h-6 w-6" />,
        colorScheme: "purple",
      },
    ]
  }, [meta, doctorsList])

  const columns = useMemo<DataTableColumn<Doctor>[]>(
    () => [
      {
        key: "name",
        header: "Physician Name",
        render: (row) => (
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                {row.name}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {row.specialization || "General Physician"}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "department",
        header: "Department & Credentials",
        render: (row) => (
          <div>
            <p className="text-xs font-semibold text-foreground">
              {row.department?.name || "General Unit"}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {row.qualification || "MBBS"}
            </p>
          </div>
        ),
      },
      {
        key: "schedule",
        header: "Weekly OPD Roster",
        render: (row) => {
          const activeDays =
            row.schedules
              ?.filter((s) => s.is_active !== false)
              .map((s) => {
                const day = DAYS_OF_WEEK.find(
                  (d) => d.value === Number(s.day_of_week)
                )
                return day ? day.label.substring(0, 3) : ""
              })
              .filter(Boolean) || []

          return (
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {activeDays.length > 0
                  ? activeDays.join(", ")
                  : "No Duty Schedule"}
              </span>
            </div>
          )
        },
      },
      {
        key: "consultation_time",
        header: "Slot Duration",
        render: (row) => (
          <span className="font-mono text-xs font-medium text-foreground">
            {row.consultation_time || 15} mins
          </span>
        ),
      },
      {
        key: "is_active",
        header: "Roster Status",
        render: (row) => (
          <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />
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
      <PageHeaderBanner
        title="Doctors Directory & OPD Roster"
        subtitle="Manage physician profiles, credentials, and weekly OPD consultation rosters."
        imageSrc="/hospital.png"
        imageAlt="Doctors Directory Header"
      />

      <StatCardsRow stats={stats} isLoading={isLoading} />

      <SectionCard
        title="Active Physicians Directory"
        description="Filter and search registered doctors, specialization, or update shift schedules."
        actions={
          <Button
            onClick={() => editDisclosure.onOpen()}
            className="bg-blue-600 font-semibold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Register Doctor
          </Button>
        }
      >
        <div className="space-y-4">
          <FilterBar values={filter} onChange={handleFilterChange}>
            <FilterBar.Search
              name="search"
              placeholder="Search doctor name, specialization, qualification, phone..."
              className="w-[320px]"
            />
            <FilterBar.Select
              name="department_id"
              placeholder="All Departments"
              options={departmentOptions}
              className="w-[200px]"
            />
            <FilterBar.Select
              name="is_active"
              placeholder="All Statuses"
              options={STATUS_OPTIONS}
              className="w-[180px]"
            />
          </FilterBar>

          <DataTable
            columns={columns}
            data={doctorsList}
            rowKey="id"
            currentPage={filter.page}
            pageSize={filter.limit}
            totalRecords={meta.total || doctorsList.length}
            lastPage={meta.last_page || 1}
            isLoading={isLoading}
            onPageChange={(page) => handleFilter({ page })}
            handlePageSizeChange={(limit) => handleFilter({ limit, page: 1 })}
            emptyTitle="No doctor profiles found"
            emptyDescription="Try adjusting your search criteria or register a new physician profile."
          />
        </div>
      </SectionCard>

      <DoctorEdit
        open={editDisclosure.isOpen}
        onClose={editDisclosure.onClose}
        doctor={editDisclosure.data}
      />

      <ConfirmDialog
        open={deleteDisclosure.isOpen}
        onOpenChange={deleteDisclosure.onClose}
        title="Delete Doctor Profile"
        description={`Delete profile for ${deleteDisclosure.data?.name || "this doctor"}? This will deactivate/delete their user login credentials and rosters.`}
        onConfirm={() =>
          deleteDoctorMutation.mutate(deleteDisclosure.data?.id || "")
        }
        isLoading={deleteDoctorMutation.isPending}
        confirmText="Delete Profile"
        variant="danger"
      />
    </div>
  )
}

export default DoctorsPage
