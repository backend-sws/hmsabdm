import React from "react"
import { Building2 } from "lucide-react"

export interface StatItem {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  colorScheme?: "blue" | "emerald" | "purple" | "rose" | "cyan"
}

interface StatCardsRowProps {
  stats?: StatItem[]
  isLoading?: boolean
}

export const StatCardsRow: React.FC<StatCardsRowProps> = ({
  stats,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-border/70 bg-card p-5 shadow-2xs"
          />
        ))}
      </div>
    )
  }

  if (!stats || stats.length === 0) return null

  const colorMap = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    purple:
      "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat, idx) => (
        <div
          key={stat.title || idx}
          className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-2xs transition-all hover:shadow-sm"
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              colorMap[stat.colorScheme || "blue"]
            }`}
          >
            {stat.icon || <Building2 className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {stat.title}
            </p>
            <h3 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">
              {stat.value}
            </h3>
            {stat.description && (
              <p className="text-xs font-medium text-muted-foreground/80">
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
