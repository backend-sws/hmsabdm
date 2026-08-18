import { useCallback, useMemo } from "react"
import { Eye, Plus, Users, ShieldCheck, Activity, CalendarDays } from "lucide-react"
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
import { INITIAL_FILTERS } from "@/constants/patient.constants"
import PatientEdit from "@/components/modals/patientEdit"
import type { Patient } from "@/types/patient"

export const PatientsPage: React.FC = () => {
  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)
  const patientDisclosure = useDisclosure<Patient & { viewMode?: boolean }>()

  // Fetch patients list
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.patients.list(filter),
    queryFn: () => patientService.getPatients(filter),
  })

  const { patientsList, meta } = useMemo(() => {
    return {
      patientsList: data?.data || [],
      meta: data?.meta || {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
      },
    }
  }, [data])

  const handleFilterChange = useCallback(
    (updates: Record<string, unknown>) => handleFilter({ ...updates, page: 1 }),
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
        description: total > 0 ? `${Math.round((maleCount / total) * 100)}% of total` : "0%",
        icon: <CalendarDays className="h-6 w-6" />,
        colorScheme: "indigo",
      },
      {
        title: "Female Patients",
        value: femaleCount,
        description: total > 0 ? `${Math.round((femaleCount / total) * 100)}% of total` : "0%",
        icon: <Activity className="h-6 w-6" />,
        colorScheme: "purple",
      },
      {
        title: "ABHA Linked",
        value: abhaLinked,
        description: total > 0 ? `${Math.round((abhaLinked / total) * 100)}% digitized` : "0% linked",
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
          <div>
            <p className="font-bold text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.mobile ? `Mobile: ${row.mobile}` : "No Mobile"}
              {row.email ? ` • ${row.email}` : ""}
            </p>
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
              {row.dob ? `${calculateAge(row.dob)} (${new Date(row.dob).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })})` : "DOB not specified"}
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
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold w-fit ${
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
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (row) => (
          <div className="flex justify-end items-center">
            <Button
              variant="outline"
              size="xs"
              className="hover:bg-blue-50 hover:text-blue-600 active:scale-[0.98] transition-all"
              onClick={() => patientDisclosure.onOpen({ ...row, viewMode: true })}
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> View Profile
            </Button>
          </div>
        ),
      },
    ],
    [patientDisclosure]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Registration"
        subtitle="Manage patient registration records, generate UHIDs, and access digital health identities."
        badgeText="Active Registry"
        badgeVariant="default"
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={() => patientDisclosure.onOpen()}
            className="bg-blue-600 font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Register Patient
          </Button>
        }
      />

      {/* Stats Cards Row */}
      <StatCardsRow items={stats} />

      {/* Search and Filters Table section */}
      <SectionCard
        title="Master Patient Directory"
        description="Filter and search registered patients by UHID, Name, Mobile, Email, or ABHA address."
      >
        <FilterBar values={filter} onChange={handleFilterChange}>
          <FilterBar.Search
            name="search"
            placeholder="Search ticket #, PNR, passenger name, or email..."
            className="w-72"
          />
        </FilterBar>

        <div className="mt-4">
          <DataTable
            columns={columns}
            data={patientsList}
            isLoading={isLoading}
            keyExtractor={(item) => String(item.id)}
            currentPage={Number(meta.current_page || 1)}
            pageSize={Number(meta.per_page || 10)}
            totalRecords={Number(meta.total || 0)}
            lastPage={Number(meta.last_page || 1)}
            onPageChange={(page) => handleFilterChange({ page })}
            handlePageSizeChange={(limit) => handleFilterChange({ limit, page: 1 })}
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
