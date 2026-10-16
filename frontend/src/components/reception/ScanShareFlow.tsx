import React, { useState, useMemo } from "react"
import { Search, RefreshCw, CheckCircle, QrCode } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/common/DataTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import { SectionCard } from "@/components/SectionCard"
import type { ScanShareQueueItem } from "@/types/reception"

interface ScanShareFlowProps {
  queue: ScanShareQueueItem[]
  isLoading: boolean
  isSearching: boolean
  lastUpdated: string | null
  onRefresh: () => void
  onLookupToken: (token: string) => Promise<ScanShareQueueItem | null>
  onSelectQueueItem: (item: ScanShareQueueItem) => void
}

function formatTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return dateStr
  }
}

export const ScanShareFlow: React.FC<ScanShareFlowProps> = ({
  queue,
  isLoading,
  isSearching,
  lastUpdated,
  onRefresh,
  onLookupToken,
  onSelectQueueItem,
}) => {
  const [tokenInput, setTokenInput] = useState("")
  const [searchFilter, setSearchFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = tokenInput.trim()
    if (!trimmed) return
    const item = await onLookupToken(trimmed)
    if (item) {
      onSelectQueueItem(item)
    }
  }

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchSearch =
        !searchFilter ||
        item.patient_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.token_no?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.abha_address?.toLowerCase().includes(searchFilter.toLowerCase())
      const matchStatus = !statusFilter || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [queue, searchFilter, statusFilter])

  const columns: Column<ScanShareQueueItem>[] = useMemo(
    () => [
      {
        header: "Token",
        cell: (row) => (
          <div>
            <span className="font-mono text-sm font-bold text-primary">{row.token_no}</span>
            <p className="text-[10px] text-muted-foreground">{formatTime(row.created_at)}</p>
          </div>
        ),
      },
      {
        header: "Patient Name & ABHA",
        cell: (row) => (
          <div>
            <p className="font-semibold text-foreground text-xs">{row.patient_name}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.age ? `${row.age} yrs` : "—"} / {row.gender || "—"}
              {row.abha_address && (
                <> • <span className="font-mono text-primary font-medium">{row.abha_address}</span></>
              )}
            </p>
          </div>
        ),
      },
      {
        header: "Preferred Dept",
        cell: (row) => (
          <span className="text-xs font-medium text-foreground">
            {row.preferred_department || row.department_name || (
              <span className="text-muted-foreground italic">Any</span>
            )}
          </span>
        ),
      },
      {
        header: "Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        header: "Action",
        className: "text-right",
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            {row.status === "WAITING" ? (
              <Button
                variant="outline"
                size="xs"
                className="text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 font-semibold"
                onClick={() => onSelectQueueItem(row)}
              >
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                Confirm & Issue OPD Slip
              </Button>
            ) : (
              <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">
                ✓ OPD Token Issued
              </Badge>
            )}
          </div>
        ),
      },
    ],
    [onSelectQueueItem]
  )

  return (
    <div className="space-y-6">
      {/* Quick Token Lookup Bar */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Enter Scan & Share Token from Patient's Phone
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              When a patient scans the counter QR code, a token is displayed on their ABHA app (e.g. <span className="font-mono font-bold text-foreground">482</span>).
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex w-full sm:w-auto items-center gap-2">
            <Input
              type="text"
              placeholder="e.g. 482"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="h-10 w-full sm:w-40 font-mono text-center text-sm font-bold tracking-widest uppercase bg-card"
            />
            <Button type="submit" disabled={isSearching || !tokenInput.trim()} className="h-10 px-4">
              {isSearching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="mr-1.5 h-4 w-4" />
                  Fetch Patient
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Live Scan & Share Queue Table */}
      <SectionCard
        title="Live Scan & Share Waiting Queue"
        description="Patients who scanned hospital QR in the last 30 minutes"
        actions={
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live: {lastUpdated}
              </span>
            )}
            <Button
              variant="outline"
              size="xs"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-7 text-xs"
            >
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search token, patient name, ABHA..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="WAITING">Waiting Confirmation</option>
              <option value="CONFIRMED">Token Issued</option>
            </select>
          </div>

          <DataTable
            columns={columns}
            data={filteredQueue}
            isLoading={isLoading}
            emptyTitle="Queue Empty"
            emptyDescription="There are currently no pending tokens in the waiting queue."
          />
        </div>
      </SectionCard>
    </div>
  )
}
