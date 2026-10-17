import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Outlet } from "react-router"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { AppHeader } from "./AppHeader"
import { AppSidebar } from "./AppSidebar"

export const AppLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)

  // Listen for Cmd+K / Ctrl+K (search) or Cmd+B / Ctrl+B (sidebar toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault()
        setIsCollapsed((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground antialiased selection:bg-purple-500 selection:text-white transition-colors duration-200">
      {/* App Top Header Component */}
      <AppHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        darkMode={theme === "dark"}
        toggleDarkMode={toggleTheme}
        setIsSearchOpen={setIsSearchOpen}
      />

      {/* Main Container */}
      <div className="flex h-[calc(100vh-3.5rem)] w-full flex-1 overflow-hidden">
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
            className="fixed inset-0 top-14 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Quick Search Modal / Overlay */}
        {isSearchOpen &&
          createPortal(
            <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 px-4 pt-20 backdrop-blur-sm">
              <div className="w-full max-w-lg animate-in space-y-4 rounded-xl border border-border/80 bg-card p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] zoom-in-95 fade-in">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <Search className="h-4 w-4" /> Global Quick Search
                  </div>
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
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
                  className="w-full rounded-lg border border-input/80 bg-background/90 px-3.5 py-2 text-sm shadow-2xs focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition-all"
                />
                <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <span className="font-medium">
                    Press{" "}
                    <kbd className="rounded-md border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-[10px] shadow-2xs">
                      ESC
                    </kbd>{" "}
                    to close
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Route Outlet Main Area */}
        <main className="custom-scrollbar relative w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-7">
          <div className="w-full min-w-0 max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
