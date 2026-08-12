import React, { useState, useMemo, useCallback } from "react"
import { PageHeader } from "@/components/common/PageHeader"
import { SectionCard } from "@/components/SectionCard"
import { FilterBar } from "@/components/filter-bar"
import { DataTable, type Column } from "@/components/common/DataTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import { useSearchFilter } from "@/hooks/useSearchFilter"
import { useDisclosure } from "@/hooks/useDisclosure"
import { FormContainer } from "@/components/formContainer"
import { sectionHeader } from "@/components/sectionHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Users } from "lucide-react"

interface DepartmentItem {
  id: string
  name: string
  code: string
  headOfDepartment: string
  totalDoctors: number
  status: "ACTIVE" | "INACTIVE"
}

const mockDepartments: DepartmentItem[] = [
  {
    id: "DEP-01",
    name: "General Medicine",
    code: "GEN-MED",
    headOfDepartment: "Dr. Rajesh Verma",
    totalDoctors: 8,
    status: "ACTIVE",
  },
  {
    id: "DEP-02",
    name: "Cardiology",
    code: "CARD-01",
    headOfDepartment: "Dr. Ananya Roy",
    totalDoctors: 5,
    status: "ACTIVE",
  },
  {
    id: "DEP-03",
    name: "Orthopedics",
    code: "ORTH-01",
    headOfDepartment: "Dr. Sunita Rao",
    totalDoctors: 4,
    status: "ACTIVE",
  },
]

const INITIAL_FILTERS = {
  search: "",
  status: "",
  page: 1,
  limit: 10,
}

export const DepartmentsPage: React.FC = () => {
  const [departments] = useState<DepartmentItem[]>(mockDepartments)
  const deptDisclosure = useDisclosure()
  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)

  const handleFilterChange = useCallback(
    (updates: Record<string, any>) => {
      handleFilter({ ...updates, page: 1 })
    },
    [handleFilter]
  )

  const filteredDepts = useMemo(() => {
    return departments.filter((d) => {
      const matchesSearch =
        !filter.search ||
        d.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        d.code.toLowerCase().includes(filter.search.toLowerCase()) ||
        d.headOfDepartment.toLowerCase().includes(filter.search.toLowerCase())

      const matchesStatus = !filter.status || d.status === filter.status
      return matchesSearch && matchesStatus
    })
  }, [departments, filter])

  const columns: Column<DepartmentItem>[] = useMemo(
    () => [
      {
        header: "Department Name",
        accessorKey: "name",
        cell: (row) => (
          <div>
            <p className="font-semibold text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.code}</p>
          </div>
        ),
      },
      {
        header: "Head of Department",
        accessorKey: "headOfDepartment",
        cell: (row) => <span className="text-xs font-medium text-foreground">{row.headOfDepartment}</span>,
      },
      {
        header: "Assigned Physicians",
        accessorKey: "totalDoctors",
        cell: (row) => (
          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{row.totalDoctors} Doctors</span>
          </div>
        ),
      },
      {
        header: "Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital Departments"
        subtitle="Manage hospital clinical departments, OPD wings, and head physicians."
        badgeText="Core Infrastructure"
        badgeVariant="success"
        actions={
          <Button variant="default" size="sm" onClick={() => deptDisclosure.onOpen(null)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Department
          </Button>
        }
      />

      <SectionCard title="Active Clinical Departments" description="Filter and search all registered departments.">
        <FilterBar values={filter} onChange={handleFilterChange}>
          <FilterBar.Search name="search" placeholder="Search department name, code, HOD..." className="w-72" />
        </FilterBar>

        <div className="mt-4">
          <DataTable columns={columns} data={filteredDepts} keyExtractor={(item) => item.id} />
        </div>
      </SectionCard>

      <FormContainer
        open={deptDisclosure.isOpen}
        onOpenChange={deptDisclosure.onClose}
        title="Create New Department"
        description="Add a clinical department to the hospital registry."
        size="md"
      >
        <div className="space-y-4">
          {sectionHeader("01", "Department Information")}
          <div className="space-y-3">
            <div>
              <Label>Department Name</Label>
              <Input placeholder="e.g. Pediatrics" />
            </div>
            <div>
              <Label>Code Identifier</Label>
              <Input placeholder="e.g. PED-01" />
            </div>
          </div>
        </div>
      </FormContainer>
    </div>
  )
}
