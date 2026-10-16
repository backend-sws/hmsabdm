import { apiClient } from "./apiClient"
import type {
  OperationTheatre,
  OtSchedule,
  OtChecklistRecord,
  CreateOtSchedulePayload,
  UpdateOtSchedulePayload,
  SaveOtChecklistPayload,
  OtPrintData,
} from "@/types/ot"

export const otService = {
  /**
   * Get all active Operation Theatres and their live status
   */
  getTheatres: async (): Promise<OperationTheatre[]> => {
    const res = await apiClient<any>("/ot/theatres")
    return Array.isArray(res) ? res : res?.data || []
  },

  /**
   * Get list of scheduled surgeries with filters
   */
  getSchedules: async (filters?: {
    date?: string
    theatre_id?: number
    surgeon_id?: number
    patient_id?: number
    ipd_admission_id?: number
    status?: string
  }): Promise<OtSchedule[]> => {
    const q = new URLSearchParams()
    if (filters?.date) q.set("date", filters.date)
    if (filters?.theatre_id) q.set("theatre_id", String(filters.theatre_id))
    if (filters?.surgeon_id) q.set("surgeon_id", String(filters.surgeon_id))
    if (filters?.patient_id) q.set("patient_id", String(filters.patient_id))
    if (filters?.ipd_admission_id) q.set("ipd_admission_id", String(filters.ipd_admission_id))
    if (filters?.status) q.set("status", filters.status)

    const res = await apiClient<any>(`/ot/schedules?${q.toString()}`)
    return Array.isArray(res) ? res : res?.data || []
  },

  /**
   * Get single schedule details
   */
  getSchedule: async (id: number): Promise<OtSchedule> => {
    const res = await apiClient<any>(`/ot/schedules/${id}`)
    return res?.data || res
  },

  /**
   * Book a new surgical schedule
   */
  createSchedule: async (payload: CreateOtSchedulePayload): Promise<OtSchedule> => {
    const res = await apiClient<any>("/ot/schedules", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return res?.data || res
  },

  /**
   * Update surgical schedule details or progress status
   */
  updateSchedule: async (id: number, payload: UpdateOtSchedulePayload): Promise<OtSchedule> => {
    const res = await apiClient<any>(`/ot/schedules/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    return res?.data || res
  },

  /**
   * Get WHO Surgical Safety Checklist
   */
  getChecklist: async (scheduleId: number): Promise<OtChecklistRecord> => {
    const res = await apiClient<any>(`/ot/schedules/${scheduleId}/checklist`)
    return res?.data || res
  },

  /**
   * Save WHO Surgical Safety Checklist (Sign In, Time Out, Sign Out)
   */
  saveChecklist: async (
    scheduleId: number,
    payload: SaveOtChecklistPayload
  ): Promise<OtChecklistRecord> => {
    const res = await apiClient<any>(`/ot/schedules/${scheduleId}/checklist`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return res?.data || res
  },

  /**
   * Get complete printable WHO Surgical Safety Checklist Dossier
   */
  getPrintData: async (scheduleId: number): Promise<OtPrintData> => {
    const res = await apiClient<any>(`/ot/schedules/${scheduleId}/print`)
    return res?.data || res
  },
}
