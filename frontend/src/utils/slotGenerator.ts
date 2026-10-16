export interface SlotOption {
  value: string
  label: string
  isLiveToken?: boolean
  session?: "morning" | "evening" | "general"
  startTime24?: string
  endTime24?: string
}

export interface GenerateSlotsParams {
  startTime?: string | null            // e.g. "09:00" or "09:00:00"
  endTime?: string | null              // e.g. "13:00" or "13:00:00"
  slotDurationMinutes?: number         // e.g. 5, 10, 15, 20, 30, 45, 60
  includeLiveToken?: boolean          // whether to prepend Live FIFO Token
  defaultMorningStart?: string         // fallback morning start "09:00"
  defaultMorningEnd?: string           // fallback morning end "13:00"
  defaultEveningStart?: string         // fallback evening start "17:00"
  defaultEveningEnd?: string           // fallback evening end "21:00"
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const clean = timeStr.trim().toLowerCase()
  const isPM = clean.includes("pm")
  const isAM = clean.includes("am")
  const match = clean.replace(/[apm\s]/g, "").split(":")
  let hours = parseInt(match[0] || "0", 10)
  const minutes = parseInt(match[1] || "0", 10)

  if (isPM && hours < 12) hours += 12
  if (isAM && hours === 12) hours = 0

  return hours * 60 + minutes
}

function formatMinutesTo12h(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  const period = hours24 >= 12 ? "PM" : "AM"
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  const mm = minutes.toString().padStart(2, "0")
  const hh = hours12.toString().padStart(2, "0")
  return `${hh}:${mm} ${period}`
}

function getSessionLabel(startMins: number): string {
  const hour = Math.floor(startMins / 60)
  if (hour < 12) return "Morning Slot"
  if (hour < 16) return "Afternoon Slot"
  return "Evening Slot"
}

/**
 * Generate discrete appointment slots dynamically based on doctor shift timings
 * and hospital configured slot duration (e.g. 5m, 10m, 15m, 30m).
 */
export function generateDoctorSlots(params: GenerateSlotsParams = {}): SlotOption[] {
  const {
    startTime,
    endTime,
    slotDurationMinutes = 15,
    includeLiveToken = true,
    defaultMorningStart = "09:00",
    defaultMorningEnd = "13:00",
    defaultEveningStart = "17:00",
    defaultEveningEnd = "21:00",
  } = params

  const duration = Math.max(5, slotDurationMinutes)
  const slots: SlotOption[] = []

  if (includeLiveToken) {
    slots.push({
      value: "LIVE_QUEUE",
      label: "⚡ Next Available Token (Live Queue - FIFO)",
      isLiveToken: true,
      session: "general",
    })
  }

  // If explicit doctor schedule is provided
  if (startTime && endTime) {
    let current = parseTimeToMinutes(startTime)
    const end = parseTimeToMinutes(endTime)

    while (current + duration <= end) {
      const slotStart = formatMinutesTo12h(current)
      const slotEnd = formatMinutesTo12h(current + duration)
      const session = getSessionLabel(current)
      const value = `${slotStart} - ${slotEnd}`
      slots.push({
        value,
        label: `${slotStart} – ${slotEnd} (${session})`,
        session: current < 12 * 60 ? "morning" : "evening",
      })
      current += duration
    }

    return slots
  }

  // Fallback: Generate standard Hospital Morning & Evening session slots
  const generateRange = (startStr: string, endStr: string, sessionType: "morning" | "evening") => {
    let cur = parseTimeToMinutes(startStr)
    const stop = parseTimeToMinutes(endStr)
    while (cur + duration <= stop) {
      const slotStart = formatMinutesTo12h(cur)
      const slotEnd = formatMinutesTo12h(cur + duration)
      const session = getSessionLabel(cur)
      const value = `${slotStart} - ${slotEnd}`
      slots.push({
        value,
        label: `${slotStart} – ${slotEnd} (${session})`,
        session: sessionType,
      })
      cur += duration
    }
  }

  generateRange(defaultMorningStart, defaultMorningEnd, "morning")
  generateRange(defaultEveningStart, defaultEveningEnd, "evening")

  return slots
}
