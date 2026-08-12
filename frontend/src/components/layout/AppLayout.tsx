import React, { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  ChevronRight,
  Sparkles,
} from "lucide-react"

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)

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

  const navItems = [
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
  ]

  const userRole = user?.role || "DOCTOR"
  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole))

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-foreground">HMS ABDM</span>
                  <Badge variant="success" className="text-[10px] px-1.5 py-0">
                    M1 & M2 Live
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Healthcare Management System</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border/50">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="font-medium text-foreground">ABHA Network</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                CONNECTED
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
              )}
            </Button>

            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-3 pl-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs ring-2 ring-primary/20">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-foreground leading-tight">{user?.name || "Dr. User"}</p>
                <p className="text-[10px] text-muted-foreground leading-tight font-medium">
                  {user?.role?.replace("_", " ") || "Medical Officer"}
                  {user?.hospitalName ? ` • ${user.hospitalName}` : ""}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body with Responsive Sidebar */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Sidebar Navigation */}
        <aside
          className={`
            fixed inset-y-16 left-0 z-30 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out
            lg:static lg:translate-x-0 lg:z-auto
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="p-4 space-y-6">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase px-3 mb-2">
                Main Navigation
              </p>
              <nav className="space-y-1">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      end={item.path === "/"}
                      className={({ isActive }) => `
                        group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all
                        ${
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span>{item.title}</span>
                      </div>
                      {item.badge ? (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary-foreground/20 text-current">
                          {item.badge}
                        </span>
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </NavLink>
                  )
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3.5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> ABDM Milestone 1 & 2
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Compliant with NHA Sandbox M1 ABHA creation, verification, and M2 Health Records linking.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Backdrop for Mobile Sidebar */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-background/80 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Route Viewport Outlet */}
        <main className="flex-1 p-4 sm:p-6 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
