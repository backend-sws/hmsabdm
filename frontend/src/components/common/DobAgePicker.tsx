import React, { useState, useEffect } from "react"
import { Calendar, RefreshCw, Calculator, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export interface DobAgeValue {
  dob?: string // YYYY-MM-DD
  age?: number // Years
  months?: number
  days?: number
}

interface DobAgePickerProps {
  dobValue?: string
  ageValue?: number | string
  onChange?: (val: DobAgeValue) => void
  disabled?: boolean
  isAbhaLocked?: boolean
  required?: boolean
  className?: string
  dobLabel?: string
  ageLabel?: string
}

/**
 * Accurately calculate Years, Months, Days from a Date string (YYYY-MM-DD)
 */
export function calculateAgeBreakdown(dobString?: string): { years: number; months: number; days: number } | null {
  if (!dobString) return null
  const birth = new Date(dobString)
  if (isNaN(birth.getTime())) return null

  const today = new Date()
  if (birth > today) return { years: 0, months: 0, days: 0 }

  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()
  let days = today.getDate() - birth.getDate()

  if (days < 0) {
    months -= 1
    // Days in previous month
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate()
    days += prevMonthLastDay
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
  }
}

/**
 * Calculate Date of Birth (YYYY-MM-DD) from Years, Months, and Days
 */
export function calculateDobFromAge(years: number = 0, months: number = 0, days: number = 0): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - (years || 0))
  d.setMonth(d.getMonth() - (months || 0))
  d.setDate(d.getDate() - (days || 0))

  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export const DobAgePicker: React.FC<DobAgePickerProps> = ({
  dobValue = "",
  ageValue,
  onChange,
  disabled = false,
  isAbhaLocked = false,
  required = false,
  className = "",
  dobLabel = "Date of Birth",
  ageLabel = "Age Breakdown",
}) => {
  const [dob, setDob] = useState<string>(dobValue || "")
  const [years, setYears] = useState<string>(ageValue !== undefined && ageValue !== null ? String(ageValue) : "")
  const [months, setMonths] = useState<string>("")
  const [days, setDays] = useState<string>("")
  const [lastSource, setLastSource] = useState<"dob" | "age" | "none">("none")

  // Sync internal state when external props change
  useEffect(() => {
    if (dobValue && dobValue !== dob) {
      setDob(dobValue)
      const breakdown = calculateAgeBreakdown(dobValue)
      if (breakdown) {
        setYears(String(breakdown.years))
        setMonths(String(breakdown.months))
        setDays(String(breakdown.days))
      }
    } else if (!dobValue && ageValue !== undefined && ageValue !== null && String(ageValue) !== years) {
      setYears(String(ageValue))
      const calculatedDob = calculateDobFromAge(Number(ageValue) || 0, 0, 0)
      setDob(calculatedDob)
    }
  }, [dobValue, ageValue])

  // Handle DOB input change -> calculates Years, Months, Days
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setDob(val)
    setLastSource("dob")

    if (val && !isNaN(new Date(val).getTime())) {
      const breakdown = calculateAgeBreakdown(val)
      if (breakdown) {
        setYears(String(breakdown.years))
        setMonths(String(breakdown.months))
        setDays(String(breakdown.days))
        onChange?.({
          dob: val,
          age: breakdown.years,
          months: breakdown.months,
          days: breakdown.days,
        })
        return
      }
    }

    if (!val) {
      setYears("")
      setMonths("")
      setDays("")
      onChange?.({
        dob: "",
        age: undefined,
        months: undefined,
        days: undefined,
      })
    }
  }

  // Handle Age breakdown change -> calculates DOB
  const handleAgeChange = (field: "years" | "months" | "days", value: string) => {
    const cleanVal = value.replace(/\D/g, "")
    let newYears = years
    let newMonths = months
    let newDays = days

    if (field === "years") {
      newYears = cleanVal
      setYears(cleanVal)
    } else if (field === "months") {
      // Month max 11
      const num = Number(cleanVal)
      newMonths = num > 11 ? "11" : cleanVal
      setMonths(newMonths)
    } else if (field === "days") {
      // Day max 30
      const num = Number(cleanVal)
      newDays = num > 30 ? "30" : cleanVal
      setDays(newDays)
    }

    setLastSource("age")

    const y = Number(newYears) || 0
    const m = Number(newMonths) || 0
    const d = Number(newDays) || 0

    if (newYears !== "" || newMonths !== "" || newDays !== "") {
      const calculatedDob = calculateDobFromAge(y, m, d)
      setDob(calculatedDob)
      onChange?.({
        dob: calculatedDob,
        age: y,
        months: m,
        days: d,
      })
    } else {
      setDob("")
      onChange?.({
        dob: "",
        age: undefined,
        months: undefined,
        days: undefined,
      })
    }
  }

  const isLocked = disabled || isAbhaLocked

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid gap-3 sm:grid-cols-12">
        {/* DOB Input */}
        <div className="sm:col-span-5 space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {dobLabel} {required && <span className="text-destructive">*</span>}
            </Label>
            {isAbhaLocked && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                <Lock className="h-2.5 w-2.5" /> ABDM Locked
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              type="date"
              value={dob}
              onChange={handleDobChange}
              disabled={isLocked}
              max={new Date().toISOString().split("T")[0]}
              className="text-xs pr-8 bg-background font-medium"
            />
          </div>
          <span className="text-[10px] text-muted-foreground block">
            {dob ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Auto-syncs Age below
              </span>
            ) : (
              "Enter DOB or enter Age below"
            )}
          </span>
        </div>

        {/* Age Breakdown Inputs (Years, Months, Days) */}
        <div className="sm:col-span-7 space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <Calculator className="h-3.5 w-3.5 text-emerald-600" />
              {ageLabel} {required && <span className="text-destructive">*</span>}
            </Label>
            {lastSource === "dob" && dob && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-600 border-emerald-500/30">
                Calculated from DOB
              </Badge>
            )}
            {lastSource === "age" && (years || months || days) && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 text-blue-600 border-blue-500/30">
                Calculated DOB
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {/* Years */}
            <div>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="130"
                  placeholder="Years"
                  value={years}
                  onChange={(e) => handleAgeChange("years", e.target.value)}
                  disabled={isLocked}
                  className="text-xs px-2 text-center bg-background font-semibold"
                />
              </div>
              <span className="text-[10px] text-muted-foreground text-center block mt-0.5 font-medium">
                Years (Y)
              </span>
            </div>

            {/* Months */}
            <div>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="11"
                  placeholder="Months"
                  value={months}
                  onChange={(e) => handleAgeChange("months", e.target.value)}
                  disabled={isLocked}
                  className="text-xs px-2 text-center bg-background"
                />
              </div>
              <span className="text-[10px] text-muted-foreground text-center block mt-0.5 font-medium">
                Months (M)
              </span>
            </div>

            {/* Days */}
            <div>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="30"
                  placeholder="Days"
                  value={days}
                  onChange={(e) => handleAgeChange("days", e.target.value)}
                  disabled={isLocked}
                  className="text-xs px-2 text-center bg-background"
                />
              </div>
              <span className="text-[10px] text-muted-foreground text-center block mt-0.5 font-medium">
                Days (D)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Summary Badge */}
      {(dob || years || months || days) && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/50 border border-border/80 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 text-primary animate-pulse" />
            <span>
              Calculated Age:{" "}
              <strong className="text-foreground">
                {years || "0"} Years {months ? `, ${months} Months` : ""} {days ? `, ${days} Days` : ""}
              </strong>
            </span>
          </div>
          {dob && (
            <span className="font-mono text-[10px] bg-background px-2 py-0.5 rounded border border-border">
              DOB: {dob}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default DobAgePicker
