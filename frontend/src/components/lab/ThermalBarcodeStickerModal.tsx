import React, { useEffect } from "react"
import { createPortal } from "react-dom"
import { Printer, X, Barcode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BarcodeSvg, getBarcodeSvgString } from "@/utils/barcode"
import type { LabOrder } from "@/types/lab"

interface ThermalBarcodeStickerModalProps {
  isOpen?: boolean
  order: LabOrder
  onClose: () => void
}

export const ThermalBarcodeStickerModal: React.FC<ThermalBarcodeStickerModalProps> = ({
  isOpen = true,
  order,
  onClose,
}) => {
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

  if (!isOpen) return null
  const accession = order.sample_accession_number || `SMP-${order.order_number}`
  const patient = order.patient
  const testsList = order.items?.map((i) => i.test_code || i.test_name).join(", ") || "General Panel"
  const collectionDate = order.sample_collected_at
    ? new Date(order.sample_collected_at).toLocaleDateString("en-GB")
    : new Date().toLocaleDateString("en-GB")
  const collectionTime = order.sample_collected_at
    ? new Date(order.sample_collected_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const handlePrint = (useNewWindow = false) => {
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

    if (useNewWindow) {
      const win = window.open("", "_blank", "width=420,height=260")
      if (!win) return
      win.document.open()
      win.document.write(html)
      win.document.close()
      setTimeout(() => {
        win.focus()
        win.print()
      }, 350)
      return
    }

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
      <div className="absolute inset-0" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[100] flex max-w-full pl-6 sm:pl-10">
        <div className="w-screen max-w-md md:max-w-lg bg-card border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out">
          {/* Header */}
        <div className="px-5 py-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Barcode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Thermal Vial Barcode Sticker
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Standard 2" × 1" (50mm × 25mm) Tube Label for Thermal Printers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sticker Preview Box */}
        <div className="p-6 flex flex-col items-center justify-center bg-muted/20">
          <div className="text-[11px] text-muted-foreground mb-3 font-medium">
            Live Preview (Physical Size: 50mm × 25mm)
          </div>

          <div
            id="thermal-vial-sticker"
            className="w-72 bg-white text-slate-900 border-2 border-dashed border-slate-300 rounded-lg p-2.5 shadow-md font-sans select-none"
          >
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider border-b border-slate-200 pb-1 mb-1">
              <span>HOSPITAL DIAGNOSTICS</span>
              <span className="font-mono text-primary font-bold">
                {order.token_number || "P-01"}
              </span>
            </div>

            <div className="font-bold text-xs truncate">
              {patient?.name || "Patient"}
              <span className="font-normal text-[10px] text-slate-600 ml-1.5">
                {patient?.age ? `${patient.age}Y` : ""} / {patient?.gender || ""}
              </span>
            </div>

            {/* Real 1D SVG Barcode */}
            <div className="my-1.5 text-center">
              <BarcodeSvg code={accession} className="w-full h-8" />
              <div className="font-mono font-bold text-[10px] tracking-wider text-slate-900 mt-1">
                {accession}
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-600 border-t border-slate-200 pt-1">
              <span className="font-mono">UHID: {patient?.uhid || "N/A"}</span>
              <span>
                {collectionDate} {collectionTime}
              </span>
            </div>
            <div className="text-[8px] text-slate-500 truncate mt-0.5">
              TESTS: {testsList}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground mt-4 text-center max-w-xs">
            Compatible with TSC, Zebra, TVS, and Citizen thermal barcode label printers. Calibrated without print margins.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-muted/40 border-t border-border flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint(true)}
              className="text-xs h-8.5"
              title="Open dedicated print popup window"
            >
              Open Print Window
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => handlePrint(false)}
              className="text-xs font-bold gap-1.5 h-8.5 px-4"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Sticker
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>,
  document.body
)
}
