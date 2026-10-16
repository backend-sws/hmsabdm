import React from "react"
import { Badge, type BadgeProps } from "@/components/ui/badge"

export interface PageHeaderProps {
  title: string
  subtitle?: string
  badgeText?: string
  badge?: React.ReactNode
  badgeVariant?: BadgeProps["variant"]
  actions?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  backButton?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  badgeText,
  badge,
  badgeVariant = "info",
  actions,
  icon: Icon,
  backButton,
  className = "",
  children,
}: PageHeaderProps) {
  return (
    <div className={`relative z-10 flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between pb-4 pt-1 border-b border-border/70 bg-background ${className}`}>
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          {backButton && <div className="shrink-0">{backButton}</div>}
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {badge ? (
            badge
          ) : badgeText ? (
            <Badge variant={badgeVariant} dot>
              {badgeText}
            </Badge>
          ) : null}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed max-w-3xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0 pt-1 md:pt-0">{actions}</div>}
      {children}
    </div>
  )
}
