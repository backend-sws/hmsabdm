import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  X,
  Printer,
  CheckCircle2,
  AlertTriangle,
  TestTube2,
  Barcode,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { BarcodeSvg, getBarcodeSvgString } from "@/utils/barcode"
import { labService } from "@/services/labService"
import type { LabOrder } from "@/types/lab"

interface SampleCollectionModalProps {
  order: LabOrder
  onClose: () => void
  onSuccess: () => void
}

export const SampleCollectionModal: React.FC<SampleCollectionModalProps> = ({
  order,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const [sampleNotes, setSampleNotes] = useState("")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  const collectMutation = useMutation({
    mutationFn: () => labService.collectSample(order.id, sampleNotes),
    onSuccess: (updated) => {
      toast.success(
        `Sample collected! Accession barcode assigned: ${updated.sample_accession_number || "SMP"}`
      )
      queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to mark sample as collected.")
    },
  })

  // Extract distinct container vials needed
  const requiredContainers = Array.from(
    new Set(
      order.items?.map(
        (i) => i.test_template?.container_color || "Red / Plain (SST Gel Tube)"
      ) || ["Red / Plain (SST Gel Tube)"]
    )
  )

  const formatTestCode = (i: any) => {
    const raw = i.test_template?.test_code || i.test_code || ""
    const clean = raw.replace(/^(LAB|RAD|PATH)-/i, "").trim()
    if (clean) return clean
    const match = (i.test_name || "").match(/\(([^)]+)\)/)
    if (match && match[1] && match[1].length <= 8) {
      return match[1].trim()
    }
    return i.test_name || "TEST"
  }

  const handlePrintSticker = () => {
    const accession = order.sample_accession_number || `SMP-${order.order_number}`
    const patient = order.patient
    const testsList = order.items?.map(formatTestCode).join(", ") || "General Panel"
    const now = new Date()
    const collectionDate = order.sample_collected_at
      ? new Date(order.sample_collected_at).toLocaleDateString("en-GB")
      : now.toLocaleDateString("en-GB")
    const collectionTime = order.sample_collected_at
      ? new Date(order.sample_collected_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Thermal Sticker - ${accession}</title>
          <style>
            @page {
              size: 50mm 25mm;
              margin: 0mm !important;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              width: 50mm;
              height: 25mm;
              max-width: 50mm;
              max-height: 25mm;
              overflow: hidden;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, sans-serif;
              text-transform: uppercase;
            }
            .sticker-card {
              width: 48mm;
              height: 23.5mm;
              margin: 0.75mm 1mm;
              border: 1.2px solid #000000;
              border-radius: 2px;
              padding: 1mm 1.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
              background: #ffffff;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 0.8px solid #000000;
              padding-bottom: 0.5px;
              line-height: 1;
            }
            .header-title {
              font-size: 7.5px;
              font-weight: 900;
              letter-spacing: 0.3px;
            }
            .header-token {
              font-size: 8px;
              font-weight: 900;
              font-family: monospace;
            }
            .patient-row {
              font-size: 8px;
              font-weight: 800;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.1;
              margin-top: 0.5px;
            }
            .barcode-wrap {
              text-align: center;
              margin: 0.5px 0;
              width: 100%;
            }
            .barcode-wrap svg {
              display: block !important;
              width: 100% !important;
              height: 26px !important;
              margin: 0 auto !important;
            }
            .barcode-wrap svg rect {
              fill: #000000 !important;
              shape-rendering: crispEdges !important;
            }
            .accession-no {
              font-family: monospace;
              font-size: 7.5px;
              font-weight: 900;
              letter-spacing: 1.2px;
              line-height: 1;
              margin-top: 0.5px;
              text-align: center;
            }
            .footer-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 0.6px solid #000000;
              padding-top: 0.5px;
              font-size: 6px;
              font-weight: 700;
              line-height: 1;
            }
            .tests-row {
              font-size: 5.5px;
              font-weight: 600;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1;
              margin-top: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="sticker-card">
            <div class="header-row">
              <span class="header-title">HOSPITAL DIAGNOSTICS</span>
              <span class="header-token">${order.token_number || "P-01"}</span>
            </div>
            <div class="patient-row">
              ${patient?.name || "Patient"} • ${patient?.age ? patient.age + "Y" : ""} ${patient?.gender || ""}
            </div>
            <div class="barcode-wrap">
              ${getBarcodeSvgString(accession, 26)}
              <div class="accession-no">${accession}</div>
            </div>
            <div class="footer-row">
              <span>UHID: ${patient?.uhid || "N/A"}</span>
              <span>${collectionDate} ${collectionTime}</span>
            </div>
            <div class="tests-row">TESTS: ${testsList}</div>
          </div>
        </body>
      </html>
    `

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.left = "-9999px"
    iframe.style.top = "-9999px"
    iframe.style.width = "400px"
    iframe.style.height = "250px"
    iframe.style.border = "none"
    iframe.style.opacity = "0"
    iframe.style.pointerEvents = "none"
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write(html)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 1500)
    }, 350)
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-[100] flex max-w-full pl-6 sm:pl-10">
        <div className="w-screen max-w-xl md:max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out">
          {/* Header */}
        <div className="px-6 py-4 bg-muted/40 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <TestTube2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-base">
                  Phlebotomy & Sample Collection
                </h3>
                {order.urgency === "STAT" ? (
                  <Badge variant="destructive" className="animate-pulse text-[10px] uppercase font-bold">
                    STAT Urgent
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    {order.urgency}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Order #{order.order_number} • Patient: {order.patient?.name} ({order.patient?.uhid})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Patient Quick Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-3.5 rounded-xl border border-border/60">
            <div>
              <span className="text-[10px] text-muted-foreground block">Patient Name</span>
              <span className="font-semibold text-foreground text-sm">{order.patient?.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">UHID</span>
              <span className="font-mono font-bold text-primary">{order.patient?.uhid}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Age / Gender</span>
              <span className="font-medium text-foreground">
                {order.patient?.age ? `${order.patient.age} Y` : "N/A"} • {order.patient?.gender === "M" ? "Male" : "Female"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Referring Doctor</span>
              <span className="font-medium text-foreground">{order.doctor?.name || "Self / Direct OPD"}</span>
            </div>
          </div>

          {/* Tests & Required Specimen Tubes Checklist */}
          <div>
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <TestTube2 className="h-3.5 w-3.5 text-primary" />
              Tests to Collect & Required Specimen Vials
            </h4>
            <div className="space-y-2">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                      {item.test_name}
                      {item.test_code && (
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                          {item.test_code}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Category: {item.category || "Biochemistry"}
                    </span>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] font-medium">
                      {item.test_template?.container_color || "Red / Plain (SST Gel Tube)"}
                    </Badge>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      Specimen: {item.test_template?.sample_type || "Blood / Serum"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Required Vials Summary Checklist */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <h5 className="font-bold text-amber-700 dark:text-amber-400 text-xs mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Phlebotomy Tubes Summary:
            </h5>
            <div className="flex flex-wrap gap-2">
              {requiredContainers.map((container, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border text-xs font-semibold text-foreground shadow-2xs"
                >
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {container}
                </span>
              ))}
            </div>
          </div>

          {/* Printable Barcode Thermal Sticker Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Barcode className="h-4 w-4 text-primary" />
                Vial Barcode Sticker Preview (2" x 1")
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintSticker}
                className="h-7 text-xs gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Sticker
              </Button>
            </div>
            <div className="p-3 bg-muted/30 border border-dashed border-border rounded-xl flex items-center justify-center">
              <div className="w-72 bg-white text-slate-900 border-2 border-dashed border-slate-300 rounded-lg p-2.5 shadow-md font-sans select-none text-left">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider border-b border-slate-200 pb-1 mb-1">
                  <span>HOSPITAL DIAGNOSTICS</span>
                  <span className="font-mono text-primary font-bold">
                    {order.token_number || "P-01"}
                  </span>
                </div>

                <div className="font-bold text-xs truncate">
                  {order.patient?.name || "Patient"}
                  <span className="font-normal text-[10px] text-slate-600 ml-1.5">
                    {order.patient?.age ? `${order.patient.age}Y` : ""} / {order.patient?.gender || ""}
                  </span>
                </div>

                {/* Real 1D SVG Barcode */}
                <div className="my-1.5 text-center">
                  <BarcodeSvg code={order.sample_accession_number || `SMP-${order.order_number}`} className="w-full h-8" />
                  <div className="font-mono font-bold text-[10px] tracking-wider text-slate-900 mt-1">
                    {order.sample_accession_number || `SMP-${order.order_number}`}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-600 border-t border-slate-200 pt-1">
                  <span className="font-mono">UHID: {order.patient?.uhid || "N/A"}</span>
                  <span>
                    {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="text-[8px] text-slate-500 truncate mt-0.5">
                  TESTS: {order.items?.map(formatTestCode).join(", ")}
                </div>
              </div>
            </div>
          </div>

          {/* Collection Remarks Input */}
          <div className="space-y-1.5">
            <Label htmlFor="sampleNotes" className="text-xs font-semibold text-foreground">
              Phlebotomist Notes (Optional)
            </Label>
            <Input
              id="sampleNotes"
              placeholder="e.g. Fasting sample collected, Left antecubital vein, No hemolysis"
              value={sampleNotes}
              onChange={(e) => setSampleNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-muted/40 border-t border-border flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={collectMutation.isPending}>
            Cancel
          </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => collectMutation.mutate()}
              disabled={collectMutation.isPending}
              className="gap-2 text-xs font-bold"
            >
              <CheckCircle2 className="h-4 w-4" />
              {collectMutation.isPending ? "Recording Collection..." : "Confirm Sample Collected"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
