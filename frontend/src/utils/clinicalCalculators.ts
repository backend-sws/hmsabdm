/**
 * Clinical Medical Calculators for OPD Triage & Workstation
 * Standard clinical formulas: MAP, BSA (Mosteller), BMI, and eGFR (CKD-EPI / MDRD)
 */

export interface BmiResult {
  bmi: number
  category: "Underweight" | "Normal" | "Overweight" | "Obesity Class I" | "Obesity Class II" | "Obesity Class III"
  colorClass: string
}

/**
 * Auto-calculate BMI and clinical weight category
 */
export function calculateBmi(heightCm?: number | string | null, weightKg?: number | string | null): BmiResult | null {
  const h = typeof heightCm === "string" ? parseFloat(heightCm) : heightCm
  const w = typeof weightKg === "string" ? parseFloat(weightKg) : weightKg

  if (!h || !w || h <= 0 || w <= 0) return null

  const heightInMeters = h / 100
  const bmiVal = parseFloat((w / (heightInMeters * heightInMeters)).toFixed(2))

  let category: BmiResult["category"] = "Normal"
  let colorClass = "text-emerald-600 bg-emerald-500/10 border-emerald-500/30"

  if (bmiVal < 18.5) {
    category = "Underweight"
    colorClass = "text-blue-600 bg-blue-500/10 border-blue-500/30"
  } else if (bmiVal < 25) {
    category = "Normal"
    colorClass = "text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
  } else if (bmiVal < 30) {
    category = "Overweight"
    colorClass = "text-amber-600 bg-amber-500/10 border-amber-500/30"
  } else if (bmiVal < 35) {
    category = "Obesity Class I"
    colorClass = "text-orange-600 bg-orange-500/10 border-orange-500/30"
  } else if (bmiVal < 40) {
    category = "Obesity Class II"
    colorClass = "text-rose-600 bg-rose-500/10 border-rose-500/30"
  } else {
    category = "Obesity Class III"
    colorClass = "text-red-700 bg-red-500/15 border-red-500/40"
  }

  return { bmi: bmiVal, category, colorClass }
}

/**
 * Mean Arterial Pressure (MAP)
 * Formula: DBP + (SBP - DBP) / 3
 */
export function calculateMap(sbp?: number | string | null, dbp?: number | string | null): number | null {
  const s = typeof sbp === "string" ? parseInt(sbp, 10) : sbp
  const d = typeof dbp === "string" ? parseInt(dbp, 10) : dbp

  if (!s || !d || s <= d || s <= 0 || d <= 0) return null

  const mapVal = d + (s - d) / 3
  return Math.round(mapVal)
}

/**
 * Body Surface Area (BSA) - Mosteller Formula
 * Formula: sqrt((height_cm * weight_kg) / 3600)
 */
export function calculateBsa(heightCm?: number | string | null, weightKg?: number | string | null): number | null {
  const h = typeof heightCm === "string" ? parseFloat(heightCm) : heightCm
  const w = typeof weightKg === "string" ? parseFloat(weightKg) : weightKg

  if (!h || !w || h <= 0 || w <= 0) return null

  const bsa = Math.sqrt((h * w) / 3600)
  return parseFloat(bsa.toFixed(2))
}

/**
 * Estimated Glomerular Filtration Rate (eGFR)
 * CKD-EPI formula approximation based on Serum Creatinine, Age, and Gender
 */
export function calculateEgfr(
  creatinineMgDl?: number | string | null,
  ageYears?: number | string | null,
  gender?: string | null
): number | null {
  const cr = typeof creatinineMgDl === "string" ? parseFloat(creatinineMgDl) : creatinineMgDl
  const age = typeof ageYears === "string" ? parseInt(ageYears, 10) : ageYears

  if (!cr || !age || cr <= 0 || age <= 0) return null

  const isFemale = String(gender || "").toLowerCase().startsWith("f")
  const kappa = isFemale ? 0.7 : 0.9
  const alpha = isFemale ? -0.241 : -0.302
  const minRatio = Math.min(cr / kappa, 1)
  const maxRatio = Math.max(cr / kappa, 1)

  const egfr =
    142 *
    Math.pow(minRatio, alpha) *
    Math.pow(maxRatio, -1.2) *
    Math.pow(0.9938, age) *
    (isFemale ? 1.012 : 1.0)

  return Math.round(egfr)
}

/**
 * Blood Pressure Classification (ACC/AHA Guidelines)
 */
export function classifyBloodPressure(sbp?: number | string | null, dbp?: number | string | null): {
  label: string
  colorClass: string
} {
  const s = typeof sbp === "string" ? parseInt(sbp, 10) : sbp
  const d = typeof dbp === "string" ? parseInt(dbp, 10) : dbp

  if (!s || !d) return { label: "Not Recorded", colorClass: "text-muted-foreground" }

  if (s < 120 && d < 80) {
    return { label: "Normal BP", colorClass: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" }
  }
  if (s <= 129 && d < 80) {
    return { label: "Elevated BP", colorClass: "text-amber-600 bg-amber-500/10 border-amber-500/20" }
  }
  if (s <= 139 || (d >= 80 && d <= 89)) {
    return { label: "Stage 1 HTN", colorClass: "text-orange-600 bg-orange-500/10 border-orange-500/20" }
  }
  if (s >= 140 || d >= 90) {
    return { label: "Stage 2 HTN", colorClass: "text-rose-600 bg-rose-500/10 border-rose-500/20" }
  }
  return { label: "Hypertensive Crisis", colorClass: "text-red-700 bg-red-500/20 border-red-500/40" }
}
