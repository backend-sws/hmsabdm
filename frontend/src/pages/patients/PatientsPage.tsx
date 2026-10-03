import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router"
import {
  Eye,
  Plus,
  Users,
  ShieldCheck,
  Activity,
  CalendarDays,
  RotateCcw,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { FilterBar } from "@/components/filter-bar"
import SectionCard from "@/components/SectionCard"
import StatCardsRow, { type StatItem } from "@/components/common/stat-cards-row"
import { PageHeader } from "@/components/common/PageHeader"
import DataTable, { type DataTableColumn } from "@/components/common/DataTable"
import { useDisclosure } from "@/hooks/useDisclosure"
import { useSearchFilter } from "@/hooks/useSearchFilter"
import { patientService } from "@/services/patientService"
import { queryKeys } from "@/constants/queryKeys"
import {
  INITIAL_FILTERS,
  ABHA_STATUS_OPTIONS,
  GENDER_OPTIONS,
} from "@/constants/patient.constants"
import { PatientAvatar } from "@/components/common"
import PatientEdit from "@/components/modals/patientEdit"
import type { Patient } from "@/types/patient"

export const PatientsPage: React.FC = () => {
  const navigate = useNavigate()
  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)
  const patientDisclosure = useDisclosure<Patient & { viewMode?: boolean }>()

  // Fetch patients list
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.patients.list(filter),
    queryFn: () => patientService.getPatients(filter),
  })

  const { patientsList, meta } = useMemo(() => {
    if (Array.isArray(data)) {
      return {
        patientsList: data,
        meta: {
          current_page: filter.page || 1,
          last_page: 1,
          per_page: filter.limit || 10,
          total: data.length,
        },
      }
    }

    const list = Array.isArray(data?.data) ? data.data : []
    const m = (data as any)?.meta || {}

    return {
      patientsList: list,
      meta: {
        current_page: Number(m.current_page || filter.page || 1),
        last_page: Number(m.last_page || 1),
        per_page: Number(m.per_page || filter.limit || 10),
        total: Number(m.total || list.length || 0),
      },
    }
  }, [data, filter.page, filter.limit])

  const handleFilterChange = useCallback(
    (updates: Record<string, unknown>) => handleFilter({ ...updates, page: 1 }),
    [handleFilter]
  )

  const handlePageChange = useCallback(
    (page: number) => handleFilter({ page }),
    [handleFilter]
  )

  const handlePageSizeChange = useCallback(
    (limit: number) => handleFilter({ limit, page: 1 }),
    [handleFilter]
  )

  // Calculate stats based on fetched roster
  const stats: StatItem[] = useMemo(() => {
    const total = meta.total || patientsList.length || 0
    const maleCount = patientsList.filter((p) => p.gender === "M").length
    const femaleCount = patientsList.filter((p) => p.gender === "F").length
    const abhaLinked = patientsList.filter(
      (p) => !!p.abha_number || !!p.abha_address
    ).length

    return [
      {
        title: "Total Registered",
        value: total,
        description: "Active patient directory",
        icon: <Users className="h-6 w-6" />,
        colorScheme: "blue",
      },
      {
        title: "Male Patients",
        value: maleCount,
        description:
          total > 0
            ? `${Math.round((maleCount / total) * 100)}% of total`
            : "0%",
        icon: <CalendarDays className="h-6 w-6" />,
        colorScheme: "cyan",
      },
      {
        title: "Female Patients",
        value: femaleCount,
        description:
          total > 0
            ? `${Math.round((femaleCount / total) * 100)}% of total`
            : "0%",
        icon: <Activity className="h-6 w-6" />,
        colorScheme: "purple",
      },
      {
        title: "ABHA Linked",
        value: abhaLinked,
        description:
          total > 0
            ? `${Math.round((abhaLinked / total) * 100)}% digitized`
            : "0% linked",
        icon: <ShieldCheck className="h-6 w-6" />,
        colorScheme: "emerald",
      },
    ]
  }, [meta, patientsList])

  // Helper age calculator
  const calculateAge = (dobString?: string) => {
    if (!dobString) return "N/A"
    const dob = new Date(dobString)
    if (isNaN(dob.getTime())) return "N/A"
    const diffMs = Date.now() - dob.getTime()
    const ageDate = new Date(diffMs)
    return `${Math.abs(ageDate.getUTCFullYear() - 1970)} yrs`
  }

  // Format gender code
  const formatGender = (gender?: string) => {
    if (gender === "M") return "Male"
    if (gender === "F") return "Female"
    if (gender === "O") return "Other"
    return gender || "N/A"
  }

  const columns = useMemo<DataTableColumn<Patient>[]>(
    () => [
      {
        key: "uhid",
        header: "UHID",
        render: (row) => (
          <span className="font-mono text-xs font-extrabold text-primary">
            {row.uhid}
          </span>
        ),
      },
      {
        key: "name",
        header: "Patient Details",
        render: (row) => (
          <div className="flex items-center gap-3">
            <PatientAvatar
              photo={row.photo}
              name={row.name}
              uhid={row.uhid}
              size="md"
              shape="circle"
              allowPreview={true}
              kyc_verified={row.kyc_verified}
              subtitle={
                row.mobile
                  ? `📱 +91 ${row.mobile}`
                  : [row.address, row.city, row.state].filter(Boolean).join(", ")
              }
            />
            <div className="min-w-0">
              <p className="font-bold text-foreground text-sm truncate">{row.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {row.mobile ? `📱 +91 ${row.mobile}` : "No Mobile"}
              </p>
              {(row.address || row.district || row.city) && (
                <p className="text-[11px] text-muted-foreground truncate max-w-[220px]" title={[row.address, row.district || row.city, row.state, row.pincode].filter(Boolean).join(", ")}>
                  📍 {[row.address, row.district || row.city, row.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "demographics",
        header: "Demographics",
        render: (row) => (
          <div>
            <p className="text-xs font-semibold text-foreground">
              {formatGender(row.gender)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {row.dob
                ? `${calculateAge(row.dob)} (${new Date(
                    row.dob
                  ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })})`
                : "DOB not specified"}
            </p>
          </div>
        ),
      },
      {
        key: "abha",
        header: "ABHA Status",
        render: (row) => {
          const isLinked = !!row.abha_number || !!row.abha_address
          return (
            <div className="flex flex-col gap-0.5">
              <span
                className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isLinked
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-slate-100 text-muted-foreground"
                }`}
              >
                {isLinked ? "Digitized (Linked)" : "Normal Registry"}
              </span>
              {row.abha_address && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {row.abha_address}
                </span>
              )}
            </div>
          )
        },
      },
      {
        key: "last_visit_date",
        header: "Last Visit",
        render: (row) => (
          <div>
            <p className="text-xs font-semibold text-foreground">
              {row.last_visit_date
                ? new Date(row.last_visit_date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "No visits yet"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {row.last_department ? (
                <span className="font-medium text-primary">
                  {row.last_visit_type}: {row.last_department}
                </span>
              ) : row.last_visit_type ? (
                <span>{row.last_visit_type}</span>
              ) : (
                "New Registration"
              )}
            </p>
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (row) => (
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="xs"
              className="transition-all hover:bg-blue-50 hover:text-blue-600 active:scale-[0.98]"
              onClick={() =>
                patientDisclosure.onOpen({ ...row, viewMode: true })
              }
            >
              <Eye className="mr-1 h-3.5 w-3.5" /> View Profile
            </Button>
          </div>
        ),
      },
    ],
    [patientDisclosure]
  )

  const isFiltered = Boolean(filter.search || filter.abha_status || filter.gender)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Registration"
        subtitle="Manage hospital patient records, search UHIDs, and access ABDM digital health profiles."
        badgeText="Active Registry"
        badgeVariant="default"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/reception")}
              className="gap-1.5"
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
              ABDM Reception Desk
            </Button>
            <Button
              size="sm"
              onClick={() => patientDisclosure.onOpen()}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Register Patient
            </Button>
          </div>
        }
      />

      {/* Stats Cards Row */}
      <StatCardsRow stats={stats} />

      {/* Search and Filters Table section */}
      <SectionCard
        title="Master Patient Directory"
        description="Filter and search registered patients by UHID, Name, Mobile, Email, or ABHA address."
      >
        <FilterBar values={filter} onChange={handleFilterChange} className="w-full flex-wrap gap-3">
          <FilterBar.Search
            name="search"
            placeholder="Search by UHID, patient name, mobile, ABHA number..."
            className="flex-1 min-w-[280px]"
          />
          <FilterBar.Select
            name="abha_status"
            placeholder="All ABHA Status"
            options={ABHA_STATUS_OPTIONS}
            className="w-48"
          />
          <FilterBar.Select
            name="gender"
            placeholder="All Genders"
            options={GENDER_OPTIONS}
            className="w-36"
          />
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFilter({ search: "", abha_status: "", gender: "", page: 1 })}
              className="text-xs text-muted-foreground hover:text-foreground h-9 gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </FilterBar>

        <div className="mt-4">
          <DataTable
            columns={columns}
            data={patientsList}
            isLoading={isLoading}
            keyExtractor={(item) => String(item.id)}
            currentPage={meta.current_page}
            pageSize={meta.per_page}
            totalRecords={meta.total}
            lastPage={meta.last_page}
            onPageChange={handlePageChange}
            handlePageSizeChange={handlePageSizeChange}
          />
        </div>
      </SectionCard>

      {/* Patient Edit / Register Modal */}
      <PatientEdit
        open={patientDisclosure.isOpen}
        onClose={patientDisclosure.onClose}
        patient={patientDisclosure.data}
      />
    </div>
  )
}
