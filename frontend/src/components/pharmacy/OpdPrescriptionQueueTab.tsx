import React, { useState } from "react"
import {
  Search,
  Stethoscope,
  Clock,
  User,
  ArrowRight,
  Pill,
  CheckCircle,
} from "lucide-react"
import { usePendingPrescriptions } from "@/hooks/usePharmacy"

interface OpdPrescriptionQueueTabProps {
  onFulfillPrescription: (prescriptionId: number, patientData: any) => void
}

export const OpdPrescriptionQueueTab: React.FC<OpdPrescriptionQueueTabProps> = ({
  onFulfillPrescription,
}) => {
  const [search, setSearch] = useState("")
  const { data, isLoading } = usePendingPrescriptions({ search })
  const prescriptions = data?.data || []

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-border dark:bg-card">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Live OPD & Inpatient Prescriptions Queue
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time doctor orders waiting for medicine dispensing (auto-refreshing every 15s)
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Token, UHID, or Name..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
          />
        </div>
      </div>

      {/* Prescriptions List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-center dark:border-border dark:bg-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            All Prescriptions Dispensed!
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            No pending doctor prescriptions in queue right now. New prescriptions from doctors will automatically pop up here!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {prescriptions.map((rx: any) => {
            const patient = rx.patient
            const doctor = rx.doctor
            const opd = rx.opd_visit
            const items = rx.items || []

            return (
              <div
                key={rx.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md dark:border-border dark:bg-card"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      {opd?.token_number ? (
                        <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <span className="text-[10px] font-bold uppercase leading-none">Token</span>
                          <span className="text-base font-extrabold leading-tight">#{opd.token_number}</span>
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">
                          {patient ? (patient.name || `${patient.first_name || ""} ${patient.last_name || ""}`.trim()) : "Patient"}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          UHID: {patient?.uhid || "N/A"} • {patient?.gender || "N/A"} • {patient?.age ? `${patient.age}y` : ""} • Phone: {patient?.phone || patient?.mobile || "N/A"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-muted dark:text-slate-300">
                      {rx.prescription_number}
                    </span>
                  </div>

                  {/* Doctor Info */}
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Stethoscope className="h-3.5 w-3.5 text-primary" />
                    <span>
                      Prescribed by: <strong>{doctor?.full_name || "Doctor"}</strong> ({doctor?.specialization || "General"})
                    </span>
                  </div>

                  {/* Prescribed Items Pills */}
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-border/50">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Prescribed Medicines ({items.length}):
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {items.map((item: any) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-border dark:bg-muted dark:text-slate-200"
                        >
                          <Pill className="h-3 w-3 text-primary" />
                          {item.medicine_name}
                          <span className="text-[10px] text-slate-500">
                            ({item.dosage || item.frequency || `${item.duration_days}d`})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-border/50">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(rx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onFulfillPrescription(rx.id, {
                        customer_name: patient ? (patient.name || `${patient.first_name || ""} ${patient.last_name || ""}`.trim()) : "",
                        customer_phone: patient?.phone || patient?.mobile || "",
                        doctor_name: doctor?.full_name || "",
                        patient_id: patient?.id,
                        opd_visit_id: opd?.id,
                        prescription_id: rx.id,
                        sale_type: "OPD",
                      })
                    }
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary/90"
                  >
                    <span>Load into POS</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
