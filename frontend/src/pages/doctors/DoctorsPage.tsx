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
import { Plus, Clock } from "lucide-react"

interface DoctorItem {
  id: string
  name: string
  specialty: string
  department: string
  schedule: string
  roomNo: string
  status: "AVAILABLE" | "ON_DUTY" | "ON_LEAVE"
}

const mockDoctors: DoctorItem[] = [
  {
    id: "DOC-001",
    name: "Dr. Ananya Roy",
    specialty: "Cardiologist",
    department: "Cardiology",
    schedule: "09:00 AM - 02:00 PM",
    roomNo: "Room 102",
    status: "ON_DUTY",
  },
  {
    id: "DOC-002",
    name: "Dr. Rajesh Verma",
    specialty: "General Physician",
    department: "General Medicine",
    schedule: "08:30 AM - 04:00 PM",
    roomNo: "Room 105",
    status: "AVAILABLE",
  },
  {
    id: "DOC-003",
    name: "Dr. Sunita Rao",
    specialty: "Orthopedic Surgeon",
    department: "Orthopedics",
    schedule: "10:00 AM - 03:00 PM",
    roomNo: "Room 201",
    status: "ON_LEAVE",
  },
]

const INITIAL_FILTERS = {
  search: "",
  status: "",
  page: 1,
  limit: 10,
}

export const DoctorsPage: React.FC = () => {
  const [doctors] = useState<DoctorItem[]>(mockDoctors)
  const doctorDisclosure = useDisclosure()
  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)

  const handleFilterChange = useCallback(
    (updates: Record<string, any>) => {
      handleFilter({ ...updates, page: 1 })
    },
    [handleFilter]
  )

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchesSearch =
        !filter.search ||
        doc.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(filter.search.toLowerCase()) ||
        doc.department.toLowerCase().includes(filter.search.toLowerCase())

      const matchesStatus = !filter.status || doc.status === filter.status
      return matchesSearch && matchesStatus
    })
  }, [doctors, filter])

  const columns: Column<DoctorItem>[] = useMemo(
    () => [
      {
        header: "Doctor Name",
        accessorKey: "name",
        cell: (row) => (
          <div>
            <p className="font-semibold text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.specialty}</p>
          </div>
        ),
      },
      {
        header: "Department & OPD Room",
        cell: (row) => (
          <div>
            <p className="text-xs font-medium text-foreground">{row.department}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.roomNo}</p>
          </div>
        ),
      },
      {
        header: "Shift Schedule",
        accessorKey: "schedule",
        cell: (row) => (
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{row.schedule}</span>
          </div>
        ),
      },
      {
        header: "Duty Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors Directory & OPD Roster"
        subtitle="Manage OPD duty schedules, physician availability, and room assignments."
        badgeText="Medical Roster"
        badgeVariant="success"
        actions={
          <Button variant="default" size="sm" onClick={() => doctorDisclosure.onOpen(null)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Doctor Profile
          </Button>
        }
      />

      <SectionCard title="Hospital Doctors & Schedules" description="Filter doctor profiles and schedule allocations.">
        <FilterBar values={filter} onChange={handleFilterChange}>
          <FilterBar.Search name="search" placeholder="Search doctor name, specialty, room..." className="w-72" />
          <FilterBar.Select
            name="status"
            placeholder="All Statuses"
            options={[
              { label: "Available", value: "AVAILABLE" },
              { label: "On Duty", value: "ON_DUTY" },
              { label: "On Leave", value: "ON_LEAVE" },
            ]}
          />
        </FilterBar>

        <div className="mt-4">
          <DataTable columns={columns} data={filteredDoctors} keyExtractor={(item) => item.id} />
        </div>
      </SectionCard>

      <FormContainer
        open={doctorDisclosure.isOpen}
        onOpenChange={doctorDisclosure.onClose}
        title="Add Doctor Profile"
        description="Register a new physician and configure OPD shift schedule."
        size="lg"
      >
        <div className="space-y-4">
          {sectionHeader("01", "Physician Information")}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Doctor Full Name</Label>
              <Input placeholder="e.g. Dr. Vikram Sethi" />
            </div>
            <div>
              <Label>Specialty</Label>
              <Input placeholder="e.g. Neurologist" />
            </div>
          </div>
        </div>
      </FormContainer>
    </div>
  )
}
