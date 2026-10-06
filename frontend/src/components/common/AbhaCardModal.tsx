import React from "react"
import { createPortal } from "react-dom"
import { X, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { OfficialAbhaCard } from "./OfficialAbhaCard"

export interface AbhaCardPatientData {
  id?: number | string | null
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
  uhid?: string | null
  abha_card_base64?: string | null
}

interface AbhaCardModalProps {
  open: boolean
  onClose: () => void
  patient: AbhaCardPatientData | null
  token?: string | null
}

export const AbhaCardModal: React.FC<AbhaCardModalProps> = ({
  open,
  onClose,
  patient,
  token,
}) => {
  if (!open || !patient) return null

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-200 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                Official Government ABHA Card
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                  ABDM Verified
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                National Health Authority • Ministry of Health & Family Welfare
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Authentic Official ABHA Card Component */}
        <OfficialAbhaCard
          patient={patient}
          token={token}
          showProceedButton={false}
        />
      </div>
    </div>,
    document.body
  )
}

export default AbhaCardModal
