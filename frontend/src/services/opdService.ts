import { apiClient } from "./apiClient"
import type {
  OpdVisit,
  VitalConfig,
  VitalRecord,
  RecordVitalPayload,
  DiagnosisResult,
  MedicineResult,
  InvestigationResult,
  SavePrescriptionPayload,
  SavedPrescription,
  CompleteConsultationPayload,
} from "@/types/opd"

export const opdService = {
  // ─── OPD Queue ────────────────────────────────────────────────────────

  /**
   * Fetch today's OPD queue for the logged-in doctor/hospital with optional filters.
   * GET /opd/queue
   */
  getQueue: async (params?: {
    doctorId?: number
    departmentId?: number
    status?: string
    search?: string
    all?: boolean
    date?: string
    startDate?: string
    endDate?: string
    allDates?: boolean
  }): Promise<OpdVisit[]> => {
    const query = new URLSearchParams()
    if (params?.doctorId) query.append("doctor_id", String(params.doctorId))
    if (params?.departmentId) query.append("department_id", String(params.departmentId))
    if (params?.status) query.append("status", params.status)
    if (params?.search) query.append("search", params.search)
    if (params?.all) query.append("all", "true")
    if (params?.date) query.append("date", params.date)
    if (params?.startDate) query.append("start_date", params.startDate)
    if (params?.endDate) query.append("end_date", params.endDate)
    if (params?.allDates) query.append("all_dates", "true")
    const qs = query.toString() ? `?${query.toString()}` : ""
    const res = await apiClient<any>(`/opd/queue${qs}`)
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    return []
  },

  /**
   * Mark a patient as "called in" (status: WAITING → IN_CONSULTATION).
   * POST /opd/visit/{visitId}/call
   */
  callPatient: async (visitId: number, doctorId?: number): Promise<OpdVisit> => {
    return apiClient<OpdVisit>(`/opd/visit/${visitId}/call`, {
      method: "POST",
      body: doctorId ? JSON.stringify({ doctor_id: doctorId }) : undefined,
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
   * POST /vitals
   */
  recordVitals: async (payload: RecordVitalPayload | any): Promise<VitalRecord | any> => {
    return apiClient<any>("/vitals", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Update existing vitals record.
   * PUT /vitals/{id}
   */
  updateVital: async (id: number, payload: any): Promise<VitalRecord | any> => {
    return apiClient<any>(`/vitals/${id}`, {
      method: "PUT",
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

  /**
   * Diagnostic investigation (Lab, Radiology, Cardiology) autocomplete search.
   * GET /investigations/search?q=cbc&category=Pathology
   */
  searchInvestigations: async (query: string, category?: string): Promise<InvestigationResult[]> => {
    const params = new URLSearchParams()
    if (query && query.trim()) params.append("q", query.trim())
    if (category && category !== "All") params.append("category", category)
    const qs = params.toString() ? `?${params.toString()}` : ""
    return apiClient<InvestigationResult[]>(`/investigations/search${qs}`)
  },

  // ─── Prescriptions ────────────────────────────────────────────────────

  /**
   * Save a structured E-Prescription for a visit.
   * POST /prescriptions/
   * ABDM Compliant: must include ICD-10 diagnosis codes.
   */
  savePrescription: async (payload: SavePrescriptionPayload): Promise<SavedPrescription> => {
    // Ensure chief_complaints is strictly an array of strings
    let complaintsArray: string[] = []
    if (Array.isArray(payload.chief_complaints)) {
      complaintsArray = payload.chief_complaints.map((c) => String(c).trim()).filter(Boolean)
    } else if (typeof (payload as any).chief_complaints === "string") {
      complaintsArray = ((payload as any).chief_complaints as string)
        .split(/[\r\n,;]+/)
        .map((c) => c.trim())
        .filter(Boolean)
    }

    // Format items if medicines provided
    const items = payload.items || (payload.medicines && Array.isArray(payload.medicines)
      ? payload.medicines.map((m) => ({
          medicine_name: m.medicine_name,
          dosage: m.dosage,
          dosage_form: (m as any).dosage_form || "Tablet",
          frequency: m.frequency,
          duration_days: parseInt(m.duration) || 5,
          timing: m.instructions || "After food",
          instructions: m.instructions,
        }))
      : undefined)

    // Format diagnoses if diagnosis_codes provided
    const diagnoses = payload.diagnoses || (payload.diagnosis_codes && Array.isArray(payload.diagnosis_codes)
      ? payload.diagnosis_codes.map((d: any) => ({
          icd_code: d.code || d.icd_code,
          diagnosis_name: d.name || d.diagnosis_name || d.code || "Diagnosis",
          diagnosis_type: d.type || "provisional",
        }))
      : undefined)

    const normalizedBody = {
      ...payload,
      opd_visit_id: payload.opd_visit_id || payload.visit_id,
      chief_complaints: complaintsArray,
      ...(items ? { items } : {}),
      ...(diagnoses ? { diagnoses } : {}),
    }

    return apiClient<SavedPrescription>("/prescriptions/", {
      method: "POST",
      body: JSON.stringify(normalizedBody),
    })
  },

  /**
   * Load existing prescription for a visit (if already saved).
   * GET /prescriptions/visit/{visitId}
   */
  getVisitPrescription: async (visitId: number): Promise<SavedPrescription | null> => {
    return apiClient<SavedPrescription>(`/prescriptions/visit/${visitId}`)
  },

  /**
   * Update existing prescription (Draft or Signed).
   * PUT /prescriptions/{id}
   */
  updatePrescription: async (id: number, payload: SavePrescriptionPayload): Promise<SavedPrescription> => {
    let complaintsArray: string[] = []
    if (Array.isArray(payload.chief_complaints)) {
      complaintsArray = payload.chief_complaints.map((c) => String(c).trim()).filter(Boolean)
    } else if (typeof (payload as any).chief_complaints === "string") {
      complaintsArray = ((payload as any).chief_complaints as string)
        .split(/[\r\n,;]+/)
        .map((c) => c.trim())
        .filter(Boolean)
    }

    const items = payload.items || (payload.medicines && Array.isArray(payload.medicines)
      ? payload.medicines.map((m) => ({
          medicine_name: m.medicine_name,
          dosage: m.dosage,
          dosage_form: (m as any).dosage_form || "Tablet",
          frequency: m.frequency,
          duration_days: parseInt(m.duration) || 5,
          timing: m.instructions || "After food",
          instructions: m.instructions,
        }))
      : undefined)

    const diagnoses = payload.diagnoses || (payload.diagnosis_codes && Array.isArray(payload.diagnosis_codes)
      ? payload.diagnosis_codes.map((d: any) => ({
          icd_code: d.code || d.icd_code,
          diagnosis_name: d.name || d.diagnosis_name || d.code || "Diagnosis",
          diagnosis_type: d.type || "provisional",
        }))
      : undefined)

    const normalizedBody = {
      ...payload,
      opd_visit_id: payload.opd_visit_id || payload.visit_id,
      chief_complaints: complaintsArray,
      ...(items ? { items } : {}),
      ...(diagnoses ? { diagnoses } : {}),
    }

    return apiClient<SavedPrescription>(`/prescriptions/${id}`, {
      method: "PUT",
      body: JSON.stringify(normalizedBody),
    })
  },
}
