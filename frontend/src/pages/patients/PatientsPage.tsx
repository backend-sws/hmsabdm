import React, { useState, useMemo, useCallback } from "react"
import { PageHeader } from "@/components/common/PageHeader"
import { SectionCard } from "@/components/SectionCard"
import { FilterBar } from "@/components/filter-bar"
import { DataTable, type Column } from "@/components/common/DataTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import { useSearchFilter } from "@/hooks/useSearchFilter"
import { useDisclosure } from "@/hooks/useDisclosure"
import { FormContainer } from "@/components/formContainer"
import { ConfirmDialog } from "@/components/confirmDialog"
import { sectionHeader } from "@/components/sectionHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Eye, Trash2, RefreshCw, CheckCircle2 } from "lucide-react"

interface PatientRecord {
  id: string
  name: string
  abhaNumber: string
  abhaAddress: string
  gender: "Male" | "Female" | "Other"
  age: number
  status: "VERIFIED" | "PENDING" | "LINKED" | "CANCELLED"
  lastSynced: string
}

const mockPatients: PatientRecord[] = [
  {
    id: "PAT-001",
    name: "Rajesh Kumar",
    abhaNumber: "91-1234-5678-9012",
    abhaAddress: "rajesh.kumar@sbx",
    gender: "Male",
    age: 42,
    status: "VERIFIED",
    lastSynced: "10 mins ago",
  },
  {
    id: "PAT-002",
    name: "Priya Sharma",
    abhaNumber: "91-9876-5432-1098",
    abhaAddress: "priya.sharma@sbx",
    gender: "Female",
    age: 35,
    status: "LINKED",
    lastSynced: "2 hours ago",
  },
  {
    id: "PAT-003",
    name: "Amit Patel",
    abhaNumber: "91-4567-8901-2345",
    abhaAddress: "amit.patel@sbx",
    gender: "Male",
    age: 58,
    status: "VERIFIED",
    lastSynced: "1 day ago",
  },
  {
    id: "PAT-004",
    name: "Sunita Verma",
    abhaNumber: "91-7890-1234-5678",
    abhaAddress: "sunita.v@sbx",
    gender: "Female",
    age: 29,
    status: "PENDING",
    lastSynced: "Just now",
  },
]

const INITIAL_PATIENT_FILTERS = {
  search: "",
  status: "",
  page: 1,
  limit: 10,
}

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<PatientRecord[]>(mockPatients)
  const [step, setStep] = useState<"AADHAAR" | "OTP" | "SUCCESS">("AADHAAR")
  const [aadhaarInput, setAadhaarInput] = useState<string>("")
  const [otpInput, setOtpInput] = useState<string>("")

  const dialogDisclosure = useDisclosure<PatientRecord>()
  const createDisclosure = useDisclosure()
  const cancelDisclosure = useDisclosure<PatientRecord>()

  const { filter, handleFilter } = useSearchFilter(INITIAL_PATIENT_FILTERS)

  const handleFilterChange = useCallback(
    (updates: Record<string, any>) => {
      handleFilter({ ...updates, page: 1 })
    },
    [handleFilter]
  )

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch =
        !filter.search ||
        patient.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        patient.abhaNumber.includes(filter.search) ||
        patient.abhaAddress.toLowerCase().includes(filter.search.toLowerCase())

      const matchesStatus = !filter.status || patient.status === filter.status
      return matchesSearch && matchesStatus
    })
  }, [patients, filter])

  const handleDelete = () => {
    if (cancelDisclosure.data) {
      setPatients((prev) => prev.filter((p) => p.id !== cancelDisclosure.data?.id))
      cancelDisclosure.onClose()
    }
  }

  const handleAadhaarOtpRequest = (e: React.FormEvent) => {
    e.preventDefault()
    if (aadhaarInput.length < 12) return
    setStep("OTP")
  }

  const handleVerifyOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpInput) return
    setStep("SUCCESS")

    const newPat: PatientRecord = {
      id: `PAT-00${patients.length + 1}`,
      name: "Verified Aadhaar User",
      abhaNumber: `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      abhaAddress: `abha.user${patients.length + 1}@sbx`,
      gender: "Male",
      age: 32,
      status: "VERIFIED",
      lastSynced: "Just now",
    }

    setPatients((prev) => [newPat, ...prev])
  }

  const columns: Column<PatientRecord>[] = useMemo(
    () => [
      {
        header: "Patient Name",
        accessorKey: "name",
        cell: (row) => (
          <div>
            <p className="font-semibold text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.id}</p>
          </div>
        ),
      },
      {
        header: "ABHA Number & Address",
        accessorKey: "abhaNumber",
        cell: (row) => (
          <div>
            <p className="font-mono text-xs font-medium text-foreground">{row.abhaNumber}</p>
            <p className="text-xs text-muted-foreground">{row.abhaAddress}</p>
          </div>
        ),
      },
      {
        header: "Demographics",
        cell: (row) => (
          <span className="text-xs text-foreground font-medium">
            {row.age} yrs / {row.gender}
          </span>
        ),
      },
      {
        header: "Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        header: "Last Sync",
        accessorKey: "lastSynced",
        cell: (row) => <span className="text-xs text-muted-foreground">{row.lastSynced}</span>,
      },
      {
        header: "Actions",
        className: "text-right",
        cell: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={() => dialogDisclosure.onOpen({ ...row, viewMode: true } as any)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> View
            </Button>
            <Button
              variant="outline"
              size="xs"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => cancelDisclosure.onOpen(row)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [dialogDisclosure, cancelDisclosure]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="ABHA Patient Directory"
        subtitle="Manage ABDM M1 & M2 health IDs, patient verification, and consent artifacts."
        badgeText="ABDM Standardized"
        badgeVariant="success"
        actions={
          <>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Sync Gateway
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setStep("AADHAAR")
                setAadhaarInput("")
                setOtpInput("")
                createDisclosure.onOpen(null)
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Issue ABHA Record
            </Button>
          </>
        }
      />

      <SectionCard
        title="Master ABHA Patient Directory"
        description="Filter and search all patient records across verification statuses."
      >
        <FilterBar values={filter} onChange={handleFilterChange}>
          <FilterBar.Search
            name="search"
            placeholder="Search patient name, ABHA #, address..."
            className="w-72"
          />
          <FilterBar.Select
            name="status"
            placeholder="All Statuses"
            options={[
              { label: "Verified", value: "VERIFIED" },
              { label: "Linked", value: "LINKED" },
              { label: "Pending", value: "PENDING" },
            ]}
          />
        </FilterBar>

        <div className="mt-4">
          <DataTable
            columns={columns}
            data={filteredPatients}
            keyExtractor={(item) => item.id}
          />
        </div>
      </SectionCard>

      {/* ABHA Creation Modal Workflow */}
      <FormContainer
        open={createDisclosure.isOpen}
        onOpenChange={createDisclosure.onClose}
        title="ABDM ABHA Generation (Aadhaar OTP)"
        description="Issue an ABHA ID compliant with NHA Sandbox M1 endpoints."
        size="md"
      >
        <div className="space-y-4">
          {step === "AADHAAR" && (
            <form onSubmit={handleAadhaarOtpRequest} className="space-y-4">
              {sectionHeader("01", "Aadhaar Number Verification")}
              <div className="space-y-1.5">
                <Label>Aadhaar Number (12-digit)</Label>
                <Input
                  placeholder="e.g. 5432 1098 7654"
                  maxLength={14}
                  value={aadhaarInput}
                  onChange={(e) => setAadhaarInput(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="default" className="w-full">
                Request Aadhaar OTP
              </Button>
            </form>
          )}

          {step === "OTP" && (
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              {sectionHeader("02", "Enter OTP Sent to Aadhaar Linked Mobile")}
              <div className="space-y-1.5">
                <Label>6-digit OTP</Label>
                <Input
                  placeholder="e.g. 123456"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="default" className="w-full">
                Verify OTP & Create ABHA
              </Button>
            </form>
          )}

          {step === "SUCCESS" && (
            <div className="text-center py-6 space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-foreground">ABHA ID Created Successfully!</h3>
              <p className="text-xs text-muted-foreground">
                Patient record registered with NHA Gateway and linked to hospital DB.
              </p>
              <Button variant="outline" size="sm" onClick={() => createDisclosure.onClose()}>
                Done
              </Button>
            </div>
          )}
        </div>
      </FormContainer>

      {/* Patient Detail Modal */}
      <FormContainer
        open={dialogDisclosure.isOpen}
        onOpenChange={dialogDisclosure.onClose}
        title={`Patient Profile - ${dialogDisclosure.data?.name}`}
        description="Complete ABDM demographic and ABHA verification details."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => dialogDisclosure.onClose()}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            {sectionHeader("01", "Demographics & ABHA Information")}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Patient Name</Label>
                <Input defaultValue={dialogDisclosure.data?.name || ""} readOnly />
              </div>
              <div>
                <Label>ABHA Number</Label>
                <Input defaultValue={dialogDisclosure.data?.abhaNumber || ""} readOnly />
              </div>
              <div>
                <Label>ABHA Address</Label>
                <Input defaultValue={dialogDisclosure.data?.abhaAddress || ""} readOnly />
              </div>
              <div>
                <Label>Age / Gender</Label>
                <Input defaultValue={`${dialogDisclosure.data?.age} yrs / ${dialogDisclosure.data?.gender}`} readOnly />
              </div>
            </div>
          </div>
        </div>
      </FormContainer>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={cancelDisclosure.isOpen}
        onOpenChange={cancelDisclosure.onClose}
        title="Delete Patient Record"
        description={`Are you sure you want to remove patient record for ${cancelDisclosure.data?.name}?`}
        onConfirm={handleDelete}
        confirmText="Delete Record"
        variant="danger"
      />
    </div>
  )
}
