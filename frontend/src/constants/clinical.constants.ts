/**
 * Centralized Clinical & Prescription Constants
 * Single source of truth across OPD, IPD, and Emergency modules.
 */

export const FREQUENCY_OPTIONS = [
  "OD",   // Once daily
  "BD",   // Twice daily
  "TID",  // Three times daily
  "QID",  // Four times daily
  "SOS",  // As needed
  "Stat", // Immediately
  "QHS",  // At bedtime
  "QAM",  // Every morning
] as const

export type PrescriptionFrequency = (typeof FREQUENCY_OPTIONS)[number]

export const ROUTE_OPTIONS = [
  "Oral",
  "IV",
  "IM",
  "SC",
  "Topical",
  "Inhaled",
  "Nasal",
  "Sublingual",
  "Eye Drops",
  "Ear Drops",
] as const

export type AdministrationRoute = (typeof ROUTE_OPTIONS)[number]

export const DURATION_UNITS = ["Days", "Weeks", "Months"] as const

export interface DetectedFormInfo {
  type: string
  defaultDosage: string
  defaultRoute: string
  suggestedDosages: string[]
  defaultInstructions?: string
}

/**
 * Intelligent medicine form and dosage detector
 */
export function detectMedicineFormAndDosage(
  medicineName: string = "",
  dosageForm: string = ""
): DetectedFormInfo {
  const combined = `${dosageForm} ${medicineName}`.toLowerCase()

  // 1. Inhalers, Respules, MDI, DPI, Sprays
  if (/inhaler|inhal|rotahaler|respule|rotacap|mdi|dpi|evohaler|aerocort|asthalin|budecort|foracort|seroflo|beclate/i.test(combined)) {
    return {
      type: "Inhaler / Respule",
      defaultDosage: "1 puff",
      defaultRoute: "Inhaled",
      suggestedDosages: ["1 puff", "2 puffs", "1 respule", "1 rotacap", "1 spray", "2 sprays"],
      defaultInstructions: "Rinse mouth with water after use",
    }
  }

  // 2. Eye Drops
  if (/eye\s*drop|ophthalmic/i.test(combined)) {
    return {
      type: "Eye Drops",
      defaultDosage: "1 drop",
      defaultRoute: "Eye Drops",
      suggestedDosages: ["1 drop", "2 drops", "3 drops"],
      defaultInstructions: "Instill into affected eye(s)",
    }
  }

  // 3. Ear Drops
  if (/ear\s*drop|otic/i.test(combined)) {
    return {
      type: "Ear Drops",
      defaultDosage: "2 drops",
      defaultRoute: "Ear Drops",
      suggestedDosages: ["1 drop", "2 drops", "3 drops", "4 drops"],
      defaultInstructions: "Instill into affected ear(s)",
    }
  }

  // 4. Syrups, Suspensions, Solutions, Liquids
  if (/syrup|syp|suspension|susp|liquid|elixir|solution/i.test(combined)) {
    return {
      type: "Syrup / Suspension",
      defaultDosage: "5 ml",
      defaultRoute: "Oral",
      suggestedDosages: ["2.5 ml", "5 ml", "7.5 ml", "10 ml", "15 ml", "1 tsp", "2 tsp"],
      defaultInstructions: "Shake well before use",
    }
  }

  // 5. Injections
  if (/inj|injection|vial|ampoule|amp/i.test(combined)) {
    return {
      type: "Injection",
      defaultDosage: "1 vial",
      defaultRoute: "IV",
      suggestedDosages: ["1 vial", "1 ampoule", "2 ml", "5 ml", "1 dose"],
      defaultInstructions: "Administer under medical supervision",
    }
  }

  // 6. Ointments, Creams, Gels, Lotions
  if (/ointment|cream|gel|lotion|liniment/i.test(combined)) {
    return {
      type: "Ointment / Topical",
      defaultDosage: "Apply thin layer",
      defaultRoute: "Topical",
      suggestedDosages: ["Apply thin layer", "Apply pea-sized amount", "Apply liberally"],
      defaultInstructions: "For external use only",
    }
  }

  // Default: Tablet / Capsule
  return {
    type: "Tablet / Capsule",
    defaultDosage: "1 tab",
    defaultRoute: "Oral",
    suggestedDosages: ["1 tab", "1 cap", "1/2 tab", "2 tabs"],
    defaultInstructions: "After meals with water",
  }
}

export const GLOBAL_DOSAGE_OPTIONS: string[] = [
  // Tablets & Capsules
  "1 tab",
  "1/2 tab",
  "2 tabs",
  "1 cap",
  "2 caps",
  // Syrups & Suspensions (ml)
  "2.5 ml",
  "5 ml",
  "7.5 ml",
  "10 ml",
  "15 ml",
  "1 tsp (5ml)",
  // Inhalers & Sprays
  "1 puff",
  "2 puffs",
  "1 spray",
  "2 sprays",
  "1 respule",
  // Injections & Drops
  "1 amp",
  "1 vial",
  "1 drop",
  "2 drops",
  "3 drops",
  "5 drops",
  // Topicals & Others
  "Apply thin layer",
  "Apply locally",
  "1 sachet",
]

export const COMMON_ICD_PRESETS: Array<{ code: string; name: string }> = [
  { code: "J06.9", name: "Acute upper respiratory infection, unspecified" },
  { code: "A09.9", name: "Gastroenteritis and colitis of unspecified origin" },
  { code: "I10", name: "Essential (primary) hypertension" },
  { code: "E11.9", name: "Type 2 diabetes mellitus without complications" },
  { code: "B34.9", name: "Viral infection, unspecified" },
  { code: "N39.0", name: "Urinary tract infection, site not specified" },
  { code: "K21.9", name: "Gastro-esophageal reflux disease (GERD)" },
  { code: "R50.9", name: "Fever, unspecified" },
]

export const COMMON_INVESTIGATION_PRESETS: Array<{ name: string; category: string; code?: string }> = [
  { name: "Complete Blood Count (CBC) with ESR", category: "Pathology", code: "LAB-CBC" },
  { name: "Liver Function Test (LFT Panel)", category: "Pathology", code: "LAB-LFT" },
  { name: "Kidney Function Test (KFT / RFT)", category: "Pathology", code: "LAB-KFT" },
  { name: "Fasting Blood Sugar (FBS)", category: "Pathology", code: "LAB-BSF" },
  { name: "Glycated Hemoglobin (HbA1c)", category: "Pathology", code: "LAB-HBA1C" },
  { name: "Lipid Profile (Cholesterol, TG, HDL, LDL)", category: "Pathology", code: "LAB-LIPID" },
  { name: "Thyroid Stimulating Hormone (TSH)", category: "Pathology", code: "LAB-TSH" },
  { name: "Urine Routine & Microscopic (R/M)", category: "Pathology", code: "LAB-URINE-RE" },
  { name: "Chest X-Ray (PA View)", category: "Radiology", code: "RAD-XRAY-CHEST-PA" },
  { name: "USG Whole Abdomen & Pelvis", category: "Radiology", code: "RAD-USG-ABD-PELVIS" },
  { name: "12-Lead Electrocardiogram (ECG)", category: "Cardiology", code: "CARD-ECG-12" },
]

export const COMMON_CHIEF_COMPLAINTS = [
  "Fever with chills",
  "Productive Cough",
  "Sore Throat",
  "Headache",
  "Chest Discomfort",
  "Shortness of Breath",
  "Abdominal Pain",
  "Nausea / Vomiting",
  "Loose Stools",
  "Generalized Weakness",
  "Joint Pain / Swelling",
  "Skin Rash",
]

