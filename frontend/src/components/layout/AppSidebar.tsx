import React from "react"
import { NavLink } from "react-router"
import { useAuth } from "@/context/AuthContext"
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Stethoscope,
  Building2,
  Building,
  QrCode,
  Sparkles,
  ShieldCheck,
  Bed,
  Siren,
  Receipt,
} from "lucide-react"

interface AppSidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  isCollapsed: boolean
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  isCollapsed,
}) => {
  const { user } = useAuth()

  const superAdminNavItems = [
    {
      title: "Platform Overview",
      path: "/",
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Hospital Facilities",
      path: "/hospitals",
      icon: Building,
      roles: ["SUPER_ADMIN"],
      badge: "Onboard",
    },
  ]

  const clinicalNavItems = [
    {
      title: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"],
    },
    {
      title: "Reception & Walk-in",
      path: "/reception",
      icon: QrCode,
      roles: ["HOSPITAL_ADMIN", "RECEPTIONIST"],
    },
    {
      title: "Patient Registration",
      path: "/patients",
      icon: Users,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"],
    },
    {
      title: "OPD Doctor Desk",
      path: "/opd",
      icon: Stethoscope,
      roles: ["HOSPITAL_ADMIN", "DOCTOR"],
    },
    {
      title: "IPD Inpatient Desk",
      path: "/ipd",
      icon: Bed,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"],
    },
    {
      title: "Emergency & Casualty",
      path: "/emergency",
      icon: Siren,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"],
    },
    {
      title: "Billing & Finance",
      path: "/billing",
      icon: Receipt,
      roles: ["HOSPITAL_ADMIN", "RECEPTIONIST"],
    },
  ]

  const managementNavItems = [
    {
      title: "Doctors & Schedules",
      path: "/doctors",
      icon: UserCheck,
      roles: ["HOSPITAL_ADMIN"],
    },
    {
      title: "Departments",
      path: "/departments",
      icon: Building2,
      roles: ["HOSPITAL_ADMIN"],
    },
    {
      title: "Hospital Settings",
      path: "/settings",
      icon: Sparkles,
      roles: ["HOSPITAL_ADMIN"],
    },
  ]

  const normalizeRole = (r: string) => r.toUpperCase().replace(/[\s_-]+/g, "")
  const currentRole = normalizeRole(user?.role || user?.roles?.[0] || "HOSPITALADMIN")
  const isSuperAdmin = currentRole.includes("SUPER")

  const hasRole = (allowedRoles: string[]) => {
    return allowedRoles.some((r) => {
      const nr = normalizeRole(r)
      if (isSuperAdmin) {
        return nr === "SUPERADMIN"
      }
      return (
        nr === currentRole ||
        (nr === "HOSPITALADMIN" && (currentRole === "ADMIN" || currentRole === "HOSPITALADMIN")) ||
        (nr === "ADMIN" && (currentRole === "ADMIN" || currentRole === "HOSPITALADMIN"))
      )
    })
  }

  const filteredClinical = clinicalNavItems.filter((i) => hasRole(i.roles))
  const filteredManagement = managementNavItems.filter((i) => hasRole(i.roles))

  return (
    <aside
      className={`fixed top-16 bottom-0 left-0 z-30 flex h-[calc(100vh-4rem)] shrink-0 flex-col justify-between border-r border-border/80 bg-card/95 backdrop-blur-md transition-all duration-300 ease-in-out lg:relative lg:top-0 lg:z-auto lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } ${isCollapsed ? "lg:w-20" : "lg:w-64"} w-64 overflow-hidden`}
    >
      {/* Seamless Medical Line-Art Pattern Background Overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-top bg-repeat opacity-[0.04] mix-blend-multiply transition-opacity duration-300 dark:opacity-[0.12] dark:invert"
        style={{ backgroundImage: "url('/medical_pattern.png')" }}
      />

      {/* Cybernetic Accent Glow Lines */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Navigation Scrollable Body */}
      <div className="custom-scrollbar relative z-10 flex-1 space-y-6 overflow-y-auto p-3.5">
        {/* If Super Admin, show Platform Administration */}
        {isSuperAdmin ? (
          <div>
            {!isCollapsed && (
              <div className="mb-2.5 flex items-center justify-between px-3">
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                  Platform Administration
                </p>
                <span className="h-1 w-1 rounded-full bg-primary/60" />
              </div>
            )}
            <nav className="space-y-1">
              {superAdminNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    end={item.path === "/"}
                    title={isCollapsed ? item.title : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/25"
                          : "text-muted-foreground hover:bg-slate-100/80 hover:text-foreground dark:hover:bg-muted/60"
                      } ${isCollapsed ? "justify-center px-0" : ""}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                              isActive
                                ? "text-primary-foreground"
                                : "text-muted-foreground group-hover:text-primary"
                            }`}
                          />
                          {!isCollapsed && (
                            <span className="truncate">{item.title}</span>
                          )}
                        </div>
                        {!isCollapsed && item.badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              isActive
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        ) : (
          /* Otherwise show Hospital Workflows & Hospital Management */
          <>
            {filteredClinical.length > 0 && (
              <div>
                {!isCollapsed && (
                  <div className="mb-2.5 flex items-center justify-between px-3">
                    <p className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                      Clinical Workflows
                    </p>
                    <span className="h-1 w-1 rounded-full bg-primary/60" />
                  </div>
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
                          `group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/25"
                              : "text-muted-foreground hover:bg-slate-100/80 hover:text-foreground dark:hover:bg-muted/60"
                          } ${isCollapsed ? "justify-center px-0" : ""}`
                        }
                      >
                        {({ isActive }) => (
                          <div className="flex items-center gap-3">
                            <Icon
                              className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                isActive
                                  ? "text-primary-foreground"
                                  : "text-muted-foreground group-hover:text-primary"
                              }`}
                            />
                            {!isCollapsed && (
                              <span className="truncate">{item.title}</span>
                            )}
                          </div>
                        )}
                      </NavLink>
                    )
                  })}
                </nav>
              </div>
            )}

            {filteredManagement.length > 0 && (
              <div>
                {!isCollapsed && (
                  <div className="mb-2.5 flex items-center justify-between px-3">
                    <p className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                      Hospital Management
                    </p>
                    <span className="h-1 w-1 rounded-full bg-emerald-500/60" />
                  </div>
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
                          `group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/25"
                              : "text-muted-foreground hover:bg-slate-100/80 hover:text-foreground dark:hover:bg-muted/60"
                          } ${isCollapsed ? "justify-center px-0" : ""}`
                        }
                      >
                        {({ isActive }) => (
                          <div className="flex items-center gap-3">
                            <Icon
                              className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                isActive
                                  ? "text-primary-foreground"
                                  : "text-muted-foreground group-hover:text-primary"
                              }`}
                            />
                            {!isCollapsed && (
                              <span className="truncate">{item.title}</span>
                            )}
                          </div>
                        )}
                      </NavLink>
                    )
                  })}
                </nav>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom ABDM Health Node Card */}
      {!isCollapsed && (
        <div className="relative z-10 border-t border-border/60 p-3.5">
          <div className="group flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs shadow-2xs transition-all hover:bg-emerald-500/15">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <p className="truncate leading-tight font-semibold text-emerald-700 dark:text-emerald-300">
                  ABDM Verified Node
                </p>
              </div>
              <p className="truncate text-[10px] text-muted-foreground">
                M1, M2 & M3 Connected
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
