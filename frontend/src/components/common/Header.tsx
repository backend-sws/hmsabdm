import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sun, Moon, Activity, ShieldCheck, User } from "lucide-react"

export interface HeaderProps {
  darkMode: boolean
  onToggleDarkMode: () => void
}

export function Header({ darkMode, onToggleDarkMode }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-card/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-foreground">HMS ABDM</span>
              <Badge variant="success" className="text-[10px] px-1.5 py-0">M1 & M2 Live</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Healthcare Management System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/40">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>ABHA Network Connected</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDarkMode}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200" />}
          </Button>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-foreground">Dr. Sharma</p>
              <p className="text-[10px] text-muted-foreground">Chief Medical Officer</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
