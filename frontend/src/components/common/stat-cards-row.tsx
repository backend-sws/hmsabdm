import React from "react"
import { Building2 } from "lucide-react"

export interface StatItem {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  colorScheme?: "blue" | "emerald" | "purple" | "rose" | "cyan" | "amber" | "indigo" | "primary"
  badge?: string
  onClick?: () => void
  active?: boolean
}

export interface StatCardsRowProps {
  stats?: StatItem[]
  isLoading?: boolean
  columns?: 2 | 3 | 4 | 5 | 6
  className?: string
}

export const StatCardsRow: React.FC<StatCardsRowProps> = ({
  stats,
  isLoading = false,
  columns,
  className = "",
}) => {
  const getGridCols = () => {
    if (columns) {
      switch (columns) {
        case 2:
          return "grid-cols-1 sm:grid-cols-2"
        case 3:
          return "grid-cols-1 sm:grid-cols-3"
        case 4:
          return "grid-cols-2 lg:grid-cols-4"
        case 5:
          return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        case 6:
          return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      }
    }
    const count = stats?.length || 5
    if (count <= 2) return "grid-cols-1 sm:grid-cols-2"
    if (count === 3) return "grid-cols-1 sm:grid-cols-3"
    if (count === 4) return "grid-cols-2 lg:grid-cols-4"
    if (count === 5) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
  }

  const gridClass = getGridCols()
  const displayCount = columns || stats?.length || 5

  if (isLoading) {
    return (
      <div className={`grid gap-3.5 ${gridClass} ${className}`}>
        {[...Array(displayCount)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-border/70 bg-card p-4 shadow-2xs"
          />
        ))}
      </div>
    )
  }

  if (!stats || stats.length === 0) return null

  const colorMap = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    primary: "bg-primary/10 text-primary border-primary/20",
  }

  return (
    <div className={`grid gap-3.5 ${gridClass} ${className}`}>
      {stats.map((stat, idx) => (
        <div
          key={stat.title || idx}
          onClick={stat.onClick}
          className={`flex items-center gap-3.5 rounded-xl border border-border/80 bg-card p-4 shadow-2xs transition-all ${
            stat.onClick ? "cursor-pointer hover:border-primary/50 hover:shadow-xs active:scale-[0.99]" : ""
          } ${
            stat.active
              ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs"
              : ""
          }`}
        >
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              colorMap[stat.colorScheme || "blue"]
            }`}
          >
            {stat.icon || <Building2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase truncate">
                {stat.title}
              </p>
              {stat.badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {stat.badge}
                </span>
              )}
            </div>
            <h3 className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {stat.value}
            </h3>
            {stat.description && (
              <p className="text-[11px] font-medium text-muted-foreground truncate mt-0.5">
                {stat.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatCardsRow

