import React from "react"
import { useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Printer, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { labService } from "@/services/labService"
import { DiagnosticReportPaper } from "@/components/lab/DiagnosticReportPaper"
import type { DiagnosticReportPayload } from "@/types/lab"

export const PublicLabReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const orderId = parseInt(id || "0")

  const { data: report, isLoading, error } = useQuery<DiagnosticReportPayload>({
    queryKey: ["public", "lab", "report", orderId],
    queryFn: () => labService.getPublicDiagnosticReport(orderId),
    enabled: Boolean(orderId),
  })

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <LoadingSpinner label="Verifying digital diagnostic report..." />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center border border-slate-200">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Diagnostic Report Not Found</h2>
          <p className="text-xs text-slate-600 mt-1">
            The requested diagnostic report could not be verified or the scan link has expired.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100/80 py-6 px-3 sm:px-6 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Verification Banner (Hidden during print) */}
        <div className="p-3.5 bg-white border border-emerald-200 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 uppercase">
                  Verified Authentic Laboratory Report
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.2 rounded-full border border-emerald-300">
                  NABL Standards
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Released by {report.hospital.name} • Accession: #{report.order.sample_accession_number || report.order.order_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="text-xs h-8 gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Diagnostic Report Paper View */}
        <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 print:border-none print:shadow-none print:p-0 print:rounded-none">
          <DiagnosticReportPaper
            report={report}
            includeLetterhead={true}
            publicMode={true}
          />
        </div>
      </div>
    </div>
  )
}
