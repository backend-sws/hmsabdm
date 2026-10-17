export const queryKeys = {
  hospitals: {
    all: ["hospitals"] as const,
    list: (filter?: Record<string, any>) => ["hospitals", "list", filter || {}] as const,
    detail: (id: string | number) => ["hospitals", "detail", id] as const,
  },
  departments: {
    all: ["departments"] as const,
    list: (filter?: Record<string, any>) => ["departments", "list", filter || {}] as const,
  },
  doctors: {
    all: ["doctors"] as const,
    list: (filter?: Record<string, any>) => ["doctors", "list", filter || {}] as const,
  },
  patients: {
    all: ["patients"] as const,
    list: (filter?: Record<string, any>) => ["patients", "list", filter || {}] as const,
    detail: (id: string | number) => ["patients", "detail", id] as const,
  },
  reception: {
    queue: ["reception", "queue"] as const,
    departments: ["reception", "departments"] as const,
    visits: (filter?: Record<string, any>) => ["reception", "visits", filter || {}] as const,
    visitStats: (date?: string) => ["reception", "visitStats", date || "today"] as const,
  },
  opd: {
    queue: ["opd", "queue"] as const,
    vitalConfigs: ["vitals", "configs"] as const,
    visitVitals: (visitId: number) => ["vitals", "visit", visitId] as const,
    visitPrescription: (visitId: number) => ["prescriptions", "visit", visitId] as const,
  },
  abha: {
    profile: (token: string) => ["abha", "profile", token] as const,
    suggestedAddresses: (txnId: string, token: string) => ["abha", "suggestedAddresses", txnId, token] as const,
    search: (mobile: string) => ["abha", "search", mobile] as const,
  },
  ipd: {
    all: ["ipd"] as const,
    wards: ["ipd", "wards"] as const,
    availableBeds: (wardId?: number) => ["ipd", "beds", "available", wardId ?? "all"] as const,
    bedMatrix: ["ipd", "bed-matrix"] as const,
    admissions: (filter?: Record<string, any>) => ["ipd", "admissions", filter || {}] as const,
    admission: (id: number) => ["ipd", "admission", id] as const,
    chart: (id: number) => ["ipd", "chart", id] as const,
    rounds: (id: number) => ["ipd", "rounds", id] as const,
    procedures: (id: number) => ["ipd", "procedures", id] as const,
    intakeOutput: (id: number, date?: string) => ["ipd", "intake-output", id, date || "all"] as const,
    mar: (id: number, date?: string) => ["ipd", "mar", id, date || "all"] as const,
    shiftHandovers: (id: number) => ["ipd", "shift-handovers", id] as const,
    dischargeEstimate: (id: number) => ["ipd", "discharge-estimate", id] as const,
    gatePass: (id: number) => ["ipd", "gate-pass", id] as const,
  },
  emergency: {
    all: ["emergency"] as const,
    triages: (filter?: Record<string, any>) => ["emergency", "triages", filter || {}] as const,
    triage: (id: number) => ["emergency", "triage", id] as const,
    mlcSlip: (id: number) => ["emergency", "mlcSlip", id] as const,
  },
  billing: {
    all: ["billing"] as const,
    categories: ["billing", "categories"] as const,
    charges: (filter?: Record<string, any>) => ["billing", "charges", filter || {}] as const,
    bedConfig: ["billing", "bedConfig"] as const,
    patientLedger: (patientId: number, filter?: Record<string, any>) =>
      ["billing", "patientLedger", patientId, filter || {}] as const,
    invoice: (id: number) => ["billing", "invoice", id] as const,
    patientInvoices: (patientId: number) => ["billing", "patientInvoices", patientId] as const,
    invoices: (filter?: Record<string, any>) => ["billing", "invoices", filter || {}] as const,
    dayEndSummary: (date?: string) => ["billing", "dayEndSummary", date || "today"] as const,
    pendingDischarges: (filter?: Record<string, any>) => ["billing", "pendingDischarges", filter || {}] as const,
  },

  settings: {
    hospital: (id: number) => ["settings", "hospital", id] as const,
    numbering: ["settings", "numbering"] as const,
    general: (group?: string) => ["settings", "general", group || "all"] as const,
    vitals: ["settings", "vitals"] as const,
    patientFields: ["settings", "patientFields"] as const,
  },

  bloodBank: {
    all: ["bloodBank"] as const,
    dashboard: ["bloodBank", "dashboard"] as const,
    donors: (filter?: Record<string, any>) => ["bloodBank", "donors", filter || {}] as const,
    units: (filter?: Record<string, any>) => ["bloodBank", "units", filter || {}] as const,
    requisitions: (filter?: Record<string, any>) => ["bloodBank", "requisitions", filter || {}] as const,
    camps: (filter?: Record<string, any>) => ["bloodBank", "camps", filter || {}] as const,
    screeningConfig: ["bloodBank", "screeningConfig"] as const,
  },
}

export const bloodBankKeys = queryKeys.bloodBank

