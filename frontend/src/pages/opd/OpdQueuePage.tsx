import React, { useState, useMemo, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { PageHeader } from "@/components/common/PageHeader"
import { SectionCard } from "@/components/SectionCard"
import { FilterBar } from "@/components/filter-bar"
import { DataTable, type Column } from "@/components/common/DataTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useSearchFilter } from "@/hooks/useSearchFilter"
import { useDisclosure } from "@/hooks/useDisclosure"
import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Stethoscope,
  PhoneCall,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  Activity,
  FileText,
  Pill,
  Clock,
  User,
  Wifi,
  CalendarCheck,
} from "lucide-react"

import { opdService } from "@/services/opdService"
import { queryKeys } from "@/constants/queryKeys"
import type {
  OpdVisit,
  PrescriptionItem,
  DiagnosisResult,
  SavePrescriptionPayload,
} from "@/types/opd"

// ─── Zod Schema ───────────────────────────────────────────────────────

const prescriptionSchema = z.object({
  chief_complaints: z.string().min(3, "Chief complaint likhein"),
  clinical_notes: z.string().optional(),
  follow_up_date: z.string().optional(),
  advice: z.string().optional(),
  medicines: z
    .array(
      z.object({
        medicine_name: z.string().min(1, "Medicine name required"),
        dosage: z.string().min(1, "Dosage required"),
        frequency: z.string().min(1, "Frequency required"),
        duration: z.string().min(1, "Duration required"),
        route: z.string().optional(),
        instructions: z.string().optional(),
      })
    )
    .optional()
    .default([]),
})

type PrescriptionFormValues = z.infer<typeof prescriptionSchema>

const FREQUENCY_OPTIONS = ["OD", "BID", "TID", "QID", "SOS", "Stat", "BD", "QHS", "QAM"]
const ROUTE_OPTIONS = ["Oral", "IV", "IM", "SC", "Topical", "Inhaled", "Sublingual"]

const INITIAL_FILTERS = { search: "", status: "", page: 1, limit: 20 }

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

// ─── Medicine Search Row ──────────────────────────────────────────────

interface MedicineRowProps {
  index: number
  value: PrescriptionItem
  onChange: (index: number, field: keyof PrescriptionItem, value: string) => void
  onRemove: (index: number) => void
  errors?: any
}

function MedicineRow({ index, value, onChange, onRemove, errors }: MedicineRowProps) {
  const [medQuery, setMedQuery] = useState(value.medicine_name || "")
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMedSearch = (q: string) => {
    setMedQuery(q)
    onChange(index, "medicine_name", q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      const results = await opdService.searchMedicines(q)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    }, 300)
  }

  return (
    <div className="relative rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground mt-1">#{index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Medicine Name with autocomplete */}
        <div className="relative sm:col-span-2">
          <Label className="text-xs">Medicine Name *</Label>
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 text-sm"
              placeholder="Type to search medicine..."
              value={medQuery}
              onChange={(e) => handleMedSearch(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
          </div>
          {showSuggestions && (
            <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
              {suggestions.slice(0, 6).map((med) => (
                <button
                  key={med.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setMedQuery(med.name)
                    onChange(index, "medicine_name", med.name)
                    setShowSuggestions(false)
                  }}
                >
                  <span className="font-medium">{med.name}</span>
                </button>
              ))}
            </div>
          )}
          {errors?.medicine_name && (
            <p className="text-xs text-destructive mt-1">{errors.medicine_name.message}</p>
          )}
        </div>

        <div>
          <Label className="text-xs">Dosage *</Label>
          <Input
            className="text-sm"
            placeholder="e.g. 500mg, 10ml"
            value={value.dosage}
            onChange={(e) => onChange(index, "dosage", e.target.value)}
          />
        </div>

        <div>
          <Label className="text-xs">Frequency *</Label>
          <Select value={value.frequency} onValueChange={(v) => onChange(index, "frequency", v)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Duration *</Label>
          <Input
            className="text-sm"
            placeholder="e.g. 5 days, 1 week"
            value={value.duration}
            onChange={(e) => onChange(index, "duration", e.target.value)}
          />
        </div>

        <div>
          <Label className="text-xs">Route</Label>
          <Select value={value.route} onValueChange={(v) => onChange(index, "route", v)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Route (optional)" />
            </SelectTrigger>
            <SelectContent>
              {ROUTE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label className="text-xs">Special Instructions</Label>
          <Input
            className="text-sm"
            placeholder="e.g. After food, Empty stomach..."
            value={value.instructions || ""}
            onChange={(e) => onChange(index, "instructions", e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Diagnosis Search ─────────────────────────────────────────────────

interface DiagnosisSearchProps {
  selected: DiagnosisResult[]
  onAdd: (d: DiagnosisResult) => void
  onRemove: (code: string) => void
}

function DiagnosisSearch({ selected, onAdd, onRemove }: DiagnosisSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<DiagnosisResult[]>([])
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = (q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); setShow(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const r = await opdService.searchDiagnosis(q)
      setResults(r)
      setShow(r.length > 0)
      setLoading(false)
    }, 350)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="pl-8 text-sm"
          placeholder="ICD-10 diagnosis search... (e.g. Fever, Hypertension)"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onBlur={() => setTimeout(() => setShow(false), 150)}
          onFocus={() => results.length > 0 && setShow(true)}
        />
        {loading && (
          <RefreshCw className="absolute top-2.5 right-3 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {show && (
        <div className="rounded-md border bg-popover shadow-md z-20 max-h-48 overflow-y-auto">
          {results.slice(0, 8).map((d) => (
            <button
              key={d.code}
              type="button"
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onAdd(d)
                setQuery("")
                setShow(false)
                setResults([])
              }}
            >
              <span className="mt-0.5 font-mono text-xs text-muted-foreground shrink-0">{d.code}</span>
              <span className="font-medium text-foreground">{d.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected diagnoses */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((d) => (
            <Badge
              key={d.code}
              variant="outline"
              className="gap-1.5 border-primary/30 bg-primary/5 text-primary pr-1"
            >
              <span className="font-mono text-[10px]">{d.code}</span>
              <span className="text-xs font-medium">{d.name}</span>
              <button
                type="button"
                className="ml-1 rounded hover:text-destructive"
                onClick={() => onRemove(d.code)}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Consultation Drawer ──────────────────────────────────────────────

interface ConsultationDrawerProps {
  visit: OpdVisit
  onComplete: () => void
  onClose: () => void
}

function ConsultationDrawer({ visit, onComplete, onClose }: ConsultationDrawerProps) {
  const queryClient = useQueryClient()
  const [diagnoses, setDiagnoses] = useState<DiagnosisResult[]>([])
  const [medicines, setMedicines] = useState<PrescriptionItem[]>([])

  const { data: vitalsData } = useQuery({
    queryKey: queryKeys.opd.visitVitals(visit.visit_id),
    queryFn: () => opdService.getVisitVitals(visit.visit_id),
    meta: { showToast: false },
  })

  const { data: vitalConfigs = [] } = useQuery({
    queryKey: queryKeys.opd.vitalConfigs,
    queryFn: opdService.getVitalConfigs,
    staleTime: 10 * 60_000,
    meta: { showToast: false },
  })

  const { register, handleSubmit, formState: { errors } } = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionSchema) as any,
  })

  const savePrescriptionMutation = useMutation({
    mutationFn: opdService.savePrescription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.visitPrescription(visit.visit_id) })
      toast.success("Prescription saved successfully!")
    },
  })

  const completeMutation = useMutation({
    mutationFn: () => opdService.completeConsultation(visit.visit_id),
    onSuccess: () => {
      toast.success(`Consultation completed — ${visit.patient_name}`)
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue })
      onComplete()
    },
  })

  const handleMedicineChange = (index: number, field: keyof PrescriptionItem, value: string) => {
    setMedicines((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)))
  }

  const addMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      { medicine_name: "", dosage: "", frequency: "OD", duration: "5 days", route: "Oral" },
    ])
  }

  const onSubmit = async (data: PrescriptionFormValues) => {
    if (diagnoses.length === 0) {
      toast.warning("Please select at least one ICD-10 diagnosis.")
      return
    }

    const payload: SavePrescriptionPayload = {
      visit_id: visit.visit_id,
      patient_id: visit.patient_id,
      diagnosis_codes: diagnoses,
      chief_complaints: data.chief_complaints,
      clinical_notes: data.clinical_notes,
      medicines,
      follow_up_date: data.follow_up_date,
      advice: data.advice,
    }
    await savePrescriptionMutation.mutateAsync(payload)
    completeMutation.mutate()
  }

  const lastVital = vitalsData?.[0]

  return (
    <form id="consultation-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Patient Header */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-foreground text-lg">{visit.patient_name}</p>
            <Badge variant="outline" className="font-mono text-primary border-primary/40">{visit.token_no}</Badge>
            <Badge variant="outline" className="text-xs">{visit.opd_number}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {visit.age ? `${visit.age} yrs` : "—"} / {visit.gender}
            {visit.abha_address && (
              <span className="font-mono text-primary ml-2">ABHA: {visit.abha_address}</span>
            )}
          </p>
          {visit.visit_reason && (
            <p className="text-xs text-muted-foreground">
              Reason: <span className="text-foreground">{visit.visit_reason}</span>
            </p>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="flex items-center gap-1 justify-end">
            <Clock className="h-3 w-3" /> {formatTime(visit.check_in_time)}
          </div>
          <p className="mt-1">{visit.department_name}</p>
        </div>
      </div>

      {/* Section 01 — Recorded Vitals */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Vitals (Recorded by Nurse)</span>
        </div>
        {lastVital ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(lastVital.vitals).map(([key, val]) => {
              const config = vitalConfigs.find((c) => c.key === key)
              return (
                <div key={key} className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">{config?.label ?? key}</p>
                  <p className="mt-1 font-bold text-foreground">
                    {String(val)} {config?.unit ?? ""}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No vitals recorded yet. Pending recording at nurse triage station.
          </p>
        )}
      </div>

      {/* Section 02 — Chief Complaints & Clinical Notes */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Chief Complaints & Clinical Notes</span>
        </div>
        <div>
          <Label className="text-xs">Chief Complaints *</Label>
          <textarea
            {...register("chief_complaints")}
            defaultValue={visit.visit_reason || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-none"
            placeholder="Patient ki chief complaints likhein..."
          />
          {errors.chief_complaints && (
            <p className="text-xs text-destructive mt-1">{errors.chief_complaints.message}</p>
          )}
        </div>
        <div>
          <Label className="text-xs">Clinical Notes / Findings</Label>
          <textarea
            {...register("clinical_notes")}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-none"
            placeholder="Examination findings, observations..."
          />
        </div>
      </div>

      {/* Section 03 — ICD-10 Diagnosis */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Diagnosis (ICD-10)</span>
          <Badge variant="outline" className="text-[10px] ml-auto border-amber-400 text-amber-600">
            ABDM Required
          </Badge>
        </div>
        <DiagnosisSearch
          selected={diagnoses}
          onAdd={(d) => setDiagnoses((prev) => [...prev.filter((x) => x.code !== d.code), d])}
          onRemove={(code) => setDiagnoses((prev) => prev.filter((d) => d.code !== code))}
        />
      </div>

      {/* Section 04 — Prescription */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <Pill className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Prescription (Medicines)</span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="ml-auto"
            onClick={addMedicine}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Medicine
          </Button>
        </div>

        {medicines.length === 0 ? (
          <button
            type="button"
            onClick={addMedicine}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Pill className="h-6 w-6 opacity-50" />
            <p className="text-sm">Click to add first medicine</p>
          </button>
        ) : (
          <div className="space-y-3">
            {medicines.map((med, i) => (
              <MedicineRow
                key={i}
                index={i}
                value={med}
                onChange={handleMedicineChange}
                onRemove={(idx) => setMedicines((prev) => prev.filter((_, j) => j !== idx))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Section 05 — Advice & Follow-up */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Advice & Follow-up</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Follow-up Date</Label>
            <Input type="date" {...register("follow_up_date")} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs">General Advice</Label>
            <Input
              {...register("advice")}
              className="text-sm"
              placeholder="e.g. Rest, light diet, avoid cold..."
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={completeMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="consultation-form"
          disabled={savePrescriptionMutation.isPending || completeMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {(savePrescriptionMutation.isPending || completeMutation.isPending) ? (
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><CheckCircle2 className="mr-2 h-4 w-4" /> Save Rx & Complete</>
          )}
        </Button>
      </div>
    </form>
  )
}

// ─── Main OPD Queue Page ──────────────────────────────────────────────

export const OpdQueuePage: React.FC = () => {
  const queryClient = useQueryClient()
  const consultDisclosure = useDisclosure<OpdVisit>()
  const { filter, handleFilter } = useSearchFilter(INITIAL_FILTERS)

  // ─── Queue Query ─────────────────────────────────────────────────
  const {
    data: queueData,
    isLoading,
    isError,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: queryKeys.opd.queue,
    queryFn: opdService.getQueue,
    refetchInterval: 30_000,
    meta: { showToast: false },
  })

  // ─── Call Patient Mutation ────────────────────────────────────────
  const callMutation = useMutation({
    mutationFn: opdService.callPatient,
    onSuccess: (updated) => {
      toast.info(`${updated.patient_name} ko call kar liya gaya`)
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue })
      consultDisclosure.onOpen(updated)
    },
  })

  // ─── Filtered Queue ───────────────────────────────────────────────
  const filteredQueue = useMemo(() => {
    const raw = Array.isArray(queueData) ? queueData : (queueData as any)?.data
    const queue: OpdVisit[] = Array.isArray(raw) ? raw : []
    return queue.filter((item) => {
      const matchSearch =
        !filter.search ||
        item.patient_name?.toLowerCase().includes(filter.search.toLowerCase()) ||
        item.token_no?.toLowerCase().includes(filter.search.toLowerCase()) ||
        (item.visit_reason ?? "").toLowerCase().includes(filter.search.toLowerCase())
      const matchStatus = !filter.status || item.status === filter.status
      return matchSearch && matchStatus
    })
  }, [queueData, filter])

  // ─── Stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const raw = Array.isArray(queueData) ? queueData : (queueData as any)?.data
    const q: OpdVisit[] = Array.isArray(raw) ? raw : []
    return {
      waiting: q.filter((x) => x.status === "WAITING").length,
      inConsultation: q.filter((x) => x.status === "IN_CONSULTATION").length,
      completed: q.filter((x) => x.status === "COMPLETED").length,
      total: q.length,
    }
  }, [queueData])

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null

  // ─── Table Columns ────────────────────────────────────────────────
  const columns: Column<OpdVisit>[] = useMemo(
    () => [
      {
        header: "Token #",
        cell: (row) => (
          <div>
            <span className="font-mono text-sm font-bold text-primary">{row.token_no}</span>
            <p className="text-[10px] text-muted-foreground">{row.opd_number}</p>
            <p className="text-[10px] text-muted-foreground">{formatTime(row.check_in_time)}</p>
          </div>
        ),
      },
      {
        header: "Patient Info",
        cell: (row) => (
          <div>
            <p className="font-semibold text-foreground">{row.patient_name}</p>
            <p className="text-xs text-muted-foreground">
              {row.age ? `${row.age} yrs` : "—"} / {row.gender}
              {row.abha_address && (
                <span className="font-mono text-[11px] text-primary ml-1">• {row.abha_address}</span>
              )}
            </p>
          </div>
        ),
      },
      {
        header: "Chief Complaint",
        cell: (row) => (
          <span className="text-xs text-foreground line-clamp-2">
            {row.visit_reason ?? <span className="italic text-muted-foreground">Not specified</span>}
          </span>
        ),
      },
      {
        header: "Department",
        cell: (row) => (
          <span className="text-xs font-medium text-muted-foreground">{row.department_name}</span>
        ),
      },
      {
        header: "Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        header: "Actions",
        className: "text-right",
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            {row.status === "WAITING" && (
              <Button
                size="xs"
                variant="default"
                disabled={callMutation.isPending}
                onClick={() => callMutation.mutate(row.visit_id)}
              >
                {callMutation.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <><PhoneCall className="h-3.5 w-3.5 mr-1" /> Call</>
                )}
              </Button>
            )}
            {row.status === "IN_CONSULTATION" && (
              <Button
                size="xs"
                variant="outline"
                className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 dark:text-emerald-400"
                onClick={() => consultDisclosure.onOpen(row)}
              >
                <Stethoscope className="h-3.5 w-3.5 mr-1" /> Active Desk
              </Button>
            )}
            {row.status === "COMPLETED" && (
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Done
              </span>
            )}
          </div>
        ),
      },
    ],
    [callMutation, consultDisclosure]
  )

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="OPD Doctor Consultation Desk"
        subtitle="Call patients from today's queue, record vitals, diagnose with ICD-10 codes, and issue ABDM-compliant E-Prescriptions."
        badgeText="Doctor Console"
        badgeVariant="success"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Waiting", value: stats.waiting, color: "text-amber-600" },
          { label: "In Consultation", value: stats.inConsultation, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, color: "text-emerald-600" },
          { label: "Total Today", value: stats.total, color: "text-foreground" },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* ── Queue Table ── */}
      <SectionCard
        title="Today's OPD Patient Queue"
        description={
          <span className="flex items-center gap-2">
            Live queue sorted by check-in time
            {lastUpdated && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                Updated {lastUpdated}
              </span>
            )}
          </span>
        }
      >
        <FilterBar values={filter} onChange={(u) => handleFilter({ ...u, page: 1 })}>
          <FilterBar.Search
            name="search"
            placeholder="Token #, patient name, symptoms..."
            className="w-72"
          />
          <FilterBar.Select
            name="status"
            placeholder="All Statuses"
            options={[
              { label: "Waiting", value: "WAITING" },
              { label: "In Consultation", value: "IN_CONSULTATION" },
              { label: "Completed", value: "COMPLETED" },
            ]}
          />
        </FilterBar>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <p className="text-sm">Unable to load the OPD queue.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredQueue}
              keyExtractor={(item) => String(item.id)}
            />
          )}
        </div>
      </SectionCard>

      {/* ── Consultation Drawer ── */}
      <FormContainer
        open={consultDisclosure.isOpen}
        onOpenChange={consultDisclosure.onClose}
        title={`Consultation — ${consultDisclosure.data?.patient_name ?? ""}`}
        description={`OPD: ${consultDisclosure.data?.opd_number} • Token: ${consultDisclosure.data?.token_no} • ${consultDisclosure.data?.department_name}`}
        size="xl"
        footer={null}
      >
        {consultDisclosure.data && (
          <ConsultationDrawer
            visit={consultDisclosure.data}
            onComplete={() => {
              consultDisclosure.onClose()
              queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue })
            }}
            onClose={consultDisclosure.onClose}
          />
        )}
      </FormContainer>
    </div>
  )
}
