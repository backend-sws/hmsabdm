import { useState, useCallback, useMemo } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Header } from "@/components/common/Header"
import { PageHeader } from "@/components/common/PageHeader"
import { MetricCard } from "@/components/common/MetricCard"
import { DataTable, type Column } from "@/components/common/DataTable"
import { FilterBar } from "@/components/filter-bar"
import { SectionCard } from "@/components/SectionCard"
import { StatusBadge } from "@/components/common/StatusBadge"
import { FormContainer } from "@/components/formContainer"
import { ConfirmDialog } from "@/components/confirmDialog"
import { sectionHeader } from "@/components/sectionHeader"
import { useSearchFilter } from "@/hooks/useSearchFilter"
import { useDisclosure } from "@/hooks/useDisclosure"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Users, FileCheck, ShieldAlert, Activity, Plus, RefreshCw, Eye, Trash2, CheckCircle2 } from "lucide-react"

const queryClient = new QueryClient()

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

const INITIAL_PATIENT_FILTERS = {
  search: "",
  status: "",
  page: 1,
  limit: 10,
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

export function AppContent() {
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [patients, setPatients] = useState<PatientRecord[]>(mockPatients)

  const dialogDisclosure = useDisclosure<PatientRecord>()
  const cancelDisclosure = useDisclosure<PatientRecord>()

  const { filter, handleFilter } = useSearchFilter(INITIAL_PATIENT_FILTERS)

  const handleFilterChange = useCallback(
    (updates: Record<string, any>) => {
      handleFilter({ ...updates, page: 1 })
    },
    [handleFilter]
  )

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      return next
    })
  }

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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <PageHeader
          title="ABHA Patient Portal"
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
                onClick={() => dialogDisclosure.onOpen(null)}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Create ABHA Record
              </Button>
            </>
          }
        />

        {/* Metric Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Registered Patients"
            value={patients.length}
            change="+12.4%"
            trend="up"
            description="Active ABHA profiles in hospital DB"
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="M1 Verified ABHA IDs"
            value="1,240"
            change="+8.1%"
            trend="up"
            description="Validated with Aadhaar OTP"
            icon={<FileCheck className="h-5 w-5" />}
          />
          <MetricCard
            title="Pending Consents"
            value="18"
            change="-4%"
            trend="down"
            description="Awaiting patient authorization"
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <MetricCard
            title="Gateway Success Rate"
            value="99.4%"
            change="Normal"
            trend="neutral"
            description="NHA Sandbox API uptime"
            icon={<Activity className="h-5 w-5" />}
          />
        </div>

        {/* Main Section Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
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
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Standardized Architecture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="font-semibold text-foreground mb-1">FilterBar & useSearchFilter</p>
                  <p>Standardized compound filter bar component paired with hook logic.</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="font-semibold text-foreground mb-1">useDisclosure & FormContainer</p>
                  <p>Modal & drawer state control with reusable container dialogs.</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="font-semibold text-foreground mb-1">DataTable & StatusBadge</p>
                  <p>Accessor-keyed columns with cell renderers & status tags.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Patient Record Dialog */}
      <FormContainer
        open={dialogDisclosure.isOpen}
        onOpenChange={dialogDisclosure.onClose}
        title={
          (dialogDisclosure.data as any)?.viewMode
            ? `Patient Profile - ${dialogDisclosure.data?.name}`
            : "Register New ABHA Patient"
        }
        description={
          (dialogDisclosure.data as any)?.viewMode
            ? "Complete ABDM demographic and ABHA verification details."
            : "Issue an ABHA address and link health record."
        }
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
                <Input
                  defaultValue={dialogDisclosure.data?.name || ""}
                  readOnly={(dialogDisclosure.data as any)?.viewMode}
                  placeholder="e.g. Rajesh Kumar"
                />
              </div>
              <div>
                <Label>ABHA Address</Label>
                <Input
                  defaultValue={dialogDisclosure.data?.abhaAddress || ""}
                  readOnly={(dialogDisclosure.data as any)?.viewMode}
                  placeholder="e.g. rajesh@sbx"
                />
              </div>
            </div>
          </div>
        </div>
      </FormContainer>

      {/* Confirm Deletion Dialog */}
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
