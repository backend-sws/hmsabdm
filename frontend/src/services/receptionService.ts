import { apiClient } from "./apiClient"
import type {
  ScanShareQueueItem,
  TokenLookupResponse,
  ConfirmQueuePayload,
  ConfirmQueueResponse,
  WalkInRegisterPayload,
  WalkInRegisterResponse,
  CreateVisitPayload,
  CreateVisitResponse,
  QuickVisitPayload,
  ReceptionDepartment,
  OpdVisitItem,
  VisitStats,
  VisitQueryParams,
} from "@/types/reception"

export const receptionService = {
  // ─── Scan & Share ────────────────────────────────────────────────────

  /**
   * Get live Scan & Share waiting queue.
   * Poll every 15 seconds on the Reception page.
   * GET /reception/scan-and-share/queues
   */
  getQueue: async (): Promise<ScanShareQueueItem[]> => {
    const res = await apiClient<any>("/reception/scan-and-share/queues")
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    return []
  },

  /**
   * Validate a token code entered by reception staff.
   * POST /reception/scan-and-share/token
   */
  lookupToken: async (token_no: string): Promise<TokenLookupResponse> => {
    return apiClient<TokenLookupResponse>("/reception/scan-and-share/token", {
      method: "POST",
      body: JSON.stringify({ token_no }),
    })
  },

  /**
   * Confirm a Scan & Share token → creates OPD visit in DB.
   * POST /reception/scan-and-share/confirm
   */
  confirmToken: async (payload: ConfirmQueuePayload): Promise<ConfirmQueueResponse> => {
    return apiClient<ConfirmQueueResponse>("/reception/scan-and-share/confirm", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // ─── Departments ──────────────────────────────────────────────────────

  /**
   * Get departments list for visit form dropdowns.
   * GET /reception/departments
   */
  getDepartments: async (): Promise<ReceptionDepartment[]> => {
    return apiClient<ReceptionDepartment[]>("/reception/departments")
  },

  // ─── Walk-in Registration ─────────────────────────────────────────────

  /**
   * Register a new walk-in patient (no ABHA required).
   * POST /reception/register
   * Returns the created patient with UHID.
   */
  registerWalkIn: async (payload: WalkInRegisterPayload): Promise<WalkInRegisterResponse> => {
    return apiClient<WalkInRegisterResponse>("/reception/register", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Create an OPD visit for an already-registered patient.
   * POST /reception/visit
   */
  createVisit: async (payload: CreateVisitPayload): Promise<CreateVisitResponse> => {
    return apiClient<CreateVisitResponse>("/reception/visit", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * One-step: register patient + create visit in a single call.
   * POST /reception/quick-visit
   */
  quickVisit: async (payload: QuickVisitPayload): Promise<CreateVisitResponse> => {
    return apiClient<CreateVisitResponse>("/reception/quick-visit", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get issued OPD visits / tokens history.
   * GET /reception/visits
   */
  getVisits: async (params?: VisitQueryParams): Promise<{ data: OpdVisitItem[]; meta?: any }> => {
    const query = new URLSearchParams()
    if (params?.date) query.set("date", params.date)
    if (params?.doctor_id) query.set("doctor_id", String(params.doctor_id))
    if (params?.department_id) query.set("department_id", String(params.department_id))
    if (params?.status) query.set("status", params.status)
    if (params?.search) query.set("search", params.search)
    if (params?.all) query.set("all", "true")
    if (params?.page) query.set("page", String(params.page))
    if (params?.per_page) query.set("per_page", String(params.per_page))

    const url = `/reception/visits${query.toString() ? `?${query.toString()}` : ""}`
    const res = await apiClient<any>(url)

    if (Array.isArray(res)) {
      return { data: res }
    }
    if (Array.isArray(res?.data)) {
      return { data: res.data, meta: res.meta }
    }
    return { data: [] }
  },

  /**
   * Get visit summary statistics for a given date.
   * GET /reception/visits/stats
   */
  getVisitStats: async (date?: string): Promise<VisitStats> => {
    const query = date ? `?date=${encodeURIComponent(date)}` : ""
    const res = await apiClient<any>(`/reception/visits/stats${query}`)
    return res?.data || res
  },
}
