import React from "react"
import { useNavigate, useLocation } from "react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Activity,
  Sun,
  Moon,
  LogOut,
  QrCode,
  Menu,
  X,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Building,
  Settings,
  Maximize2,
  Minimize2,
  HelpCircle,
  LayoutDashboard,
  Users,
  UserCheck,
  Stethoscope,
  Building2,
  Sparkles,
  ShieldCheck,
  Bed,
  Siren,
  Receipt,
  FlaskConical,
  Pill,
  Scissors,
  Keyboard,
} from "lucide-react"

import { useBranding } from "@/context/BrandingContext"
import { useTheme } from "@/context/ThemeContext"
import { ThemeCustomizer } from "./ThemeCustomizer"

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
  const { brandName, brandTagline, brandLogo } = useBranding()
  const { theme, colorConfig } = useTheme()
  const isSemiDark = theme === "semi-dark"
  const navigate = useNavigate()
  const location = useLocation()

  const [isProfileOpen, setIsProfileOpen] = React.useState(false)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [timeStr, setTimeStr] = React.useState("")
  const profileDropdownRef = React.useRef<HTMLDivElement>(null)

  // Live dynamic second-by-second clock matching reference
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const datePart = new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(now)
      const timePart = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now)
      setTimeStr(`${datePart}  •  ${timePart}`)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  React.useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsProfileOpen(false)
    await logout()
    navigate("/login")
  }

  // Active module detection for the purple pill badge (matching reference header)
  const getModuleInfo = (path: string) => {
    if (path === "/" || path === "") return { label: "DASHBOARD", icon: LayoutDashboard }
    if (path.startsWith("/reception")) return { label: "RECEPTION & TOKENS", icon: QrCode }
    if (path.startsWith("/patients")) return { label: "PATIENT REGISTRATION", icon: Users }
    if (path.startsWith("/opd")) return { label: "OPD CLINICAL DESK", icon: Stethoscope }
    if (path.startsWith("/ipd")) return { label: "IPD INPATIENT DESK", icon: Bed }
    if (path.startsWith("/ot")) return { label: "OT & SURGERIES", icon: Scissors }
    if (path.startsWith("/emergency")) return { label: "EMERGENCY & CASUALTY", icon: Siren }
    if (path.startsWith("/lab")) return { label: "LABORATORY DESK", icon: FlaskConical }
    if (path.startsWith("/pharmacy")) return { label: "PHARMACY & POS", icon: Pill }
    if (path.startsWith("/billing")) return { label: "BILLING & FINANCE", icon: Receipt }
    if (path.startsWith("/insurance")) return { label: "INSURANCE & TPA", icon: ShieldCheck }
    if (path.startsWith("/doctors")) return { label: "DOCTORS & SCHEDULES", icon: UserCheck }
    if (path.startsWith("/departments")) return { label: "DEPARTMENTS", icon: Building2 }
    if (path.startsWith("/settings")) return { label: "HOSPITAL SETTINGS", icon: Sparkles }
    if (path.startsWith("/hospitals")) return { label: "HOSPITAL FACILITIES", icon: Building }
    return { label: "HOSPITAL PORTAL", icon: Activity }
  }

  const currentModule = getModuleInfo(location.pathname)
  const ModuleIcon = currentModule.icon

  // Initials for avatar circle (matching "[ RS ]" in reference)
  const getInitials = (name?: string) => {
    if (!name) return "DA"
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  return (
    <header className={`sticky top-0 z-50 h-14 w-full shrink-0 border-b border-border/80 bg-background/95 backdrop-blur-md shadow-2xs transition-colors ${
      isSemiDark ? "dark bg-[#09090b] text-white border-white/5" : "dark:bg-card/95"
    }`}>
      <div className="flex h-14 items-center justify-between px-3 sm:px-4">
        {/* ─── Left Section: Brand Logo, Hamburger Toggle & Active Route Badge ─── */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted focus:outline-none lg:hidden"
            aria-label="Toggle navigation menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Hospital Brand Logo & Name */}
          <div
            onClick={() => navigate("/")}
            className={`group flex cursor-pointer items-center select-none transition-all ${
              isCollapsed ? "gap-0" : "gap-2.5"
            }`}
            title={isCollapsed ? brandName : undefined}
          >
            {brandLogo ? (
              <img
                src={brandLogo}
                alt={brandName}
                className="h-8 w-8 object-contain rounded-lg border border-border/60 shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-2xs shrink-0 font-bold text-sm">
                <Activity className="h-4 w-4" />
              </div>
            )}

            {/* Brand text only shown when sidebar is NOT collapsed */}
            {!isCollapsed && (
              <div className="hidden sm:block min-w-0">
                <p className="text-sm font-bold tracking-tight text-foreground truncate max-w-52 leading-tight">
                  {brandName}
                </p>
                {brandTagline && (
                  <p className="text-[10px] leading-tight text-muted-foreground truncate max-w-52 font-medium">
                    {brandTagline}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Desktop Sidebar Toggle Switch */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="hidden rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>

          <div className="hidden md:block h-4 w-px bg-border/80" />

          {/* Active Module Pill Badge (matching reference header "[ 📋 ATTENDANCE ]") */}
          <div className={`hidden md:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-2xs ${colorConfig.badgeBorder} ${colorConfig.badgeBg} ${colorConfig.badgeText}`}>
            <ModuleIcon className="h-3.5 w-3.5" />
            <span>{currentModule.label}</span>
          </div>
        </div>

        {/* ─── Middle Global Search Trigger Bar ─── */}
        <div className="mx-3 hidden min-w-0 max-w-xs flex-1 lg:flex xl:max-w-sm">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex w-full min-w-0 items-center justify-between rounded-lg border border-border/80 bg-muted/40 hover:bg-muted/70 hover:border-purple-500/40 px-3 py-1.5 text-xs text-muted-foreground shadow-2xs transition-all duration-150"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
              <span className="truncate whitespace-nowrap font-medium text-muted-foreground/90">
                Search ABHA, Patient, Token, Doctor...
              </span>
            </span>
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border/80 bg-background/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-2xs xl:inline-flex">
              ⌘ K
            </kbd>
          </button>
        </div>

        {/* ─── Right Action Controls matching reference ─── */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Facility / Support Pill (matching reference "[ STARTUP WFR SUPPORT ]") */}
          <div className="hidden 2xl:flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-2xs">
            <Building className="h-3.5 w-3.5 text-primary" />
            <span>NABH & ABDM V2 LIVE</span>
          </div>

          {/* Dynamic Live Clock Pill (matching reference "[ Thu, Oct 15 • 04:15:26 PM ]") */}
          {timeStr && (
            <div className="hidden xl:flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-1 text-xs font-mono font-medium text-foreground shadow-2xs">
              <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${colorConfig.gradient} animate-pulse`} />
              <span>{timeStr}</span>
            </div>
          )}

          {/* Mobile/Tablet Search Button (< lg) */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsSearchOpen(true)}
            className="rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            title="Search records (⌘K)"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Fullscreen Toggle Button (matching reference) */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleFullscreen}
            className="hidden sm:flex rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* Dark Mode Toggle with bordered square matching reference screenshot */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="h-9 w-9 rounded-xl border border-border/80 bg-background dark:bg-card flex items-center justify-center text-amber-500 dark:text-amber-400 hover:bg-muted transition-all cursor-pointer shadow-2xs shrink-0"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? (
              <Sun className="h-4.5 w-4.5 text-amber-400" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-slate-700 dark:text-slate-200" />
            )}
          </button>

          {/* Keyboard Shortcuts Trigger Button with border matching reference screenshot */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="hidden sm:flex h-9 w-9 rounded-xl border border-border/80 bg-background dark:bg-card items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer shadow-2xs relative shrink-0"
            title="Keyboard Shortcuts Map (⌘K)"
          >
            <Keyboard className="h-4.5 w-4.5" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
            </span>
          </button>

          {/* Help / Guide Icon Button (matching reference) */}
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="hidden sm:flex h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Hospital System Help & Guide"
          >
            <HelpCircle className="h-4.5 w-4.5" />
          </button>

          {/* Theme Customizer Modal/Popover matching reference screenshot */}
          <ThemeCustomizer />

          <div className="hidden h-5 w-px bg-border/80 sm:block" />

          {/* Profile User Avatar Circle matching "[ RS ]" in reference */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs tracking-wider shadow-sm transition-all hover:ring-2 hover:ring-purple-500/40 select-none outline-none"
              title={`${user?.name || "User"} (${user?.role || "ADMIN"})`}
            >
              {getInitials(user?.name)}
            </button>

            {/* Profile Floating Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 origin-top-right rounded-xl border border-border/80 bg-card p-3 shadow-xl backdrop-blur-xl transition-all z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* User Info Header */}
                <div className="flex items-center gap-3 border-b border-border/60 pb-3 px-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold tracking-wider">
                    {getInitials(user?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {user?.name || "HMS User"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email || user?.username || "Logged in"}
                    </p>
                    <span className="mt-1 inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">
                      {user?.role?.replace("_", " ") || "USER"}
                    </span>
                  </div>
                </div>

                {/* Details / Facility info */}
                <div className="py-2.5 px-1 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Hospital Node:</span>
                    <span className="font-semibold text-foreground truncate max-w-40">{brandName}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Live Shift:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">General OPD</span>
                  </div>
                </div>

                {/* Dropdown Action Links */}
                <div className="border-t border-border/60 pt-2 space-y-1">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false)
                      navigate("/settings")
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Hospital Settings & Branding</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
