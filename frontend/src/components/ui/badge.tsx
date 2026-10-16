import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
        secondary:
          "border-secondary/40 bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20 hover:bg-destructive/25",
        outline: "text-foreground border-border/80 bg-background/60 backdrop-blur-xs",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-950/40 hover:bg-emerald-500/20",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 dark:bg-amber-950/40 hover:bg-amber-500/20",
        info:
          "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 dark:bg-sky-950/40 hover:bg-sky-500/20",
        purple:
          "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 dark:bg-purple-950/40 hover:bg-purple-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0 animate-pulse" />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
