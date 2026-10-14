import React, { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Send,
  Loader2,
  Pill,
  Zap,
  CheckCircle,
  X,
  User,
  Bed,
} from "lucide-react"
import {
  useCreateWardIndentMutation,
  useFormulary,
} from "@/hooks/usePharmacy"
import { ipdService } from "@/services/ipdService"
import { queryKeys } from "@/constants/queryKeys"
import type { HospitalMedicine } from "@/types/pharmacy"

export interface CreateWardIndentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  prefillAdmissionId?: number
  prefillWardName?: string
  prefillBedNumber?: string
  prefillPatientName?: string
  prefillUhid?: string
}

export const CreateWardIndentModal: React.FC<CreateWardIndentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefillAdmissionId,
  prefillWardName,
  prefillBedNumber,
  prefillPatientName,
  prefillUhid,
}) => {
  const queryClient = useQueryClient()
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<number | undefined>(prefillAdmissionId)
  const [wardName, setWardName] = useState(prefillWardName || "")
  const [bedNumber, setBedNumber] = useState(prefillBedNumber || "")
  const [priority, setPriority] = useState<"ROUTINE" | "URGENT" | "STAT">("ROUTINE")
  const [notes, setNotes] = useState("")

  // Medicine items
  const [items, setItems] = useState<
    Array<{
      hospital_medicine_id: number
      requested_quantity: number
      dosage_instruction?: string
      name: string
      dosage_form?: string
      mrp?: number
    }>
  >([])

  // Search Medicines
  const [medSearch, setMedSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(medSearch.trim())
    }, 200)
    return () => clearTimeout(handler)
  }, [medSearch])

  const { data: formularyData, isFetching: isSearchingMeds } = useFormulary({
    search: debouncedSearch,
    per_page: 8,
  })
  const searchResults: HospitalMedicine[] = formularyData?.data || []

  // Fetch Active Inpatients if not prefilled
  const { data: admissionsData } = useQuery({
    queryKey: ["ipd", "admissions", { status: "admitted" }],
    queryFn: () => ipdService.getAdmissions({ status: "admitted" }),
    enabled: !prefillAdmissionId && isOpen,
  })
  const admittedPatients: any[] = (admissionsData as any)?.data || []

  useEffect(() => {
    if (prefillAdmissionId) {
      setSelectedAdmissionId(prefillAdmissionId)
      if (prefillWardName) setWardName(prefillWardName)
      if (prefillBedNumber) setBedNumber(prefillBedNumber)
    }
  }, [prefillAdmissionId, prefillWardName, prefillBedNumber, isOpen])

  const createMutation = useCreateWardIndentMutation()

  if (!isOpen) return null

  const handleSelectAdmission = (admId: number) => {
    setSelectedAdmissionId(admId)
    const adm = admittedPatients.find((a) => a.id === admId)
    if (adm) {
      setWardName(adm.bed?.ward?.name || adm.ward_name || "General Ward")
      setBedNumber(adm.bed?.bed_number || adm.bed_number || "Bed")
    }
  }

  const handleAddMedicine = (med: HospitalMedicine) => {
    if (items.some((it) => it.hospital_medicine_id === med.id)) return
    setItems((prev) => [
      ...prev,
      {
        hospital_medicine_id: med.id,
        requested_quantity: 1,
        dosage_instruction: "1 Dose Stat",
        name: med.brand_name,
        dosage_form: med.dosage_form,
        mrp: med.mrp,
      },
    ])
    setMedSearch("")
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAdmissionId || items.length === 0) return

    await createMutation.mutateAsync({
      ipd_admission_id: selectedAdmissionId,
      ward_name: wardName || "Inpatient Ward",
      bed_number: bedNumber || "Bed",
      priority,
      notes: notes.trim() || undefined,
      items: items.map((it) => ({
        hospital_medicine_id: it.hospital_medicine_id,
        requested_quantity: it.requested_quantity,
        dosage_instruction: it.dosage_instruction,
      })),
    })

    // Invalidate IPD chart and pharmacy queries
    queryClient.invalidateQueries({ queryKey: ["pharmacy", "ward-indents"] })
    if (selectedAdmissionId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.chart(selectedAdmissionId) })
    }

    onSuccess?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-border">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md ${
              priority === "STAT"
                ? "bg-rose-600 shadow-rose-600/30 animate-pulse"
                : priority === "URGENT"
                ? "bg-amber-600 shadow-amber-600/30"
                : "bg-primary shadow-primary/25"
            }`}>
              {priority === "STAT" ? <Zap className="h-5 w-5" /> : <Pill className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Inpatient Ward Drug Indent
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bedside medication requisition sent directly to Central Pharmacy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="custom-scrollbar flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Patient Context Box */}
          {prefillAdmissionId ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 dark:border-primary/30 dark:bg-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {prefillPatientName || "Inpatient"}
                    </span>
                    <span className="ml-2 text-[11px] font-mono text-slate-500">
                      UHID: {prefillUhid || `ADM-#${prefillAdmissionId}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs dark:bg-slate-800 dark:text-slate-300">
                    <Bed className="h-3.5 w-3.5 text-primary" />
                    {wardName || "Ward"} • {bedNumber || "Bed"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Admitted Inpatient <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedAdmissionId || ""}
                onChange={(e) => handleSelectAdmission(parseInt(e.target.value))}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold outline-none focus:border-primary dark:border-border dark:bg-card"
              >
                <option value="">-- Choose Admitted Patient --</option>
                {admittedPatients.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.patient?.name} ({adm.patient?.uhid}) • {adm.ipd_number} • Bed: {adm.bed?.bed_number || adm.bed_number || "Bed"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ward, Bed & Priority Controls */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Ward / Floor:</label>
              <input
                type="text"
                value={wardName}
                onChange={(e) => setWardName(e.target.value)}
                placeholder="e.g. ICU, General Ward"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium outline-none focus:border-primary dark:border-border dark:bg-card dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Bed Number:</label>
              <input
                type="text"
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
                placeholder="e.g. Bed-04"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium outline-none focus:border-primary dark:border-border dark:bg-card dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Requisition Urgency:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className={`mt-1 w-full rounded-xl border p-2 text-xs font-bold outline-none ${
                  priority === "STAT"
                    ? "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    : priority === "URGENT"
                    ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    : "border-slate-200 bg-white text-slate-800 dark:border-border dark:bg-card dark:text-white"
                }`}
              >
                <option value="ROUTINE">Routine (Ward Regular)</option>
                <option value="URGENT">Urgent (Within 1 Hour)</option>
                <option value="STAT">⚡ STAT (Immediate Bedside)</option>
              </select>
            </div>
          </div>

          {/* Search & Add Formulary Medicines */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Search & Add Medications from Hospital Formulary:
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                placeholder="Search brand name, generic composition (e.g. Pantoprazole, Paracetamol, Ceftriaxone)..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
              />
              {isSearchingMeds && (
                <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-primary" />
              )}
            </div>

            {/* Dropdown Results */}
            {debouncedSearch.length >= 2 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-border dark:bg-card">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 text-xs">
                    No formulation found matching "{debouncedSearch}".
                  </div>
                ) : (
                  searchResults.map((m) => {
                    const isAdded = items.some((it) => it.hospital_medicine_id === m.id)
                    return (
                      <div
                        key={m.id}
                        onClick={() => !isAdded && handleAddMedicine(m)}
                        className={`flex cursor-pointer items-center justify-between border-b border-slate-100 p-2.5 transition-colors dark:border-border/50 ${
                          isAdded
                            ? "bg-slate-50 opacity-60 dark:bg-slate-800/40"
                            : "hover:bg-primary/5 dark:hover:bg-primary/10"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">{m.brand_name}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 dark:bg-muted dark:text-slate-300">
                              {m.dosage_form}
                            </span>
                            {m.strength && (
                              <span className="text-[10px] text-slate-400">({m.strength})</span>
                            )}
                          </div>
                          {m.generic_name && (
                            <p className="text-[10px] text-slate-400">{m.generic_name}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            ₹{m.mrp || m.default_selling_price || 0}
                          </span>
                          <button
                            type="button"
                            className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                              isAdded
                                ? "bg-slate-200 text-slate-500 dark:bg-slate-700"
                                : "bg-primary text-white hover:bg-primary/90"
                            }`}
                          >
                            {isAdded ? "Added" : "+ Add"}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Added Requisition Items List */}
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400 dark:border-border">
              <Pill className="mx-auto mb-1.5 h-6 w-6 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">No Medications Added Yet</p>
              <p className="text-[11px] text-slate-400">Search formulary above to add tablets, injections, or IV fluids.</p>
            </div>
          ) : (
            <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-border dark:bg-slate-900/40">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Requisition Drug List ({items.length} items)</span>
                <span className="text-slate-400 font-normal text-[11px]">Specify qty & bedside dosing instruction</span>
              </div>

              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div
                    key={it.hospital_medicine_id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-border dark:bg-card sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{it.name}</span>
                        {it.dosage_form && (
                          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-muted dark:text-slate-300">
                            {it.dosage_form}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 1 Tab Stat, 500ml IV TDS"
                        value={it.dosage_instruction}
                        onChange={(e) => {
                          const val = e.target.value
                          setItems((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, dosage_instruction: val } : item))
                          )
                        }}
                        className="flex-1 min-w-[150px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-primary dark:border-border dark:bg-card"
                      />
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold">Qty:</label>
                        <input
                          type="number"
                          min={1}
                          value={it.requested_quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1
                            setItems((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, requested_quantity: val } : item))
                            )
                          }}
                          className="w-14 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center font-bold text-xs dark:border-border dark:bg-card"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Notes */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Doctor / Nurse Bedside Instructions / Notes:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Post-op pain management, urgent antibiotic for fever spike..."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-border dark:bg-card dark:text-white"
            />
          </div>

          {/* Auto-Billing Note */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-[11px] text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span>
              <strong>Auto-IPD Billing Integration:</strong> Once Pharmacy dispenses these medicines, the exact batch-level selling price will automatically post into this patient's interim IPD ledger under Category: Pharmacy.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-border dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !selectedAdmissionId || items.length === 0}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50 ${
                priority === "STAT"
                  ? "bg-rose-600 shadow-rose-600/30 hover:bg-rose-700"
                  : priority === "URGENT"
                  ? "bg-amber-600 shadow-amber-600/30 hover:bg-amber-700"
                  : "bg-primary shadow-primary/25 hover:bg-primary/90"
              }`}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending Requisition...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {priority === "STAT" ? "Send STAT Requisition" : "Send Indent to Pharmacy"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
