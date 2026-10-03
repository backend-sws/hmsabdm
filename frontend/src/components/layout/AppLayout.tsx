import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Outlet } from "react-router"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { AppHeader } from "./AppHeader"
import { AppSidebar } from "./AppSidebar"

export const AppLayout: React.FC = () => {
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50/60 text-foreground antialiased dark:bg-background">
      {/* App Top Header Component */}
      <AppHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        setIsSearchOpen={setIsSearchOpen}
      />

      {/* Main Container */}
      <div className="flex h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
        {/* App Sidebar Component */}
        <AppSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isCollapsed={isCollapsed}
        />

        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-16 z-20 bg-background/80 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Quick Search Modal / Overlay */}
        {isSearchOpen &&
          createPortal(
            <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-background/80 px-4 pt-20 backdrop-blur-sm">
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Route Outlet Main Area with Tech Mesh Pattern Overlay */}
        <main className="custom-scrollbar relative min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Background Medical Doodle Line-Art Pattern Overlay */}
          <div
            className="pointer-events-none absolute inset-0 bg-[length:380px_380px] bg-top bg-repeat opacity-[0.05] mix-blend-multiply transition-opacity duration-300 dark:opacity-[0.08] dark:invert"
            style={{ backgroundImage: "url('/medical_pattern.png')" }}
          />

          <div className="relative z-10 w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
