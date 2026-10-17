import { apiClient } from "./apiClient"
import type {
  BloodBankDashboardData,
  BloodDonor,
  BloodUnit,
  BloodTtiTest,
  BloodRequisition,
  BloodCrossmatch,
  BloodTransfusionReaction,
  BloodCamp,
  IssueBloodResponse,
  ScreeningConfigData,
} from "@/types/bloodBank"

export const bloodBankService = {
  // 1. Dashboard
  async getDashboard(): Promise<BloodBankDashboardData> {
    return apiClient<BloodBankDashboardData>("/blood-bank/dashboard")
  },

  // 2. Donors
  async getDonors(params?: {
    search?: string
    blood_group?: string
    donor_type?: string
    deferral_status?: string
    page?: number
    per_page?: number
  }): Promise<{ data: BloodDonor[]; meta: any }> {
    const query = new URLSearchParams()
    if (params?.search) query.set("search", params.search)
    if (params?.blood_group && params.blood_group !== "all") query.set("blood_group", params.blood_group)
    if (params?.donor_type && params.donor_type !== "all") query.set("donor_type", params.donor_type)
    if (params?.deferral_status && params.deferral_status !== "all") query.set("deferral_status", params.deferral_status)
    if (params?.page) query.set("page", String(params.page))
    if (params?.per_page) query.set("per_page", String(params.per_page))
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<{ data: BloodDonor[]; meta: any }>(`/blood-bank/donors${queryString}`)
  },

  async registerDonor(payload: Partial<BloodDonor>): Promise<BloodDonor> {
    return apiClient<BloodDonor>("/blood-bank/donors", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async screenDonor(donorId: number, payload: any): Promise<any> {
    return apiClient<any>(`/blood-bank/donors/${donorId}/screen`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // 3. Units Inventory
  async getBloodUnits(params?: {
    search?: string
    blood_group?: string
    component_type?: string
    status?: string
    tti_status?: string
    page?: number
    per_page?: number
  }): Promise<{ data: BloodUnit[]; meta: any }> {
    const query = new URLSearchParams()
    if (params?.search) query.set("search", params.search)
    if (params?.blood_group && params.blood_group !== "all") query.set("blood_group", params.blood_group)
    if (params?.component_type && params.component_type !== "all") query.set("component_type", params.component_type)
    if (params?.status && params.status !== "all") query.set("status", params.status)
    if (params?.tti_status && params.tti_status !== "all") query.set("tti_status", params.tti_status)
    if (params?.page) query.set("page", String(params.page))
    if (params?.per_page) query.set("per_page", String(params.per_page))
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<{ data: BloodUnit[]; meta: any }>(`/blood-bank/units${queryString}`)
  },

  async recordTtiTest(unitId: number, payload: any): Promise<BloodTtiTest> {
    return apiClient<BloodTtiTest>(`/blood-bank/units/${unitId}/tti-test`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async separateComponents(unitId: number, payload: any): Promise<any> {
    return apiClient<any>(`/blood-bank/units/${unitId}/separate`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // 4. Requisitions & Crossmatch
  async createRequisition(payload: Partial<BloodRequisition>): Promise<BloodRequisition> {
    return apiClient<BloodRequisition>("/blood-bank/requisitions", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async getRequisitions(params?: {
    search?: string
    status?: string
    urgency?: string
    page?: number
    per_page?: number
  }): Promise<{ data: BloodRequisition[]; meta: any }> {
    const query = new URLSearchParams()
    if (params?.search) query.set("search", params.search)
    if (params?.status && params.status !== "all") query.set("status", params.status)
    if (params?.urgency && params.urgency !== "all") query.set("urgency", params.urgency)
    if (params?.page) query.set("page", String(params.page))
    if (params?.per_page) query.set("per_page", String(params.per_page))
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<{ data: BloodRequisition[]; meta: any }>(`/blood-bank/requisitions${queryString}`)
  },

  async performCrossmatch(requisitionId: number, payload: any): Promise<BloodCrossmatch> {
    return apiClient<BloodCrossmatch>(`/blood-bank/requisitions/${requisitionId}/crossmatch`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async issueBlood(crossmatchId: number, payload: { issued_to_staff_name: string; cold_box_temperature?: number }): Promise<IssueBloodResponse> {
    return apiClient<IssueBloodResponse>(`/blood-bank/crossmatches/${crossmatchId}/issue`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // 5. Hemovigilance
  async recordReaction(payload: Partial<BloodTransfusionReaction>): Promise<BloodTransfusionReaction> {
    return apiClient<BloodTransfusionReaction>("/blood-bank/reactions", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // 6. Camps
  async getCamps(params?: { search?: string; status?: string; page?: number; per_page?: number }): Promise<{ data: BloodCamp[]; meta: any }> {
    const query = new URLSearchParams()
    if (params?.search) query.set("search", params.search)
    if (params?.status && params.status !== "all") query.set("status", params.status)
    if (params?.page) query.set("page", String(params.page))
    if (params?.per_page) query.set("per_page", String(params.per_page))
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<{ data: BloodCamp[]; meta: any }>(`/blood-bank/camps${queryString}`)
  },

  async createCamp(payload: Partial<BloodCamp>): Promise<BloodCamp> {
    return apiClient<BloodCamp>("/blood-bank/camps", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // 7. Configurable Screening Protocol & Questions
  async getScreeningConfig(): Promise<ScreeningConfigData> {
    return apiClient<ScreeningConfigData>("/blood-bank/screening-config")
  },

  async updateScreeningConfig(payload: Partial<ScreeningConfigData>): Promise<ScreeningConfigData> {
    return apiClient<ScreeningConfigData>("/blood-bank/screening-config", {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  async resetScreeningConfig(): Promise<ScreeningConfigData> {
    return apiClient<ScreeningConfigData>("/blood-bank/screening-config/reset", {
      method: "POST",
    })
  },
}
