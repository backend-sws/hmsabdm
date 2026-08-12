import React from "react"
import { useNavigate } from "react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Activity,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  QrCode,
  Menu,
  X,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from "lucide-react"

interface AppHeaderProps {
  sidebarOpen: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  isCollapsed: boolean
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  darkMode: boolean
  toggleDarkMode: () => void
  setIsSearchOpen: (open: boolean) => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  isCollapsed,
  setIsCollapsed,
  darkMode,
  toggleDarkMode,
  setIsSearchOpen,
}) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-40 h-16 w-full shrink-0 border-b border-border/70 bg-card/95 shadow-2xs backdrop-blur-md transition-colors">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left Logo & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted focus:outline-none lg:hidden"
            aria-label="Toggle navigation menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div
            onClick={() => navigate("/")}
            className="group flex cursor-pointer items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <Activity className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  HMS ABDM
                </span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  M1 & M2 Live
                </span>
              </div>
              <p className="text-[11px] leading-tight font-medium text-muted-foreground">
                Healthcare Platform
              </p>
            </div>
          </div>

          {/* Desktop Sidebar Toggle Switch */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="ml-2 hidden rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground lg:flex"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Middle Global Search Trigger Bar */}
        <div className="mx-4 hidden max-w-lg flex-1 md:block">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-slate-100/80 px-4 py-2 text-xs text-muted-foreground shadow-2xs transition-all hover:border-primary/40 hover:bg-slate-100 dark:bg-muted/40"
          >
            <span className="flex items-center gap-2.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span className="font-normal text-muted-foreground/80">
                Search ABHA ID, Patient, Token, Doctor...
              </span>
            </span>
            <kbd className="hidden items-center gap-0.5 rounded-md border border-border/80 bg-background px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-2xs sm:inline-flex">
              ⌘ K
            </kbd>
          </button>
        </div>

        {/* Right Action Icons & User Profile */}
        <div className="flex items-center gap-3">
          {/* ABDM Gateway Online Badge */}
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 xl:flex dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>ABDM Gateway</span>
            <span className="rounded bg-emerald-500/20 px-1 font-mono text-[10px] font-extrabold uppercase">
              ONLINE
            </span>
          </div>

          {/* Quick Walk-in Token Button */}
          <Button
            size="sm"
            onClick={() => navigate("/reception")}
            className="hidden gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 sm:flex"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Walk-in Token</span>
          </Button>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            )}
          </Button>

          <div className="hidden h-5 w-px bg-border/80 sm:block" />

          {/* Profile User Dropdown Pill */}
          <div
            onClick={handleLogout}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl p-1 transition-colors hover:bg-muted/60"
            title="Click to Sign Out"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-primary ring-2 ring-primary/20 dark:bg-blue-950/60">
              {user?.name ? user.name.charAt(0).toUpperCase() : "H"}
              <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="hidden text-left lg:block">
              <p className="text-xs leading-tight font-bold text-foreground">
                {user?.name || "HMS Super Admin"}
              </p>
              <p className="text-[10px] leading-tight font-extrabold tracking-wider text-muted-foreground/80 uppercase">
                {user?.role?.replace("_", " ") || "SUPER ADMIN"}
              </p>
            </div>
            <ChevronRight className="hidden h-3.5 w-3.5 rotate-90 text-muted-foreground lg:block" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
