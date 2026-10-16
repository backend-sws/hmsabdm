import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  X,
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
import { DiagnosticReportPaper } from "@/components/lab/DiagnosticReportPaper"
import type { DiagnosticReportPayload } from "@/types/lab"

interface DiagnosticReportPrintModalProps {
  orderId: number
  onClose: () => void
  onAuthorized?: () => void
}

export const DiagnosticReportPrintModal: React.FC<DiagnosticReportPrintModalProps> = ({
  orderId,
  onClose,
  onAuthorized,
}) => {
  const queryClient = useQueryClient()

  // Letterhead toggle: Digital Letterhead (with logos & address) vs Physical Pre-Printed Stationery
  const [includeLetterhead, setIncludeLetterhead] = useState(true)

  // Selective Tests Print: Array of selected item IDs
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([])
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false)

  // Authorize note
  const [authNotes] = useState("")

  // Fetch complete formatted diagnostic report payload
  const { data: report, isLoading } = useQuery<DiagnosticReportPayload>({
    queryKey: ["lab", "report", orderId],
    queryFn: () => labService.getDiagnosticReport(orderId),
  })

  // Auto-select all tests on initial load
  if (report && !hasInitializedSelection && report.sections && report.sections.length > 0) {
    setSelectedItemIds(report.sections.map((s) => s.item_id))
    setHasInitializedSelection(true)
  }

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
      setSelectedItemIds(selectedItemIds.filter((id) => id !== itemId))
    } else {
      setSelectedItemIds([...selectedItemIds, itemId])
    }
  }

  // Select all or deselect all tests
  const toggleSelectAll = () => {
    if (!report?.sections) return
    const allIds = report.sections.map((s) => s.item_id)
    if (selectedItemIds.length === allIds.length) {
      // Keep only first test selected rather than empty
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
      if (onAuthorized) onAuthorized()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to authorize report.")
    },
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Modal Controls Toolbar (Hidden during printing) */}
        <div className="px-6 py-3.5 bg-muted/70 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm">
                  Diagnostic Report Print & Release
                </h3>
                <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  #{report?.order.order_number}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Selective test printing, pre-printed stationery mode, and official digital verification
              </p>
            </div>
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
            {report?.order.status !== "authorized" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => authorizeMutation.mutate()}
                disabled={authorizeMutation.isPending}
                className="gap-1.5 text-xs h-8 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 font-bold"
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
              className="gap-1.5 text-xs h-8 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
            >
              <Printer className="h-4 w-4" />
              Print ({displayedSections.length} Test{displayedSections.length > 1 ? "s" : ""})
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Selective Tests Selection Bar (Hidden during printing) */}
        {report?.sections && report.sections.length > 1 && (
          <div className="px-6 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between gap-3 overflow-x-auto print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Print Selected Tests:</span>
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
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
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

        {/* Printable Diagnostic Report Canvas */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 font-sans print:p-0 print:m-0 print:overflow-visible print:bg-white">
          {isLoading || !report ? (
            <div className="py-20">
              <LoadingSpinner label="Generating diagnostic lab report layout..." />
            </div>
          ) : (
            <DiagnosticReportPaper
              report={report}
              includeLetterhead={includeLetterhead}
              selectedItemIds={selectedItemIds}
            />
          )}
        </div>
      </div>
    </div>
  )
}
