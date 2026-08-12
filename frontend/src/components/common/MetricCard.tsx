import React from "react"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  trend?: "up" | "down" | "neutral"
  description?: string
  icon?: React.ReactNode
  iconBg?: string
  strokeColor?: string
  sparklineData?: number[]
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  trend = "up",
  description,
  icon,
  iconBg,
  strokeColor = "#3b82f6",
  sparklineData = [20, 35, 25, 45, 60, 50, 75, 80],
  className,
}: MetricCardProps) {
  // Generate smooth SVG path from data points
  const minVal = Math.min(...sparklineData)
  const maxVal = Math.max(...sparklineData, minVal + 1)
  const width = 100
  const height = 36

  const points = sparklineData.map((val, idx) => {
    const x = (idx / (sparklineData.length - 1)) * width
    const y = height - ((val - minVal) / (maxVal - minVal)) * (height - 8) - 4
    return { x, y }
  })

  // Build SVG path using cubic Bezier curve smoothing
  const pathD = points.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x},${point.y}`
    const prev = a[i - 1]
    const cp1x = prev.x + (point.x - prev.x) / 2
    const cp1y = prev.y
    const cp2x = prev.x + (point.x - prev.x) / 2
    const cp2y = point.y
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`
  }, "")

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground/80 uppercase">{title}</p>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{value}</div>
        </div>

        {icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 shadow-2xs",
              iconBg || "bg-primary/10 text-primary"
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-2 pt-2 border-t border-border/40">
        <div className="space-y-1">
          {change && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border",
                trend === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                trend === "down" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                trend === "neutral" && "bg-muted text-muted-foreground border-border"
              )}
            >
              {trend === "up" && <TrendingUp className="h-3 w-3" />}
              {trend === "down" && <TrendingDown className="h-3 w-3" />}
              {trend === "neutral" && <Minus className="h-3 w-3" />}
              <span>{change}</span>
            </div>
          )}
          {description && <p className="text-[11px] font-medium text-muted-foreground leading-tight">{description}</p>}
        </div>

        {/* Micro SVG Smooth Curve Line Sparkline Chart */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-24 h-9 shrink-0 opacity-85 group-hover:opacity-100 transition-opacity">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

