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
import { Card } from "@/components/ui/card"

import { QrCode, UserPlus, CheckCircle, Search } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ReceptionQueueItem {
  id: string
  tokenNo: string
  patientName: string
  gender: string
  age: number
  abhaAddress: string
  department: string
  status: "WAITING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
  timestamp: string
}

const mockQueue: ReceptionQueueItem[] = [
  {
    id: "REC-101",
    tokenNo: "TK-042",
    patientName: "Rajesh Kumar",
    gender: "Male",
    age: 42,
    abhaAddress: "rajesh.kumar@sbx",
    department: "General Medicine",
    status: "WAITING",
    timestamp: "10:15 AM",
  },
  {
    id: "REC-102",
    tokenNo: "TK-043",
    patientName: "Priya Sharma",
    gender: "Female",
    age: 35,
    abhaAddress: "priya.sharma@sbx",
    department: "Orthopedics",
    status: "WAITING",
    timestamp: "10:22 AM",
  },
  {
    id: "REC-103",
    tokenNo: "TK-040",
    patientName: "Amit Patel",
    gender: "Male",
    age: 58,
    abhaAddress: "amit.patel@sbx",
    department: "Cardiology",
    status: "CONFIRMED",
    timestamp: "09:50 AM",
  },
]

const INITIAL_FILTERS = {
  search: "",
  status: "",
  department: "",
  page: 1,
  limit: 10,
}

export const ReceptionPage: React.FC = () => {
  const [queue, setQueue] = useState<ReceptionQueueItem[]>(mockQueue)
  const [tokenSearchInput, setTokenSearchInput] = useState<string>("")
  const [foundTokenData, setFoundTokenData] =
    useState<ReceptionQueueItem | null>(null)

  const registerDisclosure = useDisclosure()
  const visitDisclosure = useDisclosure<ReceptionQueueItem>()
  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)

  const handleFilterChange = useCallback(
    (updates: Record<string, any>) => {
      handleFilter({ ...updates, page: 1 })
    },
    [handleFilter]
  )

  const handleTokenLookup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenSearchInput) return

    const matched = queue.find(
      (item) =>
        item.tokenNo.toLowerCase() === tokenSearchInput.trim().toLowerCase() ||
        item.patientName.toLowerCase().includes(tokenSearchInput.toLowerCase())
    )

    if (matched) {
      setFoundTokenData(matched)
    } else {
      // Mock generate new Scan & Share queue token match
      const newTokenItem: ReceptionQueueItem = {
        id: `REC-${Date.now().toString().slice(-3)}`,
        tokenNo: tokenSearchInput.startsWith("TK-")
          ? tokenSearchInput.toUpperCase()
          : `TK-${Math.floor(100 + Math.random() * 900)}`,
        patientName: "Suresh Gupta (Scanned ABHA)",
        gender: "Male",
        age: 39,
        abhaAddress: "suresh.gupta@sbx",
        department: "General Medicine",
        status: "WAITING",
        timestamp: "Just now",
      }
      setQueue((prev) => [newTokenItem, ...prev])
      setFoundTokenData(newTokenItem)
    }
  }

  const handleConfirmTokenVisit = (item: ReceptionQueueItem) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: "CONFIRMED" } : q))
    )
    setFoundTokenData(null)
    setTokenSearchInput("")
  }

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchesSearch =
        !filter.search ||
        item.patientName.toLowerCase().includes(filter.search.toLowerCase()) ||
        item.tokenNo.toLowerCase().includes(filter.search.toLowerCase()) ||
        item.abhaAddress.toLowerCase().includes(filter.search.toLowerCase())

      const matchesStatus = !filter.status || item.status === filter.status
      return matchesSearch && matchesStatus
    })
  }, [queue, filter])

  const columns: Column<ReceptionQueueItem>[] = useMemo(
    () => [
      {
        header: "Token No.",
        accessorKey: "tokenNo",
        cell: (row) => (
          <div>
            <span className="font-mono text-sm font-bold text-primary">
              {row.tokenNo}
            </span>
            <p className="text-[10px] text-muted-foreground">{row.timestamp}</p>
          </div>
        ),
      },
      {
        header: "Patient Details",
        cell: (row) => (
          <div>
            <p className="font-semibold text-foreground">{row.patientName}</p>
            <p className="text-xs text-muted-foreground">
              {row.age} yrs / {row.gender} •{" "}
              <span className="font-mono text-[11px]">{row.abhaAddress}</span>
            </p>
          </div>
        ),
      },
      {
        header: "Target Department",
        accessorKey: "department",
        cell: (row) => (
          <span className="text-xs font-medium text-foreground">
            {row.department}
          </span>
        ),
      },
      {
        header: "Queue Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        header: "Actions",
        className: "text-right",
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            {row.status === "WAITING" && (
              <Button
                variant="outline"
                size="xs"
                className="text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                onClick={() => handleConfirmTokenVisit(row)}
              >
                <CheckCircle className="mr-1 h-3.5 w-3.5" /> Confirm Visit
              </Button>
            )}
            <Button
              variant="outline"
              size="xs"
              onClick={() =>
                visitDisclosure.onOpen({ ...row, viewMode: true } as any)
              }
            >
              Details
            </Button>
          </div>
        ),
      },
    ],
    [visitDisclosure]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reception & Walk-in Desk"
        subtitle="Manage ABDM Scan & Share waiting queue tokens, instant check-in, and walk-in OPD visit registration."
        badgeText="ABDM Scan & Share"
        badgeVariant="success"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => registerDisclosure.onOpen(null)}
            >
              <UserPlus className="mr-1.5 h-4 w-4" /> Walk-in Register
            </Button>
          </>
        }
      />

      {/* Top ABDM Token Quick Lookup Bar */}
      <Card className="border border-border bg-card p-5 shadow-sm">
        <form
          onSubmit={handleTokenLookup}
          className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap text-foreground">
            <QrCode className="h-5 w-5 text-primary" />
            <span>Scan & Share Token Lookup:</span>
          </div>

          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter 4-digit Token No or Patient Name (e.g. TK-042)..."
              value={tokenSearchInput}
              onChange={(e) => setTokenSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            type="submit"
            variant="default"
            className="shrink-0 font-medium"
          >
            Validate Token
          </Button>
        </form>

        {foundTokenData && (
          <div className="animate-fadeIn mt-4 flex flex-col items-start justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold text-primary">
                  {foundTokenData.tokenNo}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {foundTokenData.patientName}
                </span>
                <StatusBadge status={foundTokenData.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                ABHA:{" "}
                <span className="font-mono">{foundTokenData.abhaAddress}</span>{" "}
                • Dept: {foundTokenData.department}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => handleConfirmTokenVisit(foundTokenData)}
              >
                <CheckCircle className="mr-1.5 h-4 w-4" /> Confirm & Send to OPD
                Queue
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Main Queue Directory */}
      <SectionCard
        title="Live Reception Waiting Queue"
        description="Filter today's Scan & Share token queue across departments and statuses."
      >
        <FilterBar values={filter} onChange={handleFilterChange}>
          <FilterBar.Search
            name="search"
            placeholder="Search token #, patient name, ABHA address..."
            className="w-72"
          />
          <FilterBar.Select
            name="status"
            placeholder="All Statuses"
            options={[
              { label: "Waiting", value: "WAITING" },
              { label: "Confirmed", value: "CONFIRMED" },
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

      {/* Walk-in Registration Form Modal */}
      <FormContainer
        open={registerDisclosure.isOpen}
        onOpenChange={registerDisclosure.onClose}
        title="Walk-in Patient OPD Visit Registration"
        description="Register a patient without an ABHA QR code or create a manual visit token."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => registerDisclosure.onClose()}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                const newItem: ReceptionQueueItem = {
                  id: `REC-${Date.now().toString().slice(-3)}`,
                  tokenNo: `TK-${Math.floor(100 + Math.random() * 900)}`,
                  patientName: "New Walk-in Patient",
                  gender: "Male",
                  age: 30,
                  abhaAddress: "manual@hms",
                  department: "General Medicine",
                  status: "WAITING",
                  timestamp: "Just now",
                }
                setQueue((prev) => [newItem, ...prev])
                registerDisclosure.onClose()
              }}
            >
              Issue Token & Register
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            {sectionHeader("01", "Patient Demographic Info")}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input placeholder="e.g. Ramesh Kumar" />
              </div>
              <div>
                <Label>Mobile Number</Label>
                <Input placeholder="+91 98765 43210" />
              </div>
              <div>
                <Label>Age</Label>
                <Input type="number" placeholder="45" />
              </div>
              <div>
                <Label>Gender</Label>
                <Select defaultValue="Male">
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            {sectionHeader("02", "OPD Department & Doctor Selection")}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Department</Label>
                <Select defaultValue="General Medicine">
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General Medicine">
                      General Medicine
                    </SelectItem>
                    <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned Doctor</Label>
                <Select defaultValue="Dr. Ananya Roy">
                  <SelectTrigger>
                    <SelectValue placeholder="Select Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr. Ananya Roy">
                      Dr. Ananya Roy (Cardiology)
                    </SelectItem>
                    <SelectItem value="Dr. Rajesh Verma">
                      Dr. Rajesh Verma (Gen Medicine)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </FormContainer>
    </div>
  )
}
