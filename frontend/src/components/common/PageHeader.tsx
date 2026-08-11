import { Badge } from "@/components/ui/badge"

export interface PageHeaderProps {
  title: string
  subtitle?: string
  badgeText?: string
  badgeVariant?: "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline"
  actions?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  badgeText,
  badgeVariant = "info",
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6 border-b border-border/60">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  )
}
