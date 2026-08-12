import React from "react"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, CheckCircle2, Zap, ArrowRight } from "lucide-react"

export const AbdmComplianceWidget: React.FC = () => {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs hover:shadow-md transition-shadow space-y-5">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              ABDM Compliance & Gateway
            </h3>
            <p className="text-xs text-muted-foreground font-medium">National Health Authority Gateway V2.0</p>
          </div>
        </div>

        <Badge variant="success" className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full">
          M1 & M2 PASSED
        </Badge>
      </div>

      {/* Compliance Milestones List */}
      <div className="space-y-3.5 text-xs">
        {/* M1 ABHA */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Milestone 1 (M1) - ABHA
            </span>
            <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">100%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-emerald-500/20 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-full" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
            Aadhaar OTP creation, Mobile OTP, ABHA card print, & verification endpoints live.
          </p>
        </div>

        {/* M2 HIP/HIU */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Milestone 2 (M2) - HIP / HIU
            </span>
            <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">100%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-emerald-500/20 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-full" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
            Health record linking, consent manager callbacks, & FHIR bundle sharing.
          </p>
        </div>

        {/* Scan & Share */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 text-xs">
              <Zap className="h-4 w-4 text-blue-500 shrink-0" /> Scan & Share Express Queue
            </span>
            <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-[10px] uppercase bg-blue-500/10 px-2 py-0.5 rounded">ACTIVE</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
            Counter QR tokens integrated for Instant OPD Queue Generation.
          </p>
        </div>
      </div>

      {/* Footer View Gateway Logs Link */}
      <div className="pt-2 text-center border-t border-border/50">
        <button className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
          <span>View Gateway Logs</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

