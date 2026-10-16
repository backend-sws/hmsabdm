import React, { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { NavLink, useNavigate } from "react-router"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"
import {
  LayoutDashboard,
  UserPlus,
  CalendarClock,
  Stethoscope,
  Building2,
  Building,
  ClipboardList,
  Settings,
  ShieldCheck,
  Bed,
  Ambulance,
  Receipt,
  FlaskConical,
  Pill,
  Scissors,
  LogOut,
} from "lucide-react"

interface PortalTooltipProps {
  text: string
  children: React.ReactElement<any>
  visible?: boolean
}

function PortalTooltip({ text, children, visible }: PortalTooltipProps) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLElement>(null)
  const { colorConfig } = useTheme()

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      })
      setShow(true)
    }
    if ((children.props as any).onMouseEnter) {
      ;(children.props as any).onMouseEnter(e)
    }
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    setShow(false)
    if ((children.props as any).onMouseLeave) {
      ;(children.props as any).onMouseLeave(e)
    }
  }

  const child = React.cloneElement(children, {
    ref,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  })

  return (
    <>
      {child}
      {show &&
        visible &&
        createPortal(
          <div
            className={`fixed z-[99999] px-3.5 py-1.5 bg-gradient-to-r ${colorConfig.gradient} text-white text-[11px] font-black uppercase tracking-widest rounded-md -translate-y-1/2 shadow-xl ${colorConfig.glow} flex items-center whitespace-nowrap border border-white/20 animate-in fade-in zoom-in-95 duration-150 pointer-events-none`}
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-purple-600 rotate-45 rounded-xs border-l border-b border-white/20" />
            {text}
          </div>,
          document.body
        )}
    </>
  )
}

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
  const { user, logout } = useAuth()
  const { theme, colorConfig } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    setSidebarOpen(false)
    await logout()
    navigate("/login")
  }

  const superAdminNavItems = [
    {
      title: "PLATFORM OVERVIEW",
      path: "/",
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "HOSPITAL FACILITIES",
      path: "/hospitals",
      icon: Building,
      roles: ["SUPER_ADMIN"],
    },
  ]

  const clinicalNavItems = [
    {
      title: "DASHBOARD",
      path: "/",
      icon: LayoutDashboard,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"],
    },
    {
      title: "RECEPTION & WALK-IN",
      path: "/reception",
      icon: ClipboardList,
      roles: ["HOSPITAL_ADMIN", "RECEPTIONIST"],
    },
    {
      title: "PATIENT REGISTRATION",
      path: "/patients",
      icon: UserPlus,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"],
    },
    {
      title: "OPD CLINICAL DESK",
      path: "/opd",
      icon: Stethoscope,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"],
    },
    {
      title: "IPD INPATIENT DESK",
      path: "/ipd",
      icon: Bed,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"],
    },
    {
      title: "OT & SURGERIES",
      path: "/ot",
      icon: Scissors,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"],
    },
    {
      title: "EMERGENCY & CASUALTY",
      path: "/emergency",
      icon: Ambulance,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"],
    },
    {
      title: "LABORATORY DESK",
      path: "/lab",
      icon: FlaskConical,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "LAB_TECHNICIAN", "PATHOLOGIST", "RECEPTIONIST"],
    },
    {
      title: "PHARMACY & POS",
      path: "/pharmacy",
      icon: Pill,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "PHARMACIST", "RECEPTIONIST"],
    },
    {
      title: "BILLING & FINANCE",
      path: "/billing",
      icon: Receipt,
      roles: ["HOSPITAL_ADMIN", "RECEPTIONIST"],
    },
    {
      title: "INSURANCE & TPA",
      path: "/insurance",
      icon: ShieldCheck,
      roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"],
    },
  ]

  const managementNavItems = [
    {
      title: "DOCTORS & SCHEDULES",
      path: "/doctors",
      icon: CalendarClock,
      roles: ["HOSPITAL_ADMIN"],
    },
    {
      title: "DEPARTMENTS",
      path: "/departments",
      icon: Building2,
      roles: ["HOSPITAL_ADMIN"],
    },
    {
      title: "HOSPITAL SETTINGS",
      path: "/settings",
      icon: Settings,
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
  const isSemiDark = theme === "semi-dark"

  return (
    <aside
      className={`fixed top-14 bottom-0 left-0 z-40 flex h-[calc(100vh-3.5rem)] shrink-0 flex-col justify-between border-r border-border/80 bg-card text-foreground transition-all duration-200 ease-in-out lg:relative lg:top-0 lg:z-40 lg:translate-x-0 ${
        isSemiDark ? "dark bg-[#09090b] text-white border-white/5" : ""
      } ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } ${isCollapsed ? "w-[72px] lg:w-[72px]" : "w-60 lg:w-60"} shadow-2xs select-none`}
    >
      {/* ─── Navigation Body with increased vertical spacing and slightly larger font ─── */}
      <nav className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6">
        {isSuperAdmin ? (
          <div>
            {!isCollapsed ? (
              <div className="flex items-center gap-2 mb-2 px-2">
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase whitespace-nowrap">
                  PLATFORM ADMIN
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
              </div>
            ) : (
              <div className="w-6 h-px bg-slate-200 dark:bg-white/10 mx-auto mb-2" />
            )}

            <div className="space-y-1.5">
              {superAdminNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <PortalTooltip key={item.path} text={item.title} visible={isCollapsed}>
                    <NavLink
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      end={item.path === "/"}
                      className={({ isActive }) =>
                        `relative flex items-center text-[11.5px] font-semibold tracking-[0.02em] transition-all duration-200 group overflow-hidden ${
                          isCollapsed
                            ? "justify-center w-10 h-10 mx-auto rounded-xl"
                            : "py-2.5 px-3 rounded-xl gap-2.5"
                        } ${
                          isActive
                            ? `bg-gradient-to-r ${colorConfig.gradient} text-white shadow-md ${colorConfig.shadow}`
                            : "text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Active left bar indicator - only in expanded mode */}
                          {isActive && !isCollapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white/60" />
                          )}

                          {/* Hover shimmer */}
                          {!isActive && (
                            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-purple-500/5 to-transparent rounded-xl" />
                          )}

                          <Icon
                            strokeWidth={isActive ? 2.5 : 1.75}
                            className={`flex-shrink-0 h-4 w-4 transition-all duration-200 relative z-10 ${
                              isCollapsed ? "mx-auto" : ""
                            } ${
                              isActive
                                ? "text-white drop-shadow-xs"
                                : "text-slate-500 dark:text-slate-400 group-hover:text-foreground group-hover:scale-105"
                            }`}
                          />

                          {!isCollapsed && (
                            <span
                              className={`whitespace-nowrap truncate relative z-10 transition-all duration-200 ${
                                isActive ? "text-white font-bold" : "group-hover:translate-x-0.5"
                              }`}
                            >
                              {item.title}
                            </span>
                          )}

                          {/* Active dot badge in collapsed mode */}
                          {isActive && isCollapsed && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white border-2 border-purple-500" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </PortalTooltip>
                )
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Clinical Workflows Section */}
            {filteredClinical.length > 0 && (
              <div>
                {!isCollapsed ? (
                  <div className="flex items-center gap-2 mb-2.5 px-2">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase whitespace-nowrap">
                      CLINICAL WORKFLOWS
                    </span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                  </div>
                ) : (
                  <div className="w-6 h-px bg-slate-200 dark:bg-white/10 mx-auto mb-2" />
                )}

                <div className="space-y-1.5">
                  {filteredClinical.map((item) => {
                    const Icon = item.icon
                    return (
                      <PortalTooltip key={item.path} text={item.title} visible={isCollapsed}>
                        <NavLink
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          end={item.path === "/"}
                          className={({ isActive }) =>
                            `relative flex items-center text-[11.5px] font-semibold tracking-[0.02em] transition-all duration-200 group overflow-hidden ${
                              isCollapsed
                                ? "justify-center w-10 h-10 mx-auto rounded-xl"
                                : "py-2.5 px-3 rounded-xl gap-2.5"
                            } ${
                              isActive
                                ? `bg-gradient-to-r ${colorConfig.gradient} text-white shadow-md ${colorConfig.shadow}`
                                : "text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {/* Active left bar indicator - only in expanded mode */}
                              {isActive && !isCollapsed && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white/60" />
                              )}

                              {/* Hover shimmer */}
                              {!isActive && (
                                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-purple-500/5 to-transparent rounded-xl" />
                              )}

                              <Icon
                                strokeWidth={isActive ? 2.5 : 1.75}
                                className={`flex-shrink-0 h-4 w-4 transition-all duration-200 relative z-10 ${
                                  isCollapsed ? "mx-auto" : ""
                                } ${
                                  isActive
                                    ? "text-white drop-shadow-xs"
                                    : "text-slate-500 dark:text-slate-400 group-hover:text-foreground group-hover:scale-105"
                                }`}
                              />

                              {!isCollapsed && (
                                <span
                                  className={`whitespace-nowrap truncate relative z-10 transition-all duration-200 ${
                                    isActive ? "text-white font-bold" : "group-hover:translate-x-0.5"
                                  }`}
                                >
                                  {item.title}
                                </span>
                              )}

                              {/* Active dot badge in collapsed mode */}
                              {isActive && isCollapsed && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white border-2 border-purple-500" />
                              )}
                            </>
                          )}
                        </NavLink>
                      </PortalTooltip>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Hospital Management Section */}
            {filteredManagement.length > 0 && (
              <div>
                {!isCollapsed ? (
                  <div className="flex items-center gap-2 mb-2.5 px-2 pt-2">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase whitespace-nowrap">
                      HOSPITAL SETUP
                    </span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                  </div>
                ) : (
                  <div className="w-6 h-px bg-slate-200 dark:bg-white/10 mx-auto mb-2 mt-2" />
                )}

                <div className="space-y-1.5">
                  {filteredManagement.map((item) => {
                    const Icon = item.icon
                    return (
                      <PortalTooltip key={item.path} text={item.title} visible={isCollapsed}>
                        <NavLink
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) =>
                            `relative flex items-center text-[11.5px] font-semibold tracking-[0.02em] transition-all duration-200 group overflow-hidden ${
                              isCollapsed
                                ? "justify-center w-10 h-10 mx-auto rounded-xl"
                                : "py-2.5 px-3 rounded-xl gap-2.5"
                            } ${
                              isActive
                                ? `bg-gradient-to-r ${colorConfig.gradient} text-white shadow-md ${colorConfig.shadow}`
                                : "text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {/* Active left bar indicator - only in expanded mode */}
                              {isActive && !isCollapsed && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white/60" />
                              )}

                              {/* Hover shimmer */}
                              {!isActive && (
                                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-purple-500/5 to-transparent rounded-xl" />
                              )}

                              <Icon
                                strokeWidth={isActive ? 2.5 : 1.75}
                                className={`flex-shrink-0 h-4 w-4 transition-all duration-200 relative z-10 ${
                                  isCollapsed ? "mx-auto" : ""
                                } ${
                                  isActive
                                    ? "text-white drop-shadow-xs"
                                    : "text-slate-500 dark:text-slate-400 group-hover:text-foreground group-hover:scale-105"
                                }`}
                              />

                              {!isCollapsed && (
                                <span
                                  className={`whitespace-nowrap truncate relative z-10 transition-all duration-200 ${
                                    isActive ? "text-white font-bold" : "group-hover:translate-x-0.5"
                                  }`}
                                >
                                  {item.title}
                                </span>
                              )}

                              {/* Active dot badge in collapsed mode */}
                              {isActive && isCollapsed && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white border-2 border-purple-500" />
                              )}
                            </>
                          )}
                        </NavLink>
                      </PortalTooltip>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </nav>

      {/* ─── Bottom Section: Clean Red "LOG OUT" Button matching hotel reference ─── */}
      <div className="px-3 pb-3.5 pt-2.5 border-t border-slate-100 dark:border-white/5 shrink-0">
        <PortalTooltip text="LOG OUT" visible={isCollapsed}>
          <button
            type="button"
            onClick={handleLogout}
            className={`relative flex items-center w-full text-[11.5px] font-semibold tracking-wide transition-all duration-200 group overflow-hidden text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl cursor-pointer ${
              isCollapsed ? "justify-center w-10 h-10 mx-auto" : "py-2.5 px-3"
            }`}
          >
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-rose-500/5 to-transparent rounded-xl" />
            <LogOut
              strokeWidth={1.75}
              className={`flex-shrink-0 h-4 w-4 transition-all duration-200 group-hover:scale-110 group-hover:-translate-x-0.5 relative z-10 ${
                isCollapsed ? "mx-auto" : "mr-2.5"
              }`}
            />
            {!isCollapsed && (
              <span className="whitespace-nowrap relative z-10 group-hover:translate-x-0.5 transition-transform duration-200 font-bold">
                LOG OUT
              </span>
            )}
          </button>
        </PortalTooltip>
      </div>
    </aside>
  )
}
