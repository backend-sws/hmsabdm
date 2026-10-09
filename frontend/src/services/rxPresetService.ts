import { settingsService } from "./settingsService"
import type { RxPreset } from "@/types/rxPreset"

const STORAGE_KEY = "hms_rx_presets_v1"

// ─── 1. DEFAULT SEED PRESETS ACROSS 3 TIERS ─────────────────────────
export const DEFAULT_RX_PRESETS: RxPreset[] = [
  // ── Hospital Wide Common Defaults ──
  {
    id: "preset_hosp_fever",
    name: "Fever / URTI",
    icon: "🌡️",
    scope: "hospital",
    is_default: true,
    meds: [
      { medicine_name: "Tab. Paracetamol 650mg", dosage: "1 tab", frequency: "TID", duration: "3 days", route: "Oral", instructions: "After food (SOS for fever/bodyache)" },
      { medicine_name: "Tab. Levocetirizine 5mg", dosage: "1 tab", frequency: "OD", duration: "5 days", route: "Oral", instructions: "At bedtime" },
      { medicine_name: "Cap. Pantoprazole 40mg", dosage: "1 cap", frequency: "OD", duration: "5 days", route: "Oral", instructions: "Before breakfast (Empty stomach)" },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "preset_hosp_gastritis",
    name: "Gastritis / GERD",
    icon: "💊",
    scope: "hospital",
    is_default: true,
    meds: [
      { medicine_name: "Cap. Pantoprazole + Domperidone (Pan-D)", dosage: "1 cap", frequency: "OD", duration: "7 days", route: "Oral", instructions: "Empty stomach before breakfast" },
      { medicine_name: "Syp. Antacid Gel", dosage: "10 ml", frequency: "TID", duration: "5 days", route: "Oral", instructions: "After meals" },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "preset_hosp_pain",
    name: "Acute Pain / Sprain",
    icon: "🩹",
    scope: "hospital",
    is_default: true,
    meds: [
      { medicine_name: "Tab. Aceclofenac 100mg + Paracetamol 325mg", dosage: "1 tab", frequency: "BD", duration: "5 days", route: "Oral", instructions: "After meals" },
      { medicine_name: "Cap. Pantoprazole 40mg", dosage: "1 cap", frequency: "OD", duration: "5 days", route: "Oral", instructions: "Before breakfast" },
      { medicine_name: "Gel Diclofenac Topical", dosage: "Apply thin layer", frequency: "TID", duration: "5 days", route: "Topical", instructions: "Gently apply on affected area" },
    ],
    created_at: new Date().toISOString(),
  },

  // ── Department Level Presets ──
  {
    id: "preset_dept_cardio_htn",
    name: "Hypertension Routine",
    icon: "🫀",
    scope: "department",
    department_name: "Cardiology",
    is_default: true,
    meds: [
      { medicine_name: "Tab. Telmisartan 40mg", dosage: "1 tab", frequency: "OD", duration: "30 days", route: "Oral", instructions: "Morning after breakfast" },
      { medicine_name: "Tab. Amlodipine 5mg", dosage: "1 tab", frequency: "OD", duration: "30 days", route: "Oral", instructions: "Morning with Telmisartan" },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "preset_dept_cardio_cad",
    name: "Post-MI / CAD Maintenance",
    icon: "🩺",
    scope: "department",
    department_name: "Cardiology",
    is_default: true,
    meds: [
      { medicine_name: "Tab. Ecosprin 75mg", dosage: "1 tab", frequency: "OD", duration: "30 days", route: "Oral", instructions: "After lunch" },
      { medicine_name: "Tab. Atorvastatin 20mg", dosage: "1 tab", frequency: "OD", duration: "30 days", route: "Oral", instructions: "At bedtime" },
      { medicine_name: "Tab. Metoprolol 25mg ER", dosage: "1 tab", frequency: "OD", duration: "30 days", route: "Oral", instructions: "Morning after food" },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "preset_dept_med_diabetes",
    name: "Type-2 Diabetes Routine",
    icon: "🩸",
    scope: "department",
    department_name: "General Medicine",
    is_default: true,
    meds: [
      { medicine_name: "Tab. Metformin 500mg SR", dosage: "1 tab", frequency: "BD", duration: "30 days", route: "Oral", instructions: "With breakfast & dinner" },
      { medicine_name: "Tab. Glimepiride 1mg", dosage: "1 tab", frequency: "OD", duration: "30 days", route: "Oral", instructions: "15 mins before breakfast" },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "preset_dept_ortho_arthritis",
    name: "Osteoarthritis / Joint Care",
    icon: "🦴",
    scope: "department",
    department_name: "Orthopedics",
    is_default: true,
    meds: [
      { medicine_name: "Tab. Etoricoxib 90mg", dosage: "1 tab", frequency: "OD", duration: "7 days", route: "Oral", instructions: "After lunch" },
      { medicine_name: "Tab. Calcium 500mg + Vitamin D3 250IU", dosage: "1 tab", frequency: "OD", duration: "30 days", route: "Oral", instructions: "After dinner" },
      { medicine_name: "Cap. Pantoprazole 40mg", dosage: "1 cap", frequency: "OD", duration: "7 days", route: "Oral", instructions: "Before breakfast" },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "preset_dept_pedia_fever",
    name: "Pediatric Cold & Fever",
    icon: "👶",
    scope: "department",
    department_name: "Pediatrics",
    is_default: true,
    meds: [
      { medicine_name: "Syp. Paracetamol 250mg / 5ml", dosage: "5 ml", frequency: "TID", duration: "3 days", route: "Oral", instructions: "SOS for temp > 100°F" },
      { medicine_name: "Syp. Levocetirizine 2.5mg / 5ml", dosage: "2.5 ml", frequency: "OD", duration: "5 days", route: "Oral", instructions: "At night before sleeping" },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "preset_dept_pulmo_asthma",
    name: "Bronchospasm / Asthma Inhaler",
    icon: "🫁",
    scope: "department",
    department_name: "Pulmonology",
    is_default: true,
    meds: [
      { medicine_name: "Inhaler Budesonide + Formoterol (Budecort-F 200)", dosage: "1 puff", frequency: "BD", duration: "30 days", route: "Inhalation", instructions: "Rinse mouth after each inhalation" },
      { medicine_name: "Tab. Montelukast 10mg + Levocetirizine 5mg", dosage: "1 tab", frequency: "OD", duration: "10 days", route: "Oral", instructions: "At bedtime" },
    ],
    created_at: new Date().toISOString(),
  },
]

// ─── 2. RX PRESET SERVICE IMPLEMENTATION ────────────────────────────
export const rxPresetService = {
  /**
   * Fetch all presets, merging backend HospitalSettings with local cache or default seeds.
   */
  async getPresets(): Promise<RxPreset[]> {
    try {
      const serverSettings = await settingsService.getSettings("rx_presets")
      if (serverSettings && serverSettings.presets && Array.isArray(serverSettings.presets) && serverSettings.presets.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverSettings.presets))
        return serverSettings.presets
      }
    } catch (err) {
      console.warn("Could not fetch rx_presets from backend, checking local storage:", err)
    }

    // Fallback to localStorage
    const local = localStorage.getItem(STORAGE_KEY)
    if (local) {
      try {
        const parsed = JSON.parse(local)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      } catch (e) {
        console.error("Failed to parse cached presets:", e)
      }
    }

    // Fallback to defaults and seed them
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RX_PRESETS))
    // Try saving defaults to server in background
    settingsService.saveSettings("rx_presets", { presets: DEFAULT_RX_PRESETS }).catch(() => {})
    return DEFAULT_RX_PRESETS
  },

  /**
   * Save (Create or Update) a preset.
   */
  async savePreset(preset: Omit<RxPreset, "id"> & { id?: string }): Promise<RxPreset> {
    const current = await this.getPresets()
    const id = preset.id || `preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()

    const fullPreset: RxPreset = {
      ...preset,
      id,
      created_at: preset.created_at || now,
      updated_at: now,
    }

    const existingIndex = current.findIndex((p) => p.id === id)
    let updated: RxPreset[]
    if (existingIndex >= 0) {
      updated = [...current]
      updated[existingIndex] = fullPreset
    } else {
      updated = [fullPreset, ...current]
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    try {
      await settingsService.saveSettings("rx_presets", { presets: updated })
    } catch (err) {
      console.warn("Failed to persist preset update to server:", err)
    }

    return fullPreset
  },

  /**
   * Delete a preset by ID.
   */
  async deletePreset(id: string): Promise<void> {
    const current = await this.getPresets()
    const updated = current.filter((p) => p.id !== id)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    try {
      await settingsService.saveSettings("rx_presets", { presets: updated })
    } catch (err) {
      console.warn("Failed to delete preset from server:", err)
    }
  },

  /**
   * Reset all presets to default seed data.
   */
  async resetToDefaults(): Promise<RxPreset[]> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RX_PRESETS))
    try {
      await settingsService.saveSettings("rx_presets", { presets: DEFAULT_RX_PRESETS })
    } catch (err) {
      console.warn("Failed to reset presets on server:", err)
    }
    return DEFAULT_RX_PRESETS
  },
}
