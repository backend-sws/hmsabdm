import { apiClient } from "./apiClient"

export const insuranceService = {
  // ─── 1. Dashboard ──────────────────────────────────────────────────
  async getDashboard(): Promise<any> {
    return apiClient<any>("/insurance/dashboard")
  },

  // ─── 2. Payers Master ──────────────────────────────────────────────
  async getPayers(params?: { payer_type?: string; is_active?: boolean; search?: string }): Promise<any[]> {
    const query = new URLSearchParams()
    if (params) {
      if (params.payer_type) query.set("payer_type", params.payer_type)
      if (params.is_active !== undefined) query.set("is_active", String(params.is_active))
      if (params.search) query.set("search", params.search)
    }
    const qs = query.toString() ? `?${query.toString()}` : ""
    return apiClient<any[]>(`/insurance/payers${qs}`)
  },

  async createPayer(payload: any): Promise<any> {
    return apiClient<any>("/insurance/payers", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async updatePayer(id: number, payload: any): Promise<any> {
    return apiClient<any>(`/insurance/payers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  async deletePayer(id: number): Promise<any> {
    return apiClient<any>(`/insurance/payers/${id}`, {
      method: "DELETE",
    })
  },

  async getPayerTariffs(id: number): Promise<any[]> {
    return apiClient<any[]>(`/insurance/payers/${id}/tariffs`)
  },

  async saveTariffPackage(payerId: number, payload: any): Promise<any> {
    return apiClient<any>(`/insurance/payers/${payerId}/tariffs`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async deleteTariffPackage(payerId: number, tariffId: number): Promise<any> {
    return apiClient<any>(`/insurance/payers/${payerId}/tariffs/${tariffId}`, {
      method: "DELETE",
    })
  },

  // ─── 2b. Patient Policies ──────────────────────────────────────────
  async getPatientPolicies(patientId: number): Promise<any[]> {
    return apiClient<any[]>(`/insurance/patients/${patientId}/policies`)
  },

  async addPatientPolicy(patientId: number, payload: any): Promise<any> {
    return apiClient<any>(`/insurance/patients/${patientId}/policies`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async searchIcd10(query: string, limit = 15): Promise<any[]> {
    if (!query || query.trim().length < 2) return []
    return apiClient<any[]>(`/diagnosis/search?q=${encodeURIComponent(query)}&limit=${limit}`)
  },

  // ─── 3. Pre-Authorization ──────────────────────────────────────────
  async getPreauths(params?: { status?: string; search?: string; page?: number }): Promise<any> {
    const query = new URLSearchParams()
    if (params) {
      if (params.status && params.status !== "all") query.set("status", params.status)
      if (params.search) query.set("search", params.search)
      if (params.page) query.set("page", String(params.page))
    }
    const qs = query.toString() ? `?${query.toString()}` : ""
    return apiClient<any>(`/insurance/preauth${qs}`)
  },

  async createPreauth(payload: any): Promise<any> {
    return apiClient<any>("/insurance/preauth", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async updatePreauthStatus(id: number, payload: { status: string; approved_amount?: number; valid_till?: string; denial_reason?: string; tpa_query?: string }): Promise<any> {
    return apiClient<any>(`/insurance/preauth/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  async respondToQuery(id: number, payload: { response: string; documents?: string[] }): Promise<any> {
    return apiClient<any>(`/insurance/preauth/${id}/respond-query`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async createEnhancement(id: number, payload: any): Promise<any> {
    return apiClient<any>(`/insurance/preauth/${id}/enhancement`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async addPreauthFollowup(id: number, payload: { contact_person?: string; channel?: string; status_discussed?: string; notes: string; next_followup_date?: string }): Promise<any> {
    return apiClient<any>(`/insurance/preauth/${id}/followup`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // ─── 4. Claims ─────────────────────────────────────────────────────
  async getClaims(params?: { status?: string; search?: string; page?: number }): Promise<any> {
    const query = new URLSearchParams()
    if (params) {
      if (params.status && params.status !== "all") query.set("status", params.status)
      if (params.search) query.set("search", params.search)
      if (params.page) query.set("page", String(params.page))
    }
    const qs = query.toString() ? `?${query.toString()}` : ""
    return apiClient<any>(`/insurance/claims${qs}`)
  },

  async createClaim(payload: any): Promise<any> {
    return apiClient<any>("/insurance/claims", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async updateClaimStatus(id: number, payload: any): Promise<any> {
    return apiClient<any>(`/insurance/claims/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  async settleClaim(id: number, payload: { settled_amount: number; settlement_utr?: string; notes?: string }): Promise<any> {
    return apiClient<any>(`/insurance/claims/${id}/settle`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async resubmitClaim(id: number, payload?: any): Promise<any> {
    return apiClient<any>(`/insurance/claims/${id}/resubmit`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    })
  },

  async raiseGrievance(id: number, notes: string): Promise<any> {
    return apiClient<any>(`/insurance/claims/${id}/grievance`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    })
  },

  async getClaimDossier(id: number): Promise<any> {
    return apiClient<any>(`/insurance/claims/${id}/dossier`)
  },

  async addClaimFollowup(id: number, payload: { contact_person?: string; channel?: string; status_discussed?: string; notes: string; next_followup_date?: string }): Promise<any> {
    return apiClient<any>(`/insurance/claims/${id}/followup`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // ─── 5. IRDAI Non-Payables ─────────────────────────────────────────
  async getNonPayables(payerId?: number): Promise<any[]> {
    const qs = payerId ? `?payer_id=${payerId}` : ""
    return apiClient<any[]>(`/insurance/non-payables${qs}`)
  },

  async saveNonPayable(payload: any): Promise<any> {
    return apiClient<any>("/insurance/non-payables", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async deleteNonPayable(id: number): Promise<any> {
    return apiClient<any>(`/insurance/non-payables/${id}`, {
      method: "DELETE",
    })
  },

  async detectNonPayables(admissionId: number, payerId?: number): Promise<any> {
    const qs = payerId ? `?payer_id=${payerId}` : ""
    return apiClient<any>(`/insurance/detect-non-payables/${admissionId}${qs}`)
  },

  // ─── 6. AR Aging Ledger ────────────────────────────────────────────
  async getArLedger(params?: { aging_bucket?: string; search?: string }): Promise<any> {
    const query = new URLSearchParams()
    if (params) {
      if (params.aging_bucket && params.aging_bucket !== "all") query.set("aging_bucket", params.aging_bucket)
      if (params.search) query.set("search", params.search)
    }
    const qs = query.toString() ? `?${query.toString()}` : ""
    return apiClient<any>(`/insurance/ar-ledger${qs}`)
  },

  async getArSummary(): Promise<any> {
    return apiClient<any>("/insurance/ar-summary")
  },

  // ─── 7. Implants ───────────────────────────────────────────────────
  async getImplants(params?: { search?: string }): Promise<any[]> {
    const qs = params?.search ? `?search=${encodeURIComponent(params.search)}` : ""
    return apiClient<any[]>(`/insurance/implants${qs}`)
  },

  async createImplant(payload: any): Promise<any> {
    return apiClient<any>("/insurance/implants", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async updateImplant(id: number, payload: any): Promise<any> {
    return apiClient<any>(`/insurance/implants/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },
}
