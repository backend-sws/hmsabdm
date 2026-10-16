import { apiClient } from "./apiClient"
import type {
  EmergencyTriage,
  EmergencyCounters,
  TriageAdmissionPayload,
  LinkPatientPayload,
  MlcSlipData,
  TriageStatusUpdatePayload,
  EmergencyQueryParams,
} from "@/types/emergency"

export interface PaginatedTriages {
  counters: EmergencyCounters
  triages: {
    current_page: number
    data: EmergencyTriage[]
    total: number
    per_page: number
    last_page: number
  }
}

export const emergencyService = {
  /**
   * Fast-track 5-second ER Triage Admission.
   */
  async admitTriage(payload: TriageAdmissionPayload): Promise<EmergencyTriage> {
    return apiClient<EmergencyTriage>("/emergency/triage", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Live Emergency & Triage Desk List with Priority Counters.
   */
  async getTriages(params?: EmergencyQueryParams): Promise<PaginatedTriages> {
    const query = new URLSearchParams()
    if (params) {
      if (params.priority_level) query.set("priority_level", params.priority_level)
      if (params.status) query.set("status", params.status)
      if (params.is_mlc !== undefined) query.set("is_mlc", String(params.is_mlc))
      if (params.search) query.set("search", params.search)
      if (params.page) query.set("page", String(params.page))
      if (params.per_page) query.set("per_page", String(params.per_page))
    }
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<PaginatedTriages>(`/emergency/triages${queryString}`)
  },

  /**
   * Get specific Emergency Triage details.
   */
  async getTriage(id: number): Promise<EmergencyTriage> {
    return apiClient<EmergencyTriage>(`/emergency/triages/${id}`)
  },

  /**
   * Post-stabilization KYC / ABHA patient identity linking.
   */
  async linkPatient(id: number, payload: LinkPatientPayload): Promise<EmergencyTriage> {
    return apiClient<EmergencyTriage>(`/emergency/triages/${id}/link-patient`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Generate official Police Intimation Memo (MLC Slip).
   */
  async getMlcSlip(id: number): Promise<MlcSlipData> {
    return apiClient<MlcSlipData>(`/emergency/triages/${id}/mlc-slip`)
  },

  /**
   * Update casualty triage clinical status.
   */
  async updateStatus(id: number, payload: TriageStatusUpdatePayload): Promise<EmergencyTriage> {
    return apiClient<EmergencyTriage>(`/emergency/triages/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },
}
