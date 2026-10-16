import React, { useState, useMemo } from "react"
import { Zap, Clock, Sun, Moon, Check, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SlotOption } from "@/utils/slotGenerator"

interface SlotPickerProps {
  slots: SlotOption[]
  value?: string
  onChange: (value: string) => void
  slotDurationMinutes?: number
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots,
  value = "",
  onChange,
  slotDurationMinutes = 15,
}) => {
  // If value is empty or "LIVE_QUEUE", it represents the Live Token FIFO queue
  const isLiveToken = !value || value === "LIVE_QUEUE"

  // Separate live token option from scheduled time slots
  const scheduledSlots = useMemo(() => {
    return slots.filter((s) => !s.isLiveToken)
  }, [slots])

  const morningSlots = useMemo(() => {
    return scheduledSlots.filter((s) => s.session === "morning")
  }, [scheduledSlots])

  const eveningSlots = useMemo(() => {
    return scheduledSlots.filter((s) => s.session === "evening")
  }, [scheduledSlots])

  // Active filter tab: "all" | "morning" | "evening"
  const [activeSessionTab, setActiveSessionTab] = useState<"all" | "morning" | "evening">("all")
  const [showAllTimeSlots, setShowAllTimeSlots] = useState<boolean>(!isLiveToken)

  const displayedScheduledSlots = useMemo(() => {
    if (activeSessionTab === "morning") return morningSlots
    if (activeSessionTab === "evening") return eveningSlots
    return scheduledSlots
  }, [activeSessionTab, morningSlots, eveningSlots, scheduledSlots])

  // Find label of currently selected slot
  const selectedSlotObj = useMemo(() => {
    if (isLiveToken) return null
    return scheduledSlots.find((s) => s.value === value)
  }, [isLiveToken, scheduledSlots, value])

  return (
    <div className="space-y-3">
      {/* ── 1. PRIMARY SELECTION: Live Walk-In Token (FIFO) ── */}
      <div
        onClick={() => {
          onChange("")
        }}
        className={cn(
          "relative flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition-all duration-200 select-none",
          isLiveToken
            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
            : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              isLiveToken
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-foreground">
                Next Available Token (Live Walk-In Queue)
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5 font-semibold",
                  isLiveToken
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "text-muted-foreground"
                )}
              >
                ⚡ FIFO Instant
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Patient enters live queue immediately with consecutive token number
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLiveToken && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
              <Check className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>

      {/* ── 2. SECONDARY SELECTION: Specific Scheduled Time Slot ── */}
      <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              Or Book Specific Time Slot ({slotDurationMinutes}m intervals)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAllTimeSlots((prev) => !prev)}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            {showAllTimeSlots ? (
              <>
                <span>Hide Slots</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>
                  {selectedSlotObj ? `Selected: ${selectedSlotObj.value}` : `View Slots (${scheduledSlots.length})`}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Selected Slot indicator if slot grid is collapsed */}
        {!showAllTimeSlots && selectedSlotObj && (
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">
                Reserved Slot: {selectedSlotObj.label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[11px] text-muted-foreground hover:text-destructive underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Expanded Slots Grid & Filter */}
        {showAllTimeSlots && (
          <div className="mt-3 space-y-2.5 pt-2.5 border-t border-border/50">
            {/* Session Tabs */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSessionTab("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                  activeSessionTab === "all"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                All ({scheduledSlots.length})
              </button>

              {morningSlots.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSessionTab("morning")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                    activeSessionTab === "morning"
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Sun className="h-3 w-3 text-amber-500 group-hover:text-amber-600" />
                  Morning ({morningSlots.length})
                </button>
              )}

              {eveningSlots.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSessionTab("evening")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                    activeSessionTab === "evening"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Moon className="h-3 w-3" />
                  Evening ({eveningSlots.length})
                </button>
              )}
            </div>

            {/* Slots Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1 pr-1.5 scrollbar-thin">
              {displayedScheduledSlots.map((slot, idx) => {
                const isSelected = value === slot.value
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onChange(slot.value)
                    }}
                    className={cn(
                      "group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-left border transition-all text-xs select-none",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "border-border/70 bg-background hover:border-primary/50 hover:bg-primary/5 text-foreground"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold leading-tight">
                        {slot.value.split(" - ")[0]}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] mt-0.5",
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        to {slot.value.split(" - ")[1]}
                      </span>
                    </div>

                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 shrink-0 ml-1 text-primary-foreground" />
                    ) : (
                      <span className="text-[9px] text-muted-foreground/60 font-mono">
                        {slotDurationMinutes}m
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Active Selection Confirmation Status Pill ── */}
      <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>Current Allocation:</span>
        <span className="font-semibold text-foreground">
          {isLiveToken ? (
            <span className="text-primary font-bold">⚡ Live Queue (Next Available Token)</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              🕒 Reserved Slot ({value})
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
