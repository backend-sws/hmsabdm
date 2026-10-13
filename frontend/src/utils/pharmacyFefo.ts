import type { PharmacyBatch } from "@/types/pharmacy"

export interface FefoStatus {
  daysLeft: number
  isExpired: boolean
  isCritical: boolean // <= 30 days
  isNearExpiry: boolean // 31 - 180 days
  isSafe: boolean // > 180 days
  label: string
  shortLabel: string
  badgeClass: string
  bgLightClass: string
  textClass: string
}

/**
 * Calculates FEFO status and formatting based on expiry date
 */
export function getBatchFefoStatus(expiryDateStr?: string | null): FefoStatus {
  if (!expiryDateStr) {
    return {
      daysLeft: 9999,
      isExpired: false,
      isCritical: false,
      isNearExpiry: false,
      isSafe: true,
      label: "Safe Stock",
      shortLabel: "Safe",
      badgeClass: "text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      bgLightClass: "bg-emerald-50/50 dark:bg-emerald-950/20",
      textClass: "text-emerald-600 dark:text-emerald-400",
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(expiryDateStr)
  exp.setHours(0, 0, 0, 0)

  const diffTime = exp.getTime() - today.getTime()
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) {
    const pastDays = Math.abs(daysLeft)
    return {
      daysLeft,
      isExpired: true,
      isCritical: true,
      isNearExpiry: true,
      isSafe: false,
      label: `Expired (${pastDays}d ago)`,
      shortLabel: "Expired",
      badgeClass: "text-red-700 bg-red-100 border border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-900",
      bgLightClass: "bg-red-50 dark:bg-red-950/20",
      textClass: "text-red-600 dark:text-red-400",
    }
  }

  if (daysLeft <= 30) {
    return {
      daysLeft,
      isExpired: false,
      isCritical: true,
      isNearExpiry: true,
      isSafe: false,
      label: `Critical Expiry (${daysLeft}d left)`,
      shortLabel: `${daysLeft}d left`,
      badgeClass: "text-rose-700 bg-rose-100 border border-rose-300 animate-pulse dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-900",
      bgLightClass: "bg-rose-50 dark:bg-rose-950/20",
      textClass: "text-rose-600 dark:text-rose-400",
    }
  }

  if (daysLeft <= 180) {
    const months = Math.ceil(daysLeft / 30)
    return {
      daysLeft,
      isExpired: false,
      isCritical: false,
      isNearExpiry: true,
      isSafe: false,
      label: `Near Expiry (~${months}mo)`,
      shortLabel: `${months}mo`,
      badgeClass: "text-amber-700 bg-amber-100 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-900",
      bgLightClass: "bg-amber-50 dark:bg-amber-950/20",
      textClass: "text-amber-600 dark:text-amber-400",
    }
  }

  return {
    daysLeft,
    isExpired: false,
    isCritical: false,
    isNearExpiry: false,
    isSafe: true,
    label: "Safe Stock (>6mo)",
    shortLabel: "Safe",
    badgeClass: "text-emerald-700 bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-900",
    bgLightClass: "bg-emerald-50 dark:bg-emerald-950/20",
    textClass: "text-emerald-600 dark:text-emerald-400",
  }
}

/**
 * Returns the best FEFO pick among a list of batches
 * (Earliest valid expiry date with available_quantity > 0)
 */
export function findBestFefoBatch(batches: PharmacyBatch[]): PharmacyBatch | null {
  if (!batches || batches.length === 0) return null

  const validBatches = batches.filter((b) => {
    if (!b.is_active || (b.available_quantity ?? 0) <= 0) return false
    const status = getBatchFefoStatus(b.expiry_date)
    return !status.isExpired
  })

  if (validBatches.length === 0) return null

  // Sort ascending by expiry_date
  return validBatches.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())[0]
}
