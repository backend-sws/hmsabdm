/**
 * Modified Early Warning Score (MEWS) & Vital Signs Threshold Classification Utility
 * Standard medical guidelines for inpatient monitoring.
 */

export interface MewsInput {
  respiratory_rate?: number | null
  pulse_rate?: number | null
  blood_pressure_sys?: number | null
  temperature?: number | null
  temperature_unit?: "F" | "C" | string
  avpu?: "Alert" | "Voice" | "Pain" | "Unresponsive" | string | null
}

export interface MewsResult {
  score: number
  risk: "normal" | "medium" | "high"
  label: string
  color: string
  bgColor: string
  borderColor: string
  advice: string
}

export function calculateMews(input: MewsInput): MewsResult {
  let score = 0

  // 1. Respiratory Rate
  if (input.respiratory_rate !== undefined && input.respiratory_rate !== null) {
    const rr = Number(input.respiratory_rate)
    if (rr < 9) score += 2
    else if (rr >= 9 && rr <= 14) score += 0
    else if (rr >= 15 && rr <= 20) score += 1
    else if (rr >= 21 && rr <= 29) score += 2
    else if (rr >= 30) score += 3
  }

  // 2. Pulse / Heart Rate
  if (input.pulse_rate !== undefined && input.pulse_rate !== null) {
    const pr = Number(input.pulse_rate)
    if (pr < 40) score += 2
    else if (pr >= 40 && pr <= 50) score += 1
    else if (pr >= 51 && pr <= 100) score += 0
    else if (pr >= 101 && pr <= 110) score += 1
    else if (pr >= 111 && pr <= 129) score += 2
    else if (pr >= 130) score += 3
  }

  // 3. Systolic Blood Pressure
  if (input.blood_pressure_sys !== undefined && input.blood_pressure_sys !== null) {
    const sbp = Number(input.blood_pressure_sys)
    if (sbp < 70) score += 3
    else if (sbp >= 70 && sbp <= 80) score += 2
    else if (sbp >= 81 && sbp <= 100) score += 1
    else if (sbp >= 101 && sbp <= 199) score += 0
    else if (sbp >= 200) score += 2
  }

  // 4. Temperature (Normalise to Fahrenheit)
  if (input.temperature !== undefined && input.temperature !== null) {
    let tempF = Number(input.temperature)
    if (input.temperature_unit === "C") {
      tempF = (tempF * 9) / 5 + 32
    }
    if (tempF < 95.0) score += 2
    else if (tempF >= 95.0 && tempF <= 101.1) score += 0
    else if (tempF >= 101.2) score += 2
  }

  // 5. AVPU Consciousness Level
  if (input.avpu) {
    const avpu = input.avpu.toUpperCase()
    if (avpu.includes("ALERT") || avpu === "A") score += 0
    else if (avpu.includes("VOICE") || avpu === "V") score += 1
    else if (avpu.includes("PAIN") || avpu === "P") score += 2
    else if (avpu.includes("UNRESPONSIVE") || avpu === "U") score += 3
  }

  if (score >= 5) {
    return {
      score,
      risk: "high",
      label: "Critical Deterioration (High Risk)",
      color: "text-rose-700 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/40",
      borderColor: "border-rose-300 dark:border-rose-800",
      advice: "Urgent medical attention required! Immediate Duty Doctor call & ICU Bed Transfer evaluation.",
    }
  }

  if (score >= 3) {
    return {
      score,
      risk: "medium",
      label: "Moderate Deterioration Risk",
      color: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      borderColor: "border-amber-300 dark:border-amber-800",
      advice: "Increase vitals monitoring frequency (every 2-4 hours). Inform attending nursing supervisor.",
    }
  }

  return {
    score,
    risk: "normal",
    label: "Normal / Clinically Stable",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    borderColor: "border-emerald-300 dark:border-emerald-800",
    advice: "Continue routine bedside monitoring per ward protocol.",
  }
}

/**
 * Check individual vital abnormality thresholds
 */
export function getTemperatureStatus(val?: number | null, unit: string = "F") {
  if (val === undefined || val === null) return null
  let tempF = val
  if (unit === "C") tempF = (tempF * 9) / 5 + 32

  if (tempF > 100.4) {
    return { status: "critical", label: "High Fever", color: "text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" }
  }
  if (tempF > 99.2) {
    return { status: "warning", label: "Low Grade Fever", color: "text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" }
  }
  if (tempF < 96.0) {
    return { status: "low", label: "Hypothermia", color: "text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" }
  }
  return { status: "normal", label: "Normal", color: "text-emerald-700 font-medium" }
}

export function getBloodPressureStatus(sys?: number | null, dia?: number | null) {
  if (!sys || !dia) return null
  if (sys >= 160 || dia >= 100) {
    return { status: "critical", label: "Stage 2 HTN", color: "text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" }
  }
  if (sys >= 140 || dia >= 90) {
    return { status: "warning", label: "Stage 1 HTN", color: "text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" }
  }
  if (sys < 90 || dia < 60) {
    return { status: "low", label: "Hypotension", color: "text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" }
  }
  return { status: "normal", label: "Normal", color: "text-emerald-700 font-medium" }
}

export function getPulseStatus(val?: number | null) {
  if (!val) return null
  if (val > 100) {
    return { status: "critical", label: "Tachycardia", color: "text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" }
  }
  if (val < 60) {
    return { status: "low", label: "Bradycardia", color: "text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" }
  }
  return { status: "normal", label: "Normal", color: "text-emerald-700 font-medium" }
}

export function getSpo2Status(val?: number | null) {
  if (!val) return null
  if (val < 90) {
    return { status: "critical", label: "Severe Hypoxia", color: "text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 animate-pulse" }
  }
  if (val < 95) {
    return { status: "warning", label: "Mild Hypoxia", color: "text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" }
  }
  return { status: "normal", label: "Normal", color: "text-emerald-700 font-medium" }
}

export function getGlucoseStatus(val?: number | null, type: string = "random") {
  if (!val) return null
  if (val < 70) {
    return { status: "critical", label: "Hypoglycemia", color: "text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" }
  }
  if (type === "fasting" && val > 126) {
    return { status: "warning", label: "High Fasting", color: "text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" }
  }
  if (val > 200) {
    return { status: "warning", label: "Hyperglycemia", color: "text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" }
  }
  return { status: "normal", label: "Normal", color: "text-emerald-700 font-medium" }
}
