import React, { useState, useMemo, useEffect } from "react"
import { useParams, useNavigate, useSearchParams, Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ArrowLeft,
  Printer,
  FileText,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  CheckSquare,
  Square,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { labService } from "@/services/labService"
import type { DiagnosticReportPayload } from "@/types/lab"
import { DiagnosticReportPaper } from '@/components/lab/DiagnosticReportPaper'

export const LabReportViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const orderId = parseInt(id || "0")

  // Letterhead toggle: Digital Letterhead (with logos & address) vs Physical Pre-Printed Stationery
  const [includeLetterhead, setIncludeLetterhead] = useState(true)

  // Selective Tests Print: Array of selected item IDs
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([])
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false)
  const [authNotes] = useState("")

  // Fetch complete formatted diagnostic report payload
  const { data: report, isLoading } = useQuery<DiagnosticReportPayload>({
    queryKey: ["lab", "report", orderId],
    queryFn: () => labService.getDiagnosticReport(orderId),
    enabled: Boolean(orderId),
  })

  // Initialize selected tests & header from URL search params or full report
  useEffect(() => {
    if (!report?.sections || hasInitializedSelection) return

    const testsParam = searchParams.get("tests")
    const headerParam = searchParams.get("header")

    if (headerParam === "0") {
      setIncludeLetterhead(false)
    }

    if (testsParam && testsParam.trim() !== "") {
      const parsedIds = testsParam
        .split(",")
        .map((x) => parseInt(x.trim()))
        .filter((n) => !isNaN(n) && report.sections.some((s) => s.item_id === n))
      if (parsedIds.length > 0) {
        setSelectedItemIds(parsedIds)
        setHasInitializedSelection(true)
        return
      }
    }

    setSelectedItemIds(report.sections.map((s) => s.item_id))
    setHasInitializedSelection(true)
  }, [report, searchParams, hasInitializedSelection])

  // Filter sections based on selectedItemIds
  const displayedSections = useMemo(() => {
    if (!report?.sections) return []
    if (selectedItemIds.length === 0) return report.sections
    return report.sections.filter((s) => selectedItemIds.includes(s.item_id))
  }, [report?.sections, selectedItemIds])

  // Toggle selection for a single test item
  const toggleTestSelection = (itemId: number) => {
    if (selectedItemIds.includes(itemId)) {
      if (selectedItemIds.length === 1) {
        toast.warning("At least one test must remain selected to print.")
        return
      }
      setSelectedItemIds(selectedItemIds.filter((itId) => itId !== itemId))
    } else {
      setSelectedItemIds([...selectedItemIds, itemId])
    }
  }

  // Select all or deselect all tests
  const toggleSelectAll = () => {
    if (!report?.sections) return
    const allIds = report.sections.map((s) => s.item_id)
    if (selectedItemIds.length === allIds.length) {
      setSelectedItemIds([allIds[0]])
    } else {
      setSelectedItemIds(allIds)
    }
  }

  // Authorize report mutation
  const authorizeMutation = useMutation({
    mutationFn: () => labService.authorizeOrder(orderId, { notes: authNotes }),
    onSuccess: () => {
      toast.success("Diagnostic report authorized and officially released by Pathologist!")
      queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["lab", "report", orderId] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to authorize report.")
    },
  })

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <LoadingSpinner label="Generating official diagnostic lab report layout..." />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Diagnostic Report Not Found</h2>
        <Button onClick={() => navigate("/lab")}>Back to Worklist</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Controls Toolbar (Hidden during printing) ── */}
      <div className="bg-card border border-border p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
            <Link to="/lab" className="hover:text-foreground flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Laboratory Desk
            </Link>
            <span>/</span>
            <span className="text-foreground">Order #{report.order.order_number}</span>
            <span>/</span>
            <span className="text-primary font-bold">Official Report</span>
          </div>
          <h1 className="text-xl font-black text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Diagnostic Report Review & Authorization
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Stationery mode toggle */}
          <button
            onClick={() => setIncludeLetterhead(!includeLetterhead)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
            title="Toggle Digital Header vs Pre-printed Physical Letterhead Paper"
          >
            {includeLetterhead ? (
              <>
                <ToggleRight className="h-4 w-4 text-primary" />
                <span className="text-[11px]">Digital Letterhead</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-4 w-4 text-amber-500" />
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  Pre-printed Stationery
                </span>
              </>
            )}
          </button>

          {/* Pathologist 1-Click Authorize */}
          {report.order.status !== "authorized" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => authorizeMutation.mutate()}
              disabled={authorizeMutation.isPending}
              className="gap-1.5 text-xs h-9 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 font-bold"
            >
              <ShieldCheck className="h-4 w-4" />
              {authorizeMutation.isPending ? "Signing..." : "Authorize Report"}
            </Button>
          )}

          {/* Print Button */}
          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs h-9 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
          >
            <Printer className="h-4 w-4" />
            Print Report ({displayedSections.length} Panel{displayedSections.length > 1 ? "s" : ""})
          </Button>
        </div>
      </div>

      {/* ── Selective Tests Selection Bar (Hidden during printing) ── */}
      {report.sections && report.sections.length > 1 && (
        <div className="bg-card border border-border p-3 rounded-xl flex items-center justify-between gap-3 overflow-x-auto shadow-xs print:hidden">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-foreground">Select Panels to Print:</span>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              {selectedItemIds.length === report.sections.length ? "Deselect Others" : "Select All"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {report.sections.map((sec) => {
              const isSelected = selectedItemIds.includes(sec.item_id)
              return (
                <button
                  key={sec.item_id}
                  onClick={() => toggleTestSelection(sec.item_id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isSelected
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>{sec.test_name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Printable Official A4 Diagnostic Report Canvas ── */}
      <div className="p-8 sm:p-12 bg-white text-slate-900 rounded-2xl border border-border shadow-xl font-sans print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none">
        <DiagnosticReportPaper
          report={report}
          includeLetterhead={includeLetterhead}
          selectedItemIds={selectedItemIds}
        />
      </div>
    </div>
  )
}