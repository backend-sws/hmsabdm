import React from "react"

export interface PageHeaderBannerProps {
  title: string
  subtitle?: React.ReactNode
  badgeText?: string
  badgeVariant?: "emerald" | "blue" | "purple" | "amber" | "outline"
  imageSrc?: string
  imageAlt?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export const PageHeaderBanner: React.FC<PageHeaderBannerProps> = ({
  title,
  subtitle,
  badgeText,
  badgeVariant = "emerald",
  imageSrc,
  imageAlt = "Header Illustration",
  actions,
  children,
  className = "",
}) => {
  const badgeStyles = {
    emerald:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    purple:
      "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    amber:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    outline: "border-border bg-background text-muted-foreground",
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-blue-50/60 via-background to-blue-50/40 p-6 shadow-2xs sm:p-8 dark:from-slate-900 dark:to-slate-800 ${className}`}
    >
      <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-xl space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {badgeText && (
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyles[badgeVariant] || badgeStyles.emerald}`}
              >
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
          {children}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-3">{actions}</div>
        )}
      </div>

      {/* Header Illustration Image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={imageAlt}
          className="pointer-events-none absolute top-1/2 right-12 hidden h-32 -translate-y-1/2 object-contain opacity-85 drop-shadow-sm xl:block"
        />
      )}
    </div>
  )
}

export default PageHeaderBanner
