import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { otService } from "@/services/otService"
import type {
  OtSchedule,
  WhoSignInChecks,
  WhoTimeOutChecks,
  WhoSignOutChecks,
  SaveOtChecklistPayload,
} from "@/types/ot"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  ShieldCheck,
  CheckCircle2,
  Printer,
  AlertTriangle,
  HeartPulse,
  Scissors,
  Loader2,
  FileCheck,
} from "lucide-react"

interface WhoSurgicalSafetyModalProps {
  isOpen: boolean
  onClose: () => void
  schedule: OtSchedule
  onSuccess?: () => void
  onOpenPrint?: () => void
}

export const WhoSurgicalSafetyModal: React.FC<WhoSurgicalSafetyModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onSuccess,
  onOpenPrint,
}) => {
  const queryClient = useQueryClient()
  const [activeStage, setActiveStage] = useState<"signin" | "timeout" | "signout">("signin")

  // State for Checklist
  const [signInData, setSignInData] = useState<{
    completed: boolean
    nurse_name: string
    anesthetist_name: string
    checks: WhoSignInChecks
  }>({
    completed: false,
    nurse_name: schedule.scrub_nurse_name || "Duty Scrub Nurse",
    anesthetist_name: schedule.anesthetist?.name || "",
    checks: {
      patient_identity_confirmed: false,
      site_marked: false,
      anesthesia_safety_check: false,
      pulse_oximeter_functioning: true,
      known_allergy: false,
      allergy_details: "",
      difficult_airway_risk: false,
      blood_loss_risk_over_500ml: false,
    },
  })

  const [timeOutData, setTimeOutData] = useState<{
    completed: boolean
    checks: WhoTimeOutChecks
  }>({
    completed: false,
    checks: {
      team_members_introduced: false,
      surgeon_anesthetist_nurse_confirm_patient_site: false,
      antibiotic_prophylaxis_given_60min: false,
      antibiotic_name: "Inj Cefazolin 1g IV",
      anticipated_critical_events_reviewed: false,
      sterility_indicators_confirmed: true,
      essential_imaging_displayed: false,
    },
  })

  const [signOutData, setSignOutData] = useState<{
    completed: boolean
    nurse_name: string
    checks: WhoSignOutChecks
  }>({
    completed: false,
    nurse_name: schedule.scrub_nurse_name || "Duty Scrub Nurse",
    checks: {
      procedure_name_recorded: false,
      instrument_swab_needle_count_correct: false,
      specimen_labelled_correctly: false,
      equipment_problems_addressed: false,
      recovery_concerns_reviewed: false,
    },
  })

  // Fetch Checklist
  const { data: checklist, isLoading } = useQuery({
    queryKey: ["ot", "checklist", schedule.id],
    queryFn: () => otService.getChecklist(schedule.id),
    enabled: isOpen && !!schedule.id,
  })

  useEffect(() => {
    if (checklist) {
      setSignInData({
        completed: Boolean(checklist.sign_in_completed),
        nurse_name: checklist.sign_in_nurse_name || schedule.scrub_nurse_name || "",
        anesthetist_name: checklist.sign_in_anesthetist_name || schedule.anesthetist?.name || "",
        checks: {
          patient_identity_confirmed: false,
          site_marked: false,
          anesthesia_safety_check: false,
          pulse_oximeter_functioning: true,
          known_allergy: false,
          allergy_details: "",
          difficult_airway_risk: false,
          blood_loss_risk_over_500ml: false,
          ...(checklist.sign_in_checks || {}),
        },
      })

      setTimeOutData({
        completed: Boolean(checklist.time_out_completed),
        checks: {
          team_members_introduced: false,
          surgeon_anesthetist_nurse_confirm_patient_site: false,
          antibiotic_prophylaxis_given_60min: false,
          antibiotic_name: "Inj Cefazolin 1g IV",
          anticipated_critical_events_reviewed: false,
          sterility_indicators_confirmed: true,
          essential_imaging_displayed: false,
          ...(checklist.time_out_checks || {}),
        },
      })

      setSignOutData({
        completed: Boolean(checklist.sign_out_completed),
        nurse_name: checklist.sign_out_nurse_name || schedule.scrub_nurse_name || "",
        checks: {
          procedure_name_recorded: false,
          instrument_swab_needle_count_correct: false,
          specimen_labelled_correctly: false,
          equipment_problems_addressed: false,
          recovery_concerns_reviewed: false,
          ...(checklist.sign_out_checks || {}),
        },
      })

      // Auto-open next incomplete stage
      if (!checklist.sign_in_completed) {
        setActiveStage("signin")
      } else if (!checklist.time_out_completed) {
        setActiveStage("timeout")
      } else {
        setActiveStage("signout")
      }
    }
  }, [checklist, schedule])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: SaveOtChecklistPayload = {
        sign_in_completed: signInData.completed,
        sign_in_nurse_name: signInData.nurse_name,
        sign_in_anesthetist_name: signInData.anesthetist_name,
        sign_in_checks: signInData.checks,

        time_out_completed: timeOutData.completed,
        time_out_checks: timeOutData.checks,

        sign_out_completed: signOutData.completed,
        sign_out_nurse_name: signOutData.nurse_name,
        sign_out_checks: signOutData.checks,
      }
      return otService.saveChecklist(schedule.id, payload)
    },
    onSuccess: () => {
      toast.success("WHO Surgical Safety Checklist verified & saved!")
      queryClient.invalidateQueries({ queryKey: ["ot", "checklist", schedule.id] })
      queryClient.invalidateQueries({ queryKey: ["ot", "schedules"] })
      onSuccess?.()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save checklist")
    },
  })

  const isAllComplete =
    signInData.completed && timeOutData.completed && signOutData.completed

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-purple-900/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold">
                <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  WHO Surgical Safety Checklist (NABH Protocol)
                  {isAllComplete ? (
                    <Badge className="bg-emerald-600 text-white text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Fully Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      In Progress
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Patient: <span className="font-semibold text-foreground">{schedule.patient?.name}</span> ({schedule.patient?.uhid}) • Procedure: <span className="font-semibold text-foreground">{schedule.procedure_name}</span> • Booking #{schedule.booking_number}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenPrint}
                className="gap-1.5 text-xs text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900"
              >
                <Printer className="h-4 w-4" /> Print Dossier
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 3 WHO Safety Check Stages Ribbon */}
        <div className="grid grid-cols-3 border-b border-border bg-muted/40 p-2 gap-2 text-center text-xs">
          <button
            type="button"
            onClick={() => setActiveStage("signin")}
            className={`p-2.5 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
              activeStage === "signin"
                ? "bg-card border-blue-500 text-foreground font-bold shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center">
                1
              </span>
              <span className="uppercase tracking-wider text-[11px]">SIGN IN</span>
              {signInData.completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
            </div>
            <span className="text-[10px] font-normal text-muted-foreground">Before Induction of Anesthesia</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStage("timeout")}
            className={`p-2.5 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
              activeStage === "timeout"
                ? "bg-card border-amber-500 text-foreground font-bold shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-[11px] flex items-center justify-center">
                2
              </span>
              <span className="uppercase tracking-wider text-[11px]">TIME OUT</span>
              {timeOutData.completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
            </div>
            <span className="text-[10px] font-normal text-muted-foreground">Before Skin Incision</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStage("signout")}
            className={`p-2.5 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
              activeStage === "signout"
                ? "bg-card border-purple-500 text-foreground font-bold shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center justify-center">
                3
              </span>
              <span className="uppercase tracking-wider text-[11px]">SIGN OUT</span>
              {signOutData.completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
            </div>
            <span className="text-[10px] font-normal text-muted-foreground">Before Leaving OT</span>
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading WHO Surgical Safety Checklist...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ── STAGE 1: SIGN IN ── */}
            {activeStage === "signin" && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-950 dark:text-blue-300 font-semibold">
                    <HeartPulse className="h-4 w-4 text-blue-600" />
                    Phase 1: Verification with Nurse and Anesthesia Professional before induction
                  </div>
                  <Badge variant="outline" className="border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px]">
                    Pre-Induction Safety
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column Checks */}
                  <div className="space-y-3.5 p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="chk_identity"
                        checked={signInData.checks.patient_identity_confirmed}
                        onChange={(e) =>
                          setSignInData((p) => ({
                            ...p,
                            checks: { ...p.checks, patient_identity_confirmed: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer mt-0.5"
                      />
                      <label htmlFor="chk_identity" className="text-xs cursor-pointer">
                        <span className="font-bold text-foreground block">Patient Identity, Site, Procedure & Consent</span>
                        <span className="text-muted-foreground text-[11px]">Confirmed verbally with patient / guardian and wristband matched.</span>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="chk_site"
                        checked={signInData.checks.site_marked}
                        onChange={(e) =>
                          setSignInData((p) => ({
                            ...p,
                            checks: { ...p.checks, site_marked: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer mt-0.5"
                      />
                      <label htmlFor="chk_site" className="text-xs cursor-pointer">
                        <span className="font-bold text-foreground block">Surgical Site Marked</span>
                        <span className="text-muted-foreground text-[11px]">Operative site marked by surgeon (or not applicable for midline/endoscopy).</span>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="chk_anesthesia_machine"
                        checked={signInData.checks.anesthesia_safety_check}
                        onChange={(e) =>
                          setSignInData((p) => ({
                            ...p,
                            checks: { ...p.checks, anesthesia_safety_check: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer mt-0.5"
                      />
                      <label htmlFor="chk_anesthesia_machine" className="text-xs cursor-pointer">
                        <span className="font-bold text-foreground block">Anesthesia Machine & Medication Check</span>
                        <span className="text-muted-foreground text-[11px]">Vaporizers, suction, emergency drugs & oxygen circuit tested.</span>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="chk_pulseox"
                        checked={signInData.checks.pulse_oximeter_functioning}
                        onChange={(e) =>
                          setSignInData((p) => ({
                            ...p,
                            checks: { ...p.checks, pulse_oximeter_functioning: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer mt-0.5"
                      />
                      <label htmlFor="chk_pulseox" className="text-xs cursor-pointer">
                        <span className="font-bold text-foreground block">Pulse Oximeter Placed & Functioning</span>
                        <span className="text-muted-foreground text-[11px]">Continuous plethysmogram tone and SpO2 display active.</span>
                      </label>
                    </div>
                  </div>

                  {/* Right Column Risks */}
                  <div className="space-y-3.5 p-4 rounded-xl border border-border bg-card">
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="chk_allergy"
                          checked={signInData.checks.known_allergy}
                          onChange={(e) =>
                            setSignInData((p) => ({
                              ...p,
                              checks: { ...p.checks, known_allergy: e.target.checked },
                            }))
                          }
                          className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer mt-0.5"
                        />
                        <label htmlFor="chk_allergy" className="text-xs cursor-pointer">
                          <span className="font-bold text-foreground block">Known Drug Allergy Present?</span>
                          <span className="text-muted-foreground text-[11px]">Red alert allergy tag placed if positive.</span>
                        </label>
                      </div>
                      {signInData.checks.known_allergy && (
                        <Input
                          className="text-xs ml-7"
                          placeholder="Specify allergy (e.g. Penicillin, Latex, NSAIDs)..."
                          value={signInData.checks.allergy_details || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSignInData((p) => ({
                              ...p,
                              checks: { ...p.checks, allergy_details: e.target.value },
                            }))
                          }
                        />
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="chk_airway"
                        checked={signInData.checks.difficult_airway_risk}
                        onChange={(e) =>
                          setSignInData((p) => ({
                            ...p,
                            checks: { ...p.checks, difficult_airway_risk: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer mt-0.5"
                      />
                      <label htmlFor="chk_airway" className="text-xs cursor-pointer">
                        <span className="font-bold text-foreground block">Difficult Airway / Aspiration Risk?</span>
                        <span className="text-muted-foreground text-[11px]">Video laryngoscope & difficult airway cart available bedside.</span>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="chk_blood_risk"
                        checked={signInData.checks.blood_loss_risk_over_500ml}
                        onChange={(e) =>
                          setSignInData((p) => ({
                            ...p,
                            checks: { ...p.checks, blood_loss_risk_over_500ml: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer mt-0.5"
                      />
                      <label htmlFor="chk_blood_risk" className="text-xs cursor-pointer">
                        <span className="font-bold text-foreground block">Risk of &gt; 500ml Blood Loss?</span>
                        <span className="text-muted-foreground text-[11px]">At least two large-bore IV lines placed & blood cross-matched.</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sign In Completion Box */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="chk_signin_done"
                      checked={signInData.completed}
                      onChange={(e) => setSignInData((p) => ({ ...p, completed: e.target.checked }))}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="chk_signin_done" className="text-xs font-bold text-foreground cursor-pointer">
                      Phase 1 (SIGN IN) Complete & Verified for Induction
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Scrub / Circulating Nurse</Label>
                      <Input
                        className="h-8 text-xs w-44"
                        value={signInData.nurse_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignInData((p) => ({ ...p, nurse_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Attending Anesthetist</Label>
                      <Input
                        className="h-8 text-xs w-44"
                        value={signInData.anesthetist_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignInData((p) => ({ ...p, anesthetist_name: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STAGE 2: TIME OUT ── */}
            {activeStage === "timeout" && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-950 dark:text-amber-300 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Phase 2: Briefing with Entire Surgical Team immediately before skin incision
                  </div>
                  <Badge variant="outline" className="border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px]">
                    Pre-Incision Briefing
                  </Badge>
                </div>

                <div className="space-y-3.5 p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="chk_timeout_intro"
                      checked={timeOutData.checks.team_members_introduced}
                      onChange={(e) =>
                        setTimeOutData((p) => ({
                          ...p,
                          checks: { ...p.checks, team_members_introduced: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer mt-0.5"
                    />
                    <label htmlFor="chk_timeout_intro" className="text-xs cursor-pointer">
                      <span className="font-bold text-foreground block">Team Introductions</span>
                      <span className="text-muted-foreground text-[11px]">All surgical team members introduced themselves by name and clinical role.</span>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="chk_timeout_patient"
                      checked={timeOutData.checks.surgeon_anesthetist_nurse_confirm_patient_site}
                      onChange={(e) =>
                        setTimeOutData((p) => ({
                          ...p,
                          checks: {
                            ...p.checks,
                            surgeon_anesthetist_nurse_confirm_patient_site: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer mt-0.5"
                    />
                    <label htmlFor="chk_timeout_patient" className="text-xs cursor-pointer">
                      <span className="font-bold text-foreground block">Verbal Confirmation: Patient, Incision Site & Procedure</span>
                      <span className="text-muted-foreground text-[11px]">
                        Surgeon, Anesthetist, and Scrub Nurse verbally confirmed patient name, correct side/site, and exact planned operation.
                      </span>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="chk_timeout_abx"
                      checked={timeOutData.checks.antibiotic_prophylaxis_given_60min}
                      onChange={(e) =>
                        setTimeOutData((p) => ({
                          ...p,
                          checks: { ...p.checks, antibiotic_prophylaxis_given_60min: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <label htmlFor="chk_timeout_abx" className="text-xs cursor-pointer block">
                        <span className="font-bold text-foreground block">Antibiotic Prophylaxis Administered within Last 60 Minutes?</span>
                        <span className="text-muted-foreground text-[11px]">NABH Infection Control: Prophylactic antibiotic given prior to incision.</span>
                      </label>
                      {timeOutData.checks.antibiotic_prophylaxis_given_60min && (
                        <Input
                          className="h-8 text-xs max-w-sm"
                          placeholder="Antibiotic name & dose (e.g. Inj Cefuroxime 1.5g IV)..."
                          value={timeOutData.checks.antibiotic_name || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setTimeOutData((p) => ({
                              ...p,
                              checks: { ...p.checks, antibiotic_name: e.target.value },
                            }))
                          }
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="chk_timeout_critical"
                      checked={timeOutData.checks.anticipated_critical_events_reviewed}
                      onChange={(e) =>
                        setTimeOutData((p) => ({
                          ...p,
                          checks: {
                            ...p.checks,
                            anticipated_critical_events_reviewed: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer mt-0.5"
                    />
                    <label htmlFor="chk_timeout_critical" className="text-xs cursor-pointer">
                      <span className="font-bold text-foreground block">Anticipated Critical Events Reviewed</span>
                      <span className="text-muted-foreground text-[11px]">
                        Surgeon reviewed critical steps & duration; Anesthetist reviewed patient-specific risks; Nursing team reviewed sterility & equipment ready.
                      </span>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="chk_timeout_imaging"
                      checked={timeOutData.checks.essential_imaging_displayed}
                      onChange={(e) =>
                        setTimeOutData((p) => ({
                          ...p,
                          checks: { ...p.checks, essential_imaging_displayed: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer mt-0.5"
                    />
                    <label htmlFor="chk_timeout_imaging" className="text-xs cursor-pointer">
                      <span className="font-bold text-foreground block">Essential Diagnostic Imaging Displayed</span>
                      <span className="text-muted-foreground text-[11px]">X-rays, CT / MRI scans, or USG films mounted on OT view box or digital PACS display.</span>
                    </label>
                  </div>
                </div>

                {/* Time Out Completion Box */}
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="chk_timeout_done"
                      checked={timeOutData.completed}
                      onChange={(e) => setTimeOutData((p) => ({ ...p, completed: e.target.checked }))}
                      className="h-5 w-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="chk_timeout_done" className="text-xs font-bold text-foreground cursor-pointer">
                      Phase 2 (TIME OUT) Complete & Incision Authorized
                    </label>
                  </div>

                  <span className="text-xs font-mono text-muted-foreground">
                    Dr. {schedule.primary_surgeon?.name || "Surgeon"} + Team
                  </span>
                </div>
              </div>
            )}

            {/* ── STAGE 3: SIGN OUT ── */}
            {activeStage === "signout" && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-950 dark:text-purple-300 font-semibold">
                    <Scissors className="h-4 w-4 text-purple-600" />
                    Phase 3: Final Counts & Specimen Check before patient leaves Operating Room
                  </div>
                  <Badge variant="outline" className="border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[10px]">
                    Post-Operative Debrief
                  </Badge>
                </div>

                <div className="space-y-3.5 p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="chk_signout_proc"
                      checked={signOutData.checks.procedure_name_recorded}
                      onChange={(e) =>
                        setSignOutData((p) => ({
                          ...p,
                          checks: { ...p.checks, procedure_name_recorded: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer mt-0.5"
                    />
                    <label htmlFor="chk_signout_proc" className="text-xs cursor-pointer">
                      <span className="font-bold text-foreground block">Exact Name of Procedure Recorded</span>
                      <span className="text-muted-foreground text-[11px]">Nurse verbally confirmed and noted official procedure performed.</span>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="chk_signout_counts"
                      checked={signOutData.checks.instrument_swab_needle_count_correct}
                      onChange={(e) =>
                        setSignOutData((p) => ({
                          ...p,
                          checks: {
                            ...p.checks,
                            instrument_swab_needle_count_correct: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer mt-0.5"
                    />
                    <label htmlFor="chk_signout_counts" className="text-xs cursor-pointer">
                      <span className="font-bold text-foreground block">Instrument, Sponge, Swab & Needle Counts Correct</span>
                      <span className="text-muted-foreground text-[11px]">
                        Scrub and circulating nurse verified 100% count reconciliations with no missing items.
                      </span>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="chk_signout_specimen"
                      checked={signOutData.checks.specimen_labelled_correctly}
                      onChange={(e) =>
                        setSignOutData((p) => ({
                          ...p,
                          checks: { ...p.checks, specimen_labelled_correctly: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer mt-0.5"
                    />
                    <label htmlFor="chk_signout_specimen" className="text-xs cursor-pointer">
                      <span className="font-bold text-foreground block">Specimen Properly Labelled (Histopathology / Cytology)</span>
                      <span className="text-muted-foreground text-[11px]">
                        Specimen container labelled with patient name, UHID, tissue description, and placed in formalin.
                      </span>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="chk_signout_equipment"
                      checked={signOutData.checks.equipment_problems_addressed}
                      onChange={(e) =>
                        setSignOutData((p) => ({
                          ...p,
                          checks: { ...p.checks, equipment_problems_addressed: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer mt-0.5"
                    />
                    <label htmlFor="chk_signout_equipment" className="text-xs cursor-pointer">
                      <span className="font-bold text-foreground block">Equipment Problems / Malfunctions Addressed</span>
                      <span className="text-muted-foreground text-[11px]">Any instrument breakdown or diathermy issues flagged for maintenance.</span>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="chk_signout_recovery"
                      checked={signOutData.checks.recovery_concerns_reviewed}
                      onChange={(e) =>
                        setSignOutData((p) => ({
                          ...p,
                          checks: { ...p.checks, recovery_concerns_reviewed: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer mt-0.5"
                    />
                    <label htmlFor="chk_signout_recovery" className="text-xs cursor-pointer">
                      <span className="font-bold text-foreground block">Key Concerns for PACU Recovery & Ward Transfer Reviewed</span>
                      <span className="text-muted-foreground text-[11px]">
                        Surgeon and Anesthetist handed over vital parameters, pain management, and extubation status.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Sign Out Completion Box */}
                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="chk_signout_done"
                      checked={signOutData.completed}
                      onChange={(e) => setSignOutData((p) => ({ ...p, completed: e.target.checked }))}
                      className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="chk_signout_done" className="text-xs font-bold text-foreground cursor-pointer">
                      Phase 3 (SIGN OUT) Complete — Patient Cleared for PACU
                    </label>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Verifying Nurse Name</Label>
                    <Input
                      className="h-8 text-xs w-48"
                      value={signOutData.nurse_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignOutData((p) => ({ ...p, nurse_name: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            Close
          </Button>

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
            Save & Sign Safety Checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default WhoSurgicalSafetyModal
