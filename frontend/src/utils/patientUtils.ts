/**
 * Helper utilities for patient formatting (Age, Gender, DOB)
 */

export function formatPatientAge(age?: number | string | null, dob?: string | null): string {
  if (age !== undefined && age !== null && age !== "" && !isNaN(Number(age)) && Number(age) >= 0) {
    return `${Number(age)} yrs`
  }
  if (dob) {
    try {
      const birth = new Date(dob)
      if (!isNaN(birth.getTime())) {
        const diffMs = Date.now() - birth.getTime()
        const ageDate = new Date(diffMs)
        const computedYears = Math.abs(ageDate.getUTCFullYear() - 1970)
        if (computedYears >= 0 && computedYears < 130) {
          return `${computedYears} yrs`
        }
      }
    } catch {
      // ignore
    }
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
