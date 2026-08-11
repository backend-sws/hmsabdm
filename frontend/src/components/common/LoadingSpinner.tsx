import { cn } from "@/lib/utils"

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  label?: string
  className?: string
  fullScreen?: boolean
}

export function LoadingSpinner({
  size = "md",
  label = "Loading...",
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  }

  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-3 p-6", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-primary border-t-transparent",
          sizeClasses[size]
        )}
        role="status"
        aria-label="loading"
      />
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs">
        {content}
      </div>
    )
  }

  return content
}
