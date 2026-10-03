import { apiClient } from "./apiClient"
import type {
  HospitalProfile,
  UnifiedNumberingOverview,
  VitalFieldConfig,
  PatientFieldConfig,
} from "@/types/settings"

export const settingsService = {
  // ─── 1. Hospital Master Profile ─────────────────────────────────────
  async getHospital(id: number): Promise<HospitalProfile> {
    return apiClient<HospitalProfile>(`/hospitals/${id}`)
  },

  async updateHospital(id: number, data: Partial<HospitalProfile>): Promise<HospitalProfile> {
    return apiClient<HospitalProfile>(`/hospitals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  // ─── 2. Numbering Sequences ─────────────────────────────────────────
  async getNumberingOverview(): Promise<UnifiedNumberingOverview> {
    return apiClient<UnifiedNumberingOverview>("/hospital/settings/numbering")
  },

  async updateUhidConfig(data: {
    uhid_prefix?: string
    uhid_format: string
    uhid_padding?: number
    uhid_sequence_reset?: string
    uhid_next_sequence?: number
  }): Promise<any> {
    return apiClient<any>("/hospital/settings/uhid", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  async updateOpdConfig(data: {
    opd_prefix?: string
    opd_format: string
    opd_padding?: number
    opd_sequence_reset?: string
    opd_next_sequence?: number
  }): Promise<any> {
    return apiClient<any>("/hospital/settings/opd-number", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  async updateIpdConfig(data: {
    ipd_prefix?: string
    ipd_format: string
    ipd_padding?: number
    ipd_sequence_reset?: string
    ipd_next_sequence?: number
  }): Promise<any> {
    return apiClient<any>("/hospital/settings/ipd-number", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  // ─── 3. Generic Key-Value Settings ──────────────────────────────────
  async getSettings(group?: string): Promise<Record<string, any>> {
    const url = group ? `/hospital/settings?group=${group}` : "/hospital/settings"
    return apiClient<Record<string, any>>(url)
  },

  async saveSettings(group: string, settings: Record<string, any>): Promise<any> {
    return apiClient<any>("/hospital/settings", {
      method: "POST",
      body: JSON.stringify({ group, settings }),
    })
  },

  // ─── 4. Dynamic Vital Configs ───────────────────────────────────────
  async getVitalConfigs(): Promise<VitalFieldConfig[]> {
    return apiClient<VitalFieldConfig[]>("/vitals/configs")
  },

  async createVitalConfig(data: {
    field_key: string
    label: string
    category?: string
    unit?: string
    input_type: "number" | "text" | "select" | "boolean"
    options?: string[]
    min_value?: number
    max_value?: number
    is_required?: boolean
    is_active?: boolean
    sort_order?: number
  }): Promise<VitalFieldConfig> {
    return apiClient<VitalFieldConfig>("/vitals/configs", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async deleteVitalConfig(id: number): Promise<void> {
    return apiClient<void>(`/vitals/configs/${id}`, {
      method: "DELETE",
    })
  },

  // ─── 5. Custom Patient Registration Fields ──────────────────────────
  async getPatientFieldConfigs(): Promise<PatientFieldConfig[]> {
    return apiClient<PatientFieldConfig[]>("/patient-fields/configs")
  },

  async createPatientFieldConfig(data: {
    field_key?: string
    field_name?: string
    label: string
    input_type?: string
    field_type?: string
    category?: string
    placeholder?: string
    options?: string[]
    is_required?: boolean
  }): Promise<PatientFieldConfig> {
    const payload = {
      ...data,
      field_key: data.field_key || data.field_name,
      input_type: data.input_type || data.field_type || "text",
    }
    return apiClient<PatientFieldConfig>("/patient-fields/configs", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async deletePatientFieldConfig(id: number): Promise<void> {
    return apiClient<void>(`/patient-fields/configs/${id}`, {
      method: "DELETE",
    })
  },
}
