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
import { Plus, ShieldCheck } from "lucide-react"

interface HospitalItem {
  id: string
  name: string
  abdmFacilityId: string
  location: string
  contactEmail: string
  status: "ACTIVE" | "PENDING" | "SUSPENDED"
}

const mockHospitals: HospitalItem[] = [
  {
    id: "HOSP-01",
    name: "Apollo City Hospital",
    abdmFacilityId: "IN3010000452",
    location: "New Delhi, Delhi",
    contactEmail: "admin@cityhospital.com",
    status: "ACTIVE",
  },
  {
    id: "HOSP-02",
    name: "Fortis Healthcare Center",
    abdmFacilityId: "IN3010000891",
    location: "Gurugram, Haryana",
    contactEmail: "contact@fortishealth.org",
    status: "ACTIVE",
  },
  {
    id: "HOSP-03",
    name: "Max Super Specialty Hospital",
    abdmFacilityId: "IN3010000722",
    location: "Noida, UP",
    contactEmail: "info@maxhealth.in",
    status: "PENDING",
  },
]

const INITIAL_FILTERS = {
  search: "",
  status: "",
  page: 1,
  limit: 10,
}

export const HospitalsPage: React.FC = () => {
  const [hospitals] = useState<HospitalItem[]>(mockHospitals)
  const hospDisclosure = useDisclosure()
  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)

  const handleFilterChange = useCallback(
    (updates: Record<string, any>) => {
      handleFilter({ ...updates, page: 1 })
    },
    [handleFilter]
  )

  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      const matchesSearch =
        !filter.search ||
        h.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        h.abdmFacilityId.toLowerCase().includes(filter.search.toLowerCase()) ||
        h.location.toLowerCase().includes(filter.search.toLowerCase())

      const matchesStatus = !filter.status || h.status === filter.status
      return matchesSearch && matchesStatus
    })
  }, [hospitals, filter])

  const columns: Column<HospitalItem>[] = useMemo(
    () => [
      {
        header: "Hospital Facility Name",
        accessorKey: "name",
        cell: (row) => (
          <div>
            <p className="font-semibold text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.location}</p>
          </div>
        ),
      },
      {
        header: "ABDM Facility ID (HPR)",
        accessorKey: "abdmFacilityId",
        cell: (row) => (
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="font-mono text-xs font-semibold text-foreground">{row.abdmFacilityId}</span>
          </div>
        ),
      },
      {
        header: "Contact Email",
        accessorKey: "contactEmail",
        cell: (row) => <span className="text-xs text-muted-foreground">{row.contactEmail}</span>,
      },
      {
        header: "Facility Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin - Hospital Facilities"
        subtitle="Onboard, authorize, and manage partner hospitals registered with NHA ABDM registry."
        badgeText="Super Admin Portal"
        badgeVariant="success"
        actions={
          <Button variant="default" size="sm" onClick={() => hospDisclosure.onOpen(null)}>
            <Plus className="h-4 w-4 mr-1.5" /> Onboard Facility
          </Button>
        }
      />

      <SectionCard title="Registered Hospital Facilities" description="Filter and search all onboarded medical facilities.">
        <FilterBar values={filter} onChange={handleFilterChange}>
          <FilterBar.Search name="search" placeholder="Search hospital name, ABDM Facility ID, location..." className="w-72" />
          <FilterBar.Select
            name="status"
            placeholder="All Statuses"
            options={[
              { label: "Active", value: "ACTIVE" },
              { label: "Pending", value: "PENDING" },
              { label: "Suspended", value: "SUSPENDED" },
            ]}
          />
        </FilterBar>

        <div className="mt-4">
          <DataTable columns={columns} data={filteredHospitals} keyExtractor={(item) => item.id} />
        </div>
      </SectionCard>

      <FormContainer
        open={hospDisclosure.isOpen}
        onOpenChange={hospDisclosure.onClose}
        title="Onboard New Hospital Facility"
        description="Register a healthcare facility with ABDM Facility ID."
        size="lg"
      >
        <div className="space-y-4">
          {sectionHeader("01", "Facility Identification")}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Facility Name</Label>
              <Input placeholder="e.g. City Care Hospital" />
            </div>
            <div>
              <Label>ABDM Facility ID (HPR)</Label>
              <Input placeholder="e.g. IN3010000999" />
            </div>
          </div>
        </div>
      </FormContainer>
    </div>
  )
}
