/**
 * Helper utilities for patient formatting (Age, Gender, DOB)
 */

export function formatPatientAge(
  age?: number | string | null,
  dob?: string | null,
  ageUnit?: "Years" | "Months" | "Days" | string | null
): string {
  // If explicit age unit is provided
  if (ageUnit && age !== undefined && age !== null && age !== "" && !isNaN(Number(age))) {
    const num = Number(age)
    const unit = String(ageUnit).toLowerCase()
    if (unit.startsWith("day")) {
      return num === 0 ? "Newborn (0 Days)" : `${num} ${num === 1 ? "Day" : "Days"}`
    }
    if (unit.startsWith("month")) {
      return `${num} ${num === 1 ? "Month" : "Months"}`
    }
    if (unit.startsWith("year")) {
      return `${num} yrs`
    }
  }

  // If Date of Birth is provided, compute precise clinical age
  if (dob) {
    try {
      const birth = new Date(dob)
      if (!isNaN(birth.getTime())) {
        const diffMs = Date.now() - birth.getTime()
        const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
        if (days < 30) {
          return days === 0 ? "Newborn (0 Days)" : `${days} ${days === 1 ? "Day" : "Days"}`
        }
        const months = Math.floor(days / 30.4375)
        if (months < 24) {
          return `${months} ${months === 1 ? "Month" : "Months"}`
        }
        const years = Math.floor(days / 365.25)
        if (years >= 0 && years < 130) {
          return `${years} yrs`
        }
      }
    } catch {
      // ignore
    }
  }

  if (age !== undefined && age !== null && age !== "" && !isNaN(Number(age)) && Number(age) >= 0) {
    return `${Number(age)} yrs`
  }

  return "—"
}

export function formatPatientGender(gender?: string | null): string {
  if (!gender) return "—"
  const g = gender.trim().toUpperCase()
  if (g === "M" || g === "MALE") return "Male"
  if (g === "F" || g === "FEMALE") return "Female"
  if (g === "O" || g === "OTHER") return "Other"
  return gender
}

export function formatPatientDob(dob?: string | null): string {
  if (!dob) return "—"
  try {
    const d = new Date(dob)
    if (isNaN(d.getTime())) return dob.substring(0, 10)
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dob.substring(0, 10)
  }
}
