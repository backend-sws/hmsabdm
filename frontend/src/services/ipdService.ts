import { apiClient } from "./apiClient"
import type {
  IpdWard,
  IpdBed,
  BedMatrixResponse,
  IpdAdmission,
  AdmitPatientPayload,
  TransferBedPayload,
  DischargePayload,
  DoctorRoundPayload,
  DoctorRoundItem,
  NursingProcedurePayload,
  NursingProcedureItem,
  IntakeOutputPayload,
  FluidBalanceSummary,
  MarRecordPayload,
  ShiftHandoverPayload,
  ShiftHandoverItem,
  DischargeEstimate,
  SettleDischargePayload,
  GatePass,
  InpatientChart,
  CreateWardPayload,
  UpdateWardPayload,
  CreateBedPayload,
  BatchCreateBedsPayload,
  UpdateBedPayload,
} from "@/types/ipd"

export const ipdService = {
  /**
   * Get all active wards and bed occupancy statistics
   */
  getWards: async (search?: string): Promise<IpdWard[]> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : ""
    const res = await apiClient<any>(`/ipd/wards${params}`)
    return Array.isArray(res) ? res : res?.data || []
  },

  /**
   * Get all vacant beds, optionally filtered by ward
   */
  getAvailableBeds: async (wardId?: number): Promise<IpdBed[]> => {
    const params = wardId ? `?ward_id=${wardId}` : ""
    const res = await apiClient<any>(`/ipd/beds/available${params}`)
    return Array.isArray(res) ? res : res?.data || []
  },

  /**
   * Get live 2D visual bed matrix for all wards with occupancy stats
   */
  getBedMatrix: async (): Promise<BedMatrixResponse> => {
    return apiClient<BedMatrixResponse>("/ipd/bed-matrix")
  },

  /**
   * Admit patient into IPD and generate admission slip (IPD Parcha)
   */
  admitPatient: async (payload: AdmitPatientPayload): Promise<IpdAdmission> => {
    return apiClient<IpdAdmission>("/ipd/admit", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get list of active/discharged inpatient admissions
   */
  getAdmissions: async (filter?: Record<string, any>): Promise<IpdAdmission[]> => {
    const params = new URLSearchParams()
    if (filter) {
      Object.entries(filter).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          params.append(key, String(val))
        }
      })
    }
    const qs = params.toString() ? `?${params.toString()}` : ""
    const res = await apiClient<any>(`/ipd/admissions${qs}`)
    return Array.isArray(res) ? res : res?.data || []
  },

  /**
   * Get single IPD admission details
   */
  getAdmission: async (id: number): Promise<IpdAdmission> => {
    return apiClient<IpdAdmission>(`/ipd/admissions/${id}`)
  },

  /**
   * Transfer inpatient to a different ward or bed
   */
  transferBed: async (id: number, payload: TransferBedPayload): Promise<IpdAdmission> => {
    return apiClient<IpdAdmission>(`/ipd/admissions/${id}/transfer-bed`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Discharge patient and release bed
   */
  dischargePatient: async (id: number, payload?: DischargePayload): Promise<IpdAdmission> => {
    return apiClient<IpdAdmission>(`/ipd/admissions/${id}/discharge`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    })
  },

  /**
   * Get complete 360-degree Inpatient Medical & Financial Chart
   */
  getInpatientChart: async (id: number): Promise<InpatientChart> => {
    return apiClient<InpatientChart>(`/ipd/admissions/${id}/chart`)
  },

  /**
   * Record doctor daily bedside round (SOAP notes)
   */
  recordDoctorRound: async (id: number, payload: DoctorRoundPayload): Promise<DoctorRoundItem> => {
    return apiClient<DoctorRoundItem>(`/ipd/admissions/${id}/rounds`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get doctor rounds history
   */
  getDoctorRounds: async (id: number): Promise<DoctorRoundItem[]> => {
    return apiClient<DoctorRoundItem[]>(`/ipd/admissions/${id}/rounds`)
  },

  /**
   * Record bedside nursing procedure (e.g. Catheter, Dressing, IV)
   */
  recordNursingProcedure: async (
    id: number,
    payload: NursingProcedurePayload
  ): Promise<NursingProcedureItem> => {
    return apiClient<NursingProcedureItem>(`/ipd/admissions/${id}/procedures`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get bedside nursing procedures history
   */
  getNursingProcedures: async (id: number): Promise<NursingProcedureItem[]> => {
    return apiClient<NursingProcedureItem[]>(`/ipd/admissions/${id}/procedures`)
  },

  /**
   * Record Fluid Intake or Output entry (ml)
   */
  recordIntakeOutput: async (
    id: number,
    payload: IntakeOutputPayload
  ): Promise<any> => {
    return apiClient<any>(`/ipd/admissions/${id}/intake-output`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get Fluid Balance Summary & Chronological Logs
   */
  getIntakeOutput: async (id: number, date?: string): Promise<FluidBalanceSummary> => {
    const params = date ? `?date=${date}` : ""
    return apiClient<FluidBalanceSummary>(`/ipd/admissions/${id}/intake-output${params}`)
  },

  /**
   * Record Medication Administration Record (MAR / Drug Chart)
   */
  recordMar: async (id: number, payload: MarRecordPayload): Promise<any> => {
    return apiClient<any>(`/ipd/admissions/${id}/mar`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get MAR Drug Chart for patient
   */
  getMar: async (id: number, date?: string): Promise<any> => {
    const params = date ? `?date=${date}` : ""
    return apiClient<any>(`/ipd/admissions/${id}/mar${params}`)
  },

  /**
   * Record Nursing Shift Handover transition note
   */
  recordShiftHandover: async (
    id: number,
    payload: ShiftHandoverPayload
  ): Promise<ShiftHandoverItem> => {
    return apiClient<ShiftHandoverItem>(`/ipd/admissions/${id}/shift-handover`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get Nursing Shift Handovers list
   */
  getShiftHandovers: async (id: number): Promise<ShiftHandoverItem[]> => {
    return apiClient<ShiftHandoverItem[]>(`/ipd/admissions/${id}/shift-handover`)
  },

  /**
   * Acknowledge Shift Handover by incoming nurse
   */
  acknowledgeShiftHandover: async (
    handoverId: number,
    incomingNurseName: string
  ): Promise<ShiftHandoverItem> => {
    return apiClient<ShiftHandoverItem>(`/ipd/shift-handover/${handoverId}/acknowledge`, {
      method: "PUT",
      body: JSON.stringify({ incoming_nurse_name: incomingNurseName }),
    })
  },

  /**
   * Get Pre-Discharge Billing Estimate (unbilled charges + advance deposit)
   */
  getDischargeEstimate: async (id: number): Promise<DischargeEstimate> => {
    return apiClient<DischargeEstimate>(`/ipd/admissions/${id}/discharge-estimate`)
  },

  /**
   * Final bill settlement, generate Tax Invoice, free bed, and discharge
   */
  settleDischarge: async (id: number, payload: SettleDischargePayload): Promise<any> => {
    return apiClient<any>(`/ipd/admissions/${id}/settle-discharge`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get official Security Gate Pass
   */
  getGatePass: async (id: number): Promise<GatePass> => {
    return apiClient<GatePass>(`/ipd/admissions/${id}/gate-pass`)
  },

  /**
   * Get pending OPD doctor admission referrals
   */
  getOpdReferrals: async (): Promise<any[]> => {
    const res = await apiClient<any>("/ipd/opd-referrals")
    return Array.isArray(res) ? res : res?.data || []
  },

  /**
   * Get all hospital wards with bed list and occupancy stats
   */
  getAllWards: async (params?: { search?: string; is_active?: boolean }): Promise<any[]> => {
    const q = new URLSearchParams()
    if (params?.search) q.set("search", params.search)
    if (params?.is_active !== undefined) q.set("is_active", String(params.is_active))
    const res = await apiClient<any>(`/wards?${q.toString()}`)
    return Array.isArray(res) ? res : res?.data || []
  },

  /**
   * Create a new Ward with daily pricing
   */
  createWard: async (payload: CreateWardPayload): Promise<any> => {
    const res = await apiClient<any>("/wards", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return res?.data || res
  },

  /**
   * Update Ward details and room rent / bed pricing
   */
  updateWard: async (id: number, payload: UpdateWardPayload): Promise<any> => {
    const res = await apiClient<any>(`/wards/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    return res?.data || res
  },

  /**
   * Delete Ward and its vacant beds
   */
  deleteWard: async (id: number): Promise<any> => {
    return apiClient<any>(`/wards/${id}`, {
      method: "DELETE",
    })
  },

  /**
   * Get all beds list with optional ward/status filter
   */
  getBeds: async (params?: { ward_id?: number; status?: string; search?: string }): Promise<any[]> => {
    const q = new URLSearchParams()
    if (params?.ward_id) q.set("ward_id", String(params.ward_id))
    if (params?.status) q.set("status", params.status)
    if (params?.search) q.set("search", params.search)
    const res = await apiClient<any>(`/beds?${q.toString()}`)
    return Array.isArray(res) ? res : res?.data || []
  },

  /**
   * Create a single bed
   */
  createBed: async (payload: CreateBedPayload): Promise<any> => {
    const res = await apiClient<any>("/beds", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return res?.data || res
  },

  /**
   * Batch create multiple beds for a ward
   */
  batchCreateBeds: async (payload: BatchCreateBedsPayload): Promise<any> => {
    const res = await apiClient<any>("/beds/batch", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return res?.data || res
  },

  /**
   * Update bed details or pricing override
   */
  updateBed: async (id: number, payload: UpdateBedPayload): Promise<any> => {
    const res = await apiClient<any>(`/beds/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    return res?.data || res
  },

  /**
   * Delete a vacant bed
   */
  deleteBed: async (id: number): Promise<any> => {
    return apiClient<any>(`/beds/${id}`, {
      method: "DELETE",
    })
  },
}
