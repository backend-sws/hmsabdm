import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

export interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  trend?: "up" | "down" | "neutral"
  description?: string
  icon?: React.ReactNode
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  trend = "up",
  description,
  icon,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("card-hover relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {change && (
            <div
              className={cn(
                "flex items-center text-xs font-semibold px-2 py-0.5 rounded-full",
                trend === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                trend === "down" && "bg-destructive/10 text-destructive",
                trend === "neutral" && "bg-muted text-muted-foreground"
              )}
            >
              {trend === "up" && <TrendingUp className="mr-1 h-3 w-3" />}
              {trend === "down" && <TrendingDown className="mr-1 h-3 w-3" />}
              {change}
            </div>
          )}
        </div>
        {description && (
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
