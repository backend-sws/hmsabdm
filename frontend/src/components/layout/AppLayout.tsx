import React, { useState, useEffect } from "react"
import { NavLink, Outlet, useNavigate } from "react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Activity,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  LayoutDashboard,
  Users,
  UserCheck,
  Stethoscope,
  Building2,
  Building,
  QrCode,
  Menu,
  X,
  Sparkles,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from "lucide-react"

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains("dark")
  })
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)

  // Listen for Cmd+K or Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      return next
    })
  }

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  const clinicalNavItems = [
    {
      title: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"],
    },
    {
      title: "Reception & Walk-in",
      path: "/reception",
      icon: QrCode,
      roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST"],
      badge: "Scan & Share",
    },
    {
      title: "ABHA Patients",
      path: "/patients",
      icon: Users,
      roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"],
    },
    {
      title: "OPD Doctor Desk",
      path: "/opd",
      icon: Stethoscope,
      roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"],
      badge: "Live Queue",
    },
  ]

  const managementNavItems = [
    {
      title: "Doctors & Schedules",
      path: "/doctors",
      icon: UserCheck,
      roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN"],
    },
    {
      title: "Departments",
      path: "/departments",
      icon: Building2,
      roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN"],
    },
    {
      title: "Super Admin Hospitals",
      path: "/hospitals",
      icon: Building,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Reports & Analytics",
      path: "/reports",
      icon: Activity,
      roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN"],
    },
    {
      title: "System Settings",
      path: "/settings",
      icon: Sparkles,
      roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN"],
      hasSubmenu: true,
    },
  ]

  const userRole = user?.role || "SUPER_ADMIN"
  const filteredClinical = clinicalNavItems.filter((i) =>
    i.roles.includes(userRole)
  )
  const filteredManagement = managementNavItems.filter((i) =>
    i.roles.includes(userRole)
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50/60 text-foreground antialiased dark:bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 h-16 w-full shrink-0 border-b border-border/70 bg-card/95 shadow-2xs backdrop-blur-md transition-colors">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Left Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted focus:outline-none lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
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

      {/* Main Container */}
      <div className="flex h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed top-16 bottom-0 left-0 z-30 flex h-[calc(100vh-4rem)] shrink-0 flex-col justify-between border-r border-border/80 bg-card transition-all duration-300 ease-in-out lg:relative lg:top-0 lg:z-auto lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "lg:w-20" : "lg:w-64"} w-64`}
        >
          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-3.5">
            {/* Clinical Section */}
            <div>
              {!isCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                  Clinical Workflows
                </p>
              )}
              <nav className="space-y-1">
                {filteredClinical.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      end={item.path === "/"}
                      title={isCollapsed ? item.title : undefined}
                      className={({ isActive }) =>
                        `group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
                          isActive
                            ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        } ${isCollapsed ? "justify-center px-0" : ""} `
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                        {!isCollapsed && (
                          <span className="truncate">{item.title}</span>
                        )}
                      </div>
                      {!isCollapsed &&
                        (item.badge ? (
                          <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[9px] font-bold text-current">
                            {item.badge}
                          </span>
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                        ))}
                    </NavLink>
                  )
                })}
              </nav>
            </div>

            {/* Management Section */}
            {filteredManagement.length > 0 && (
              <div>
                {!isCollapsed && (
                  <p className="mb-2 px-3 text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                    Management & System
                  </p>
                )}
                <nav className="space-y-1">
                  {filteredManagement.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        title={isCollapsed ? item.title : undefined}
                        className={({ isActive }) =>
                          `group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
                            isActive
                              ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                          } ${isCollapsed ? "justify-center px-0" : ""} `
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                          {!isCollapsed && (
                            <span className="truncate">{item.title}</span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </NavLink>
                    )
                  })}
                </nav>
              </div>
            )}
          </div>

          {/* Bottom Card / ABDM Milestone Badge */}
        </aside>

        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-background/80 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Quick Search Modal / Overlay */}
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-4 pt-20 backdrop-blur-sm">
            <div className="w-full max-w-lg animate-in space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xl zoom-in-95 fade-in">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Search className="h-4 w-4" /> Global ABDM Quick Search
                </div>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="text"
                autoFocus
                placeholder="Type patient name, ABHA number (e.g. 91-xxxx), mobile, or OPD token..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                <span>
                  Press{" "}
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">
                    ESC
                  </kbd>{" "}
                  to close
                </span>
                <Button size="sm" onClick={() => setIsSearchOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Route Outlet */}
        <main className="custom-scrollbar min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
