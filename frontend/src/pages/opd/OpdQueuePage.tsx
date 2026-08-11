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
import { Stethoscope, PhoneCall, CheckCircle2 } from "lucide-react"

interface OpdVisitItem {
  id: string
  visitId: string
  tokenNo: string
  patientName: string
  age: number
  gender: string
  abhaAddress: string
  symptoms: string
  status: "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "SKIPPED"
  checkInTime: string
}

const mockOpdQueue: OpdVisitItem[] = [
  {
    id: "OPD-201",
    visitId: "VIS-901",
    tokenNo: "TK-040",
    patientName: "Amit Patel",
    age: 58,
    gender: "Male",
    abhaAddress: "amit.patel@sbx",
    symptoms: "Chest pain, shortness of breath on exertion",
    status: "IN_CONSULTATION",
    checkInTime: "09:45 AM",
  },
  {
    id: "OPD-202",
    visitId: "VIS-902",
    tokenNo: "TK-042",
    patientName: "Rajesh Kumar",
    age: 42,
    gender: "Male",
    abhaAddress: "rajesh.kumar@sbx",
    symptoms: "High fever, body ache for 3 days",
    status: "WAITING",
    checkInTime: "10:15 AM",
  },
  {
    id: "OPD-203",
    visitId: "VIS-903",
    tokenNo: "TK-043",
    patientName: "Priya Sharma",
    age: 35,
    gender: "Female",
    abhaAddress: "priya.sharma@sbx",
    symptoms: "Severe migraine and dizziness",
    status: "WAITING",
    checkInTime: "10:22 AM",
  },
]

const INITIAL_FILTERS = {
  search: "",
  status: "",
  page: 1,
  limit: 10,
}

export const OpdQueuePage: React.FC = () => {
  const [opdQueue, setOpdQueue] = useState<OpdVisitItem[]>(mockOpdQueue)
  const consultDisclosure = useDisclosure<OpdVisitItem>()

  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)

  const handleFilterChange = useCallback(
    (updates: Record<string, any>) => {
      handleFilter({ ...updates, page: 1 })
    },
    [handleFilter]
  )

  const handleCallPatient = (visit: OpdVisitItem) => {
    setOpdQueue((prev) =>
      prev.map((item) =>
        item.id === visit.id
          ? { ...item, status: "IN_CONSULTATION" }
          : item.status === "IN_CONSULTATION"
          ? { ...item, status: "COMPLETED" }
          : item
      )
    )
    consultDisclosure.onOpen(visit)
  }

  const handleCompleteConsultation = (visitId: string) => {
    setOpdQueue((prev) =>
      prev.map((item) => (item.id === visitId ? { ...item, status: "COMPLETED" } : item))
    )
    consultDisclosure.onClose()
  }

  const filteredQueue = useMemo(() => {
    return opdQueue.filter((item) => {
      const matchesSearch =
        !filter.search ||
        item.patientName.toLowerCase().includes(filter.search.toLowerCase()) ||
        item.tokenNo.toLowerCase().includes(filter.search.toLowerCase()) ||
        item.symptoms.toLowerCase().includes(filter.search.toLowerCase())

      const matchesStatus = !filter.status || item.status === filter.status
      return matchesSearch && matchesStatus
    })
  }, [opdQueue, filter])

  const columns: Column<OpdVisitItem>[] = useMemo(
    () => [
      {
        header: "Token #",
        accessorKey: "tokenNo",
        cell: (row) => (
          <div>
            <span className="font-mono text-sm font-bold text-primary">{row.tokenNo}</span>
            <p className="text-[10px] text-muted-foreground">{row.checkInTime}</p>
          </div>
        ),
      },
      {
        header: "Patient Information",
        cell: (row) => (
          <div>
            <p className="font-semibold text-foreground">{row.patientName}</p>
            <p className="text-xs text-muted-foreground">
              {row.age} yrs / {row.gender} • <span className="font-mono text-[11px]">{row.abhaAddress}</span>
            </p>
          </div>
        ),
      },
      {
        header: "Chief Complaint / Symptoms",
        accessorKey: "symptoms",
        cell: (row) => <span className="text-xs text-foreground line-clamp-1">{row.symptoms}</span>,
      },
      {
        header: "Consultation Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        header: "Actions",
        className: "text-right",
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            {row.status === "WAITING" && (
              <Button size="xs" variant="default" onClick={() => handleCallPatient(row)}>
                <PhoneCall className="h-3.5 w-3.5 mr-1" /> Call Patient
              </Button>
            )}

            {row.status === "IN_CONSULTATION" && (
              <Button
                size="xs"
                variant="outline"
                className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => consultDisclosure.onOpen(row)}
              >
                <Stethoscope className="h-3.5 w-3.5 mr-1" /> Active Desk
              </Button>
            )}

            {row.status === "COMPLETED" && (
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Done
              </span>
            )}
          </div>
        ),
      },
    ],
    [consultDisclosure]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="OPD Doctor Consultation Desk"
        subtitle="Call patients from today's queue, review symptoms & ABHA records, and complete consultations."
        badgeText="Dr. Consultation Desk"
        badgeVariant="success"
      />

      <SectionCard title="Today's OPD Patient Queue" description="Live patient queue sorted by check-in timestamp.">
        <FilterBar values={filter} onChange={handleFilterChange}>
          <FilterBar.Search
            name="search"
            placeholder="Search token #, patient name, symptoms..."
            className="w-72"
          />
          <FilterBar.Select
            name="status"
            placeholder="All Statuses"
            options={[
              { label: "Waiting", value: "WAITING" },
              { label: "In Consultation", value: "IN_CONSULTATION" },
              { label: "Completed", value: "COMPLETED" },
            ]}
          />
        </FilterBar>

        <div className="mt-4">
          <DataTable
            columns={columns}
            data={filteredQueue}
            keyExtractor={(item) => item.id}
          />
        </div>
      </SectionCard>

      {/* Active Consultation Drawer / Dialog */}
      <FormContainer
        open={consultDisclosure.isOpen}
        onOpenChange={consultDisclosure.onClose}
        title={`Active Consultation - ${consultDisclosure.data?.patientName}`}
        description={`Token ${consultDisclosure.data?.tokenNo} • ABHA: ${consultDisclosure.data?.abhaAddress}`}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => consultDisclosure.onClose()}>
              Save Draft
            </Button>
            <Button
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleCompleteConsultation(consultDisclosure.data?.id || "")}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Complete Consultation & Issue Prescription
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            {sectionHeader("01", "Chief Complaints & Vitals")}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Chief Complaints</Label>
                <Input defaultValue={consultDisclosure.data?.symptoms} />
              </div>
              <div>
                <Label>Vitals (BP / Pulse / Temp)</Label>
                <Input defaultValue="120/80 mmHg | 72 bpm | 98.6°F" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            {sectionHeader("02", "Diagnosis & Clinical Notes")}
            <div className="mt-4 space-y-3">
              <div>
                <Label>Clinical Impression / Diagnosis</Label>
                <Input placeholder="e.g. Acute Upper Respiratory Tract Infection (ICD-10 J06.9)" />
              </div>
            </div>
          </div>
        </div>
      </FormContainer>
    </div>
  )
}
