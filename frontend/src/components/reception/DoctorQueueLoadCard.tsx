import React from "react"
import { Users, Clock, Stethoscope, AlertTriangle, CheckCircle2, Flame, Sparkles, UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface DoctorWithQueueInfo {
  id: number | string
  name: string
  specialization?: string
  qualification?: string
  consultation_time?: string
  today_waiting_count?: number
  today_consulting_count?: number
  today_total_count?: number
  schedules?: Array<{
    start_time?: string
    end_time?: string
    is_active?: boolean
  }>
}

interface DoctorQueueLoadCardProps {
  selectedDoctor: DoctorWithQueueInfo | null
  availableDoctors: DoctorWithQueueInfo[]
  slotDurationMinutes?: number
  onSelectDoctor?: (doctorId: number | string) => void
}

export const DoctorQueueLoadCard: React.FC<DoctorQueueLoadCardProps> = ({
  selectedDoctor,
  availableDoctors,
  slotDurationMinutes = 15,
  onSelectDoctor,
}) => {
  if (availableDoctors.length === 0) {
    return null
  }

  // Helper to format minutes into human readable text (e.g. 45 mins or 1h 15m)
  const formatWaitTime = (totalMinutes: number) => {
    if (totalMinutes <= 0) return "No wait (Direct entry)"
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    if (hours === 0) return `~${mins} mins`
    if (mins === 0) return `~${hours} hr`
    return `~${hours}h ${mins}m`
  }

  // Calculate doctor rush status
  const getRushLevel = (waitingCount: number) => {
    if (waitingCount <= 2) {
      return {
        level: "low",
        label: "Low Rush",
        sublabel: "Immediate / Quick Entry",
        badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        bgClass: "from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30",
        indicatorDot: "bg-emerald-500 shadow-emerald-500/50",
        icon: CheckCircle2,
      }
    }
    if (waitingCount <= 5) {
      return {
        level: "moderate",
        label: "Moderate Rush",
        sublabel: "Normal Queue Wait",
        badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
        bgClass: "from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30",
        indicatorDot: "bg-amber-500 shadow-amber-500/50",
        icon: Clock,
      }
    }
    return {
      level: "heavy",
      label: "Heavy Rush / Busy",
      sublabel: "Long waiting expected",
      badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
      bgClass: "from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/30",
      indicatorDot: "bg-rose-500 shadow-rose-500/50 animate-pulse",
      icon: Flame,
    }
  }

  // Find doctor with the lowest wait in this department
  const sortedByQueue = [...availableDoctors].sort(
    (a, b) => (Number(a.today_waiting_count) || 0) - (Number(b.today_waiting_count) || 0)
  )
  const lowestWaitDoc = sortedByQueue[0]

  // If a specific doctor is currently selected
  if (selectedDoctor) {
    const waiting = Number(selectedDoctor.today_waiting_count) || 0
    const consulting = Number(selectedDoctor.today_consulting_count) || 0
    const totalToday = Number(selectedDoctor.today_total_count) || 0
    const estWaitMins = waiting * slotDurationMinutes
    const rush = getRushLevel(waiting)
    const RushIcon = rush.icon

    // Timing display
    let timing = selectedDoctor.consultation_time || "10:00 AM - 02:00 PM"
    if (selectedDoctor.schedules && selectedDoctor.schedules.length > 0) {
      const s = selectedDoctor.schedules[0]
      if (s.start_time && s.end_time) {
        timing = `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`
      }
    }

    return (
      <div
        className={cn(
          "rounded-xl border p-3.5 transition-all duration-300 bg-gradient-to-r shadow-xs",
          rush.bgClass
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold shadow-xs">
              <Stethoscope className="h-5 w-5" />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background shadow-xs",
                  rush.indicatorDot
                )}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">
                  {selectedDoctor.name}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0 h-5 font-semibold", rush.badgeClass)}
                >
                  <RushIcon className="h-3 w-3 mr-1" />
                  {rush.label}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>{selectedDoctor.specialization || "General Practice"}</span>
                <span>•</span>
                <span className="font-medium text-foreground/80">🕒 Shift: {timing}</span>
              </p>
            </div>
          </div>

          {availableDoctors.length > 1 && onSelectDoctor && (
            <button
              type="button"
              onClick={() => onSelectDoctor("")}
              className="text-[11px] text-primary hover:underline font-medium self-start sm:self-auto"
            >
              Compare all doctors ({availableDoctors.length})
            </button>
          )}
        </div>

        {/* Live Counters Grid */}
        <div className="grid grid-cols-3 gap-2 pt-3">
          {/* 1. Waiting Queue */}
          <div className="rounded-lg bg-background/80 dark:bg-background/40 backdrop-blur-xs p-2 border border-border/60 flex flex-col items-center text-center">
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>Waiting Queue</span>
            </div>
            <div className="text-lg font-bold text-foreground mt-0.5">
              {waiting}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">patients</span>
            </div>
            <span className="text-[10px] text-muted-foreground">in waiting area</span>
          </div>

          {/* 2. In Cabin / Consulting */}
          <div className="rounded-lg bg-background/80 dark:bg-background/40 backdrop-blur-xs p-2 border border-border/60 flex flex-col items-center text-center">
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>In Chamber</span>
            </div>
            <div className="text-lg font-bold text-foreground mt-0.5">
              {consulting}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">active</span>
            </div>
            <span className="text-[10px] text-muted-foreground">under consultation</span>
          </div>

          {/* 3. Est. Wait Time */}
          <div className="rounded-lg bg-background/80 dark:bg-background/40 backdrop-blur-xs p-2 border border-border/60 flex flex-col items-center text-center">
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Est. Wait Time</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-foreground mt-0.5 truncate max-w-full">
              {formatWaitTime(estWaitMins)}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {waiting > 0 ? `(${slotDurationMinutes}m per patient)` : "direct entry"}
            </span>
          </div>
        </div>

        {/* Reception Action Notice / Alert */}
        {waiting >= 6 ? (
          <div className="mt-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 p-2 flex items-start gap-2 text-rose-800 dark:text-rose-300 text-[11px]">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <span className="font-semibold">⚠️ Heavy Queue Warning: </span>
              Dr. {selectedDoctor.name.split(" ")[0]} has {waiting} patients in queue (expected wait:{" "}
              {formatWaitTime(estWaitMins)}). Please inform the patient before issuing receipt, or assign another doctor if urgent!
            </div>
          </div>
        ) : waiting === 0 ? (
          <div className="mt-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1.5 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[11px]">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Dr. {selectedDoctor.name} has NO waiting queue.</strong> Patient can proceed directly to consultation!
            </span>
          </div>
        ) : (
          <div className="mt-2.5 text-[11px] text-muted-foreground flex items-center justify-between px-1">
            <span>
              Total visits today: <strong>{totalToday}</strong>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Ready for token generation
            </span>
          </div>
        )}
      </div>
    )
  }

  // If NO doctor is selected ("Auto-assign first available doctor")
  // Show a department doctor workload comparison card
  return (
    <div className="rounded-xl border border-border/80 bg-muted/30 p-3 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Live Department Workload ({availableDoctors.length} Doctors)
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Click any doctor to assign directly
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2.5">
        {availableDoctors.map((doc) => {
          const waiting = Number(doc.today_waiting_count) || 0
          const consulting = Number(doc.today_consulting_count) || 0
          const estWaitMins = waiting * slotDurationMinutes
          const rush = getRushLevel(waiting)
          const isLowest = lowestWaitDoc && doc.id === lowestWaitDoc.id && availableDoctors.length > 1

          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelectDoctor && onSelectDoctor(doc.id)}
              className={cn(
                "group relative text-left p-2.5 rounded-lg border transition-all duration-200 hover:shadow-xs",
                "bg-background hover:border-primary/50 flex flex-col justify-between",
                isLowest ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20" : "border-border/70"
              )}
            >
              {isLowest && (
                <div className="absolute -top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-600 px-1.5 py-0.2 text-[9px] font-semibold text-white shadow-xs">
                  <Sparkles className="h-2.5 w-2.5" />
                  Lowest Wait
                </div>
              )}

              <div>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {doc.name}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1">
                  {doc.specialization || "General"}
                </p>
              </div>

              <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      rush.indicatorDot
                    )}
                  />
                  <span className="font-semibold text-foreground">
                    {waiting} waiting
                  </span>
                  {consulting > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ({consulting} in room)
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {formatWaitTime(estWaitMins)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
