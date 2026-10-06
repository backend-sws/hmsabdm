import React, { useState, useEffect, useRef } from "react"
import {
  Download,
  Printer,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { abhaService } from "@/services/abhaService"

export interface OfficialAbhaCardProps {
  patient: {
    id?: number | string | null
    uhid?: string | null
    name: string
    abha_number?: string | null
    abha_address?: string | null
    gender?: string | null
    dob?: string | null
    mobile?: string | null
    photo?: string | null
    address?: string | null
    district?: string | null
    state?: string | null
    pincode?: string | null
    abha_card_base64?: string | null
  }
  token?: string | null
  onProceed?: (patientWithCard?: any) => void
  proceedText?: string
  showProceedButton?: boolean
}

// Decode Base64 to Uint8Array (handles single/double base64 and JSON strings)
const base64ToUint8Array = (base64Data: string): Uint8Array => {
  let cleanB64 = (base64Data || "").replace(/^data:[^;]+;base64,/, "").trim()

  if (cleanB64.startsWith("{")) {
    try {
      const parsed = JSON.parse(cleanB64)
      cleanB64 = (parsed.data || parsed.card || parsed.file || cleanB64).trim()
    } catch {}
  }
  cleanB64 = cleanB64.replace(/^"|"$/g, "").trim()

  let binaryString = atob(cleanB64)

  // If double encoded (starts with "JVBER" for PDF)
  if (binaryString.startsWith("JVBER") || binaryString.startsWith('"JVBER')) {
    cleanB64 = binaryString.replace(/^"|"$/g, "").trim()
    binaryString = atob(cleanB64)
  }

  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

// Reject old custom-generated dompdf cards
const isOldCustomPdf = (bytes: Uint8Array): boolean => {
  let str = ""
  const limit = Math.min(bytes.length, 1500)
  for (let i = 0; i < limit; i++) {
    if (bytes[i] !== 0) str += String.fromCharCode(bytes[i])
  }
  return /dompdf/i.test(str) || /CPDF/i.test(str) || /SCAN\s*&\s*SHARE/i.test(str)
}

const createBlobFromBytes = (bytes: Uint8Array): { url: string; mimeType: string } => {
  let mimeType = "application/pdf"
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    mimeType = "image/png"
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    mimeType = "image/jpeg"
  }
  const blob = new Blob([bytes as unknown as BlobPart], { type: mimeType })
  return { url: URL.createObjectURL(blob), mimeType }
}

export const OfficialAbhaCard: React.FC<OfficialAbhaCardProps> = ({
  patient,
  token,
  onProceed,
  proceedText = "Assign Department & Issue OPD Slip",
  showProceedButton = true,
}) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [docMimeType, setDocMimeType] = useState<string>("application/pdf")
  const [rawBase64, setRawBase64] = useState<string | null>(patient.abha_card_base64 || null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Fetch official NHA PDF Base64
  const fetchOfficialCard = React.useCallback(async () => {
    // 1. If base64 is already provided in patient object
    if (patient.abha_card_base64) {
      try {
        const bytes = base64ToUint8Array(patient.abha_card_base64)
        if (!isOldCustomPdf(bytes)) {
          const { url, mimeType } = createBlobFromBytes(bytes)
          setPdfBlobUrl(url)
          setDocMimeType(mimeType)
          setRawBase64(patient.abha_card_base64)
          setLoadError(null)
          return
        }
      } catch (e) {
        console.warn("Failed to decode provided abha_card_base64:", e)
      }
    }

    // 2. Fetch using ABDM X-Token directly from NHA server
    if (token) {
      setIsLoading(true)
      setLoadError(null)
      try {
        const res: any = await abhaService.downloadCard(token, {
          patient_id: patient.id || patient.uhid || undefined,
          abha_number: patient.abha_number || undefined,
          mobile: patient.mobile || undefined,
        })
        const data = res?.data?.data || res?.data || res
        if (typeof data === "string" && data.length > 50) {
          const bytes = base64ToUint8Array(data)
          if (!isOldCustomPdf(bytes)) {
            const { url, mimeType } = createBlobFromBytes(bytes)
            setPdfBlobUrl(url)
            setDocMimeType(mimeType)
            setRawBase64(data)
            setLoadError(null)

            // If patient already exists in database, auto-save to PostgreSQL DB
            const saveTarget = patient.id || patient.uhid || "0"
            fetch(`/api/v1/patients/${saveTarget}/abha-card`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("hms_auth_token") || ""}`,
              },
              body: JSON.stringify({
                card_base64: data,
                abha_number: patient.abha_number,
                mobile: patient.mobile,
              }),
            }).catch(() => {})
            return
          }
        }
      } catch (err: any) {
        console.warn("Failed to fetch official card from NHA token:", err)
        setLoadError(err?.message || "Failed to fetch official card from NHA server.")
      } finally {
        setIsLoading(false)
      }
    }

    // 3. Try fetching saved PDF from PostgreSQL database by ID, UHID, abha_number, or mobile
    let lookupUrl: string | null = null
    if (patient.id) {
      lookupUrl = `/api/v1/patients/${patient.id}/abha-card?format=base64`
    } else if (patient.uhid) {
      lookupUrl = `/api/v1/patients/${patient.uhid}/abha-card?format=base64`
    } else if (patient.abha_number) {
      lookupUrl = `/api/v1/patients/0/abha-card?format=base64&abha_number=${encodeURIComponent(patient.abha_number)}`
    } else if (patient.mobile) {
      lookupUrl = `/api/v1/patients/0/abha-card?format=base64&mobile=${encodeURIComponent(patient.mobile)}`
    }

    if (lookupUrl) {
      setIsLoading(true)
      try {
        const resp = await fetch(lookupUrl, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("hms_auth_token") || ""}`,
          },
        })
        if (resp.ok) {
          const json = await resp.json()
          const b64 = json?.data?.data || json?.data
          if (b64 && typeof b64 === "string" && b64.length > 50) {
            const bytes = base64ToUint8Array(b64)
            if (!isOldCustomPdf(bytes)) {
              const { url, mimeType } = createBlobFromBytes(bytes)
              setPdfBlobUrl(url)
              setDocMimeType(mimeType)
              setRawBase64(b64)
              setLoadError(null)
              return
            }
          }
        }
      } catch (e) {
        console.warn("No stored ABHA card found in backend DB:", e)
      } finally {
        setIsLoading(false)
      }
    }

    setLoadError("Official ABHA Card PDF not yet cached in DB. You can proceed with registration.")
  }, [token, patient.id, patient.uhid, patient.abha_number, patient.mobile, patient.abha_card_base64])

  useEffect(() => {
    fetchOfficialCard()

    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
      }
    }
  }, [fetchOfficialCard])

  // Download official file directly
  const handleDownload = () => {
    const ext = docMimeType === "image/png" ? "png" : docMimeType === "image/jpeg" ? "jpg" : "pdf"
    if (rawBase64) {
      try {
        const bytes = base64ToUint8Array(rawBase64)
        const { url } = createBlobFromBytes(bytes)
        const link = document.createElement("a")
        link.href = url
        link.download = `ABHA_Card_${patient.name.replace(/\s+/g, "_")}.${ext}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 1500)
        toast.success("Official ABDM ABHA Card downloaded!")
        return
      } catch (e) {
        console.error("Download error:", e)
      }
    }

    if (pdfBlobUrl) {
      const link = document.createElement("a")
      link.href = pdfBlobUrl
      link.download = `ABHA_Card_${patient.name.replace(/\s+/g, "_")}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Official ABHA Card downloaded!")
      return
    }

    // Direct stream fallback
    const patientId = patient.id || patient.uhid
    if (patientId) {
      window.open(`/api/v1/patients/${patientId}/abha-card`, "_blank")
    } else {
      toast.error("ABHA Card PDF not available for download.")
    }
  }

  // Print directly from embedded viewer
  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus()
        iframeRef.current.contentWindow.print()
        return
      } catch (e) {
        console.warn("iframe print note:", e)
      }
    }

    if (pdfBlobUrl) {
      const printWindow = window.open(pdfBlobUrl, "_blank")
      if (printWindow) {
        printWindow.focus()
        setTimeout(() => printWindow.print(), 500)
      }
    } else {
      handleDownload()
    }
  }

  const handleProceedClick = () => {
    if (onProceed) {
      // Pass raw base64 along with patient data so registration can save it
      onProceed({
        ...patient,
        abha_card_base64: rawBase64,
      })
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* ─── Real Official NHA PDF Viewer Container ─── */}
      <div className="mx-auto w-full max-w-2xl rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white shadow-xl overflow-hidden">
        {/* Official Header Banner */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3 text-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700 font-bold text-xs">
              🏛️
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">
                National Health Authority (NHA) — Official ABHA Card
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Government of India • Ministry of Health & Family Welfare
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" /> ABDM Verified
          </span>
        </div>

        {/* PDF Rendering Window */}
        <div className="relative min-h-[380px] sm:min-h-[460px] bg-slate-100 flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">
                Fetching Official Government ABHA Card from NHA Server...
              </p>
              <p className="text-xs text-slate-500">
                Retrieving verified PDF base64 stream from ABDM network.
              </p>
            </div>
          ) : pdfBlobUrl ? (
            docMimeType.startsWith("image/") ? (
              <img
                src={pdfBlobUrl}
                alt={`Official ABHA Card - ${patient.name}`}
                className="max-h-[460px] w-auto max-w-full object-contain p-2"
              />
            ) : (
              <iframe
                ref={iframeRef}
                src={`${pdfBlobUrl}#toolbar=0&navpanes=0&view=FitH`}
                title={`Official ABHA Card - ${patient.name}`}
                className="w-full h-[460px] border-none bg-white shadow-inner"
              />
            )
          ) : (
            <div className="p-8 text-center space-y-3 max-w-md">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">
                Patient ABHA Profile Verified
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-mono">
                {patient.name} • {patient.abha_number || patient.abha_address || "ABDM Active"}
              </p>
              <p className="text-[11px] text-slate-500">
                {loadError || "Official PDF will be stored upon completing registration."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchOfficialCard()}
                disabled={isLoading}
                className="mt-2 text-xs gap-1.5 h-8 border-slate-300"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Fetching Official Card..." : "Fetch Official ABHA Card"}
              </Button>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] text-slate-500">
          <span>24x7 NHA Toll-Free Helpline: <b>14477</b></span>
          <span>Official ABDM Network • <b>abdm.gov.in</b></span>
        </div>
      </div>

      {/* ─── Actions Toolbar ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Download Official PDF */}
          <Button
            type="button"
            onClick={handleDownload}
            disabled={!pdfBlobUrl && !rawBase64}
            className="flex-1 sm:flex-initial h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Download Official ABHA Card (PDF)
          </Button>

          {/* Print PDF */}
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            disabled={!pdfBlobUrl && !rawBase64}
            className="h-10 px-4 border-border bg-card text-foreground hover:bg-muted font-semibold text-xs gap-2 shadow-2xs"
          >
            <Printer className="h-4 w-4 text-amber-500" />
            Print Card
          </Button>
        </div>

        {/* Proceed to OPD */}
        {showProceedButton && onProceed && (
          <Button
            type="button"
            onClick={handleProceedClick}
            className="w-full sm:w-auto h-10 px-6 bg-primary text-primary-foreground font-bold text-xs gap-2 shadow-md hover:bg-primary/90"
          >
            {proceedText}
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default OfficialAbhaCard
