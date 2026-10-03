import { apiClient } from "./apiClient"
import type {
  OpdVisit,
  VitalConfig,
  VitalRecord,
  RecordVitalPayload,
  DiagnosisResult,
  MedicineResult,
  SavePrescriptionPayload,
  SavedPrescription,
  CompleteConsultationPayload,
} from "@/types/opd"

export const opdService = {
  // ─── OPD Queue ────────────────────────────────────────────────────────

  /**
   * Fetch today's OPD queue for the logged-in doctor/hospital.
   * GET /opd/queue
   * Poll every 30 seconds on the OPD Queue page.
   */
  getQueue: async (): Promise<OpdVisit[]> => {
    const res = await apiClient<any>("/opd/queue")
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    return []
  },

  /**
   * Mark a patient as "called in" (status: WAITING → IN_CONSULTATION).
   * POST /opd/visit/{visitId}/call
   */
  callPatient: async (visitId: number): Promise<OpdVisit> => {
    return apiClient<OpdVisit>(`/opd/visit/${visitId}/call`, {
      method: "POST",
    })
  },

  /**
   * Mark consultation as complete (status: IN_CONSULTATION → COMPLETED).
   * POST /opd/visit/{visitId}/complete
   */
  completeConsultation: async (
    visitId: number,
    payload?: CompleteConsultationPayload
  ): Promise<OpdVisit> => {
    return apiClient<OpdVisit>(`/opd/visit/${visitId}/complete`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    })
  },

  // ─── Vitals ───────────────────────────────────────────────────────────

  /**
   * Get hospital's dynamic vital field configurations.
   * GET /vitals/configs
   * Used to render dynamic vital form fields.
   */
  getVitalConfigs: async (): Promise<VitalConfig[]> => {
    return apiClient<VitalConfig[]>("/vitals/configs")
  },

  /**
   * Get all vitals recorded for a specific OPD visit.
   * GET /vitals/visit/{visitId}
   */
  getVisitVitals: async (visitId: number): Promise<VitalRecord[]> => {
    return apiClient<VitalRecord[]>(`/vitals/visit/${visitId}`)
  },

  /**
   * Record new vitals for a patient visit.
   * POST /vitals/
   */
  recordVitals: async (payload: RecordVitalPayload): Promise<VitalRecord> => {
    return apiClient<VitalRecord>("/vitals/", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // ─── Search ───────────────────────────────────────────────────────────

  /**
   * ICD-10 diagnosis autocomplete search.
   * GET /diagnosis/search?q=fever
   */
  searchDiagnosis: async (query: string): Promise<DiagnosisResult[]> => {
    if (!query || query.trim().length < 2) return []
    return apiClient<DiagnosisResult[]>(`/diagnosis/search?q=${encodeURIComponent(query.trim())}`)
  },

  /**
   * Medicine name autocomplete search.
   * GET /medicines/search?q=para
   */
  searchMedicines: async (query: string): Promise<MedicineResult[]> => {
    if (!query || query.trim().length < 2) return []
    return apiClient<MedicineResult[]>(`/medicines/search?q=${encodeURIComponent(query.trim())}`)
  },

  // ─── Prescriptions ────────────────────────────────────────────────────

  /**
   * Save a structured E-Prescription for a visit.
   * POST /prescriptions/
   * ABDM Compliant: must include ICD-10 diagnosis codes.
   */
  savePrescription: async (payload: SavePrescriptionPayload): Promise<SavedPrescription> => {
    return apiClient<SavedPrescription>("/prescriptions/", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Load existing prescription for a visit (if already saved).
   * GET /prescriptions/visit/{visitId}
   */
  getVisitPrescription: async (visitId: number): Promise<SavedPrescription | null> => {
    return apiClient<SavedPrescription>(`/prescriptions/visit/${visitId}`)
  },
}
