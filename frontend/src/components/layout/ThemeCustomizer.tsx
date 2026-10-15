import React, { useState, useRef, useEffect } from "react"
import { Palette, Sun, Moon, Monitor, Check, Paintbrush } from "lucide-react"
import { useTheme, FONT_MAP } from "@/context/ThemeContext"
import type { LayoutTheme, PrimaryColor, FontFamily } from "@/context/ThemeContext"

export function ThemeCustomizer() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { theme, setTheme, primaryColor, setPrimaryColor, fontFamily, setFontFamily } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isOpen])

  const layouts: { name: string; value: LayoutTheme; icon: React.FC<{ className?: string }> }[] = [
    { name: "Light Mode", value: "light", icon: Sun },
    { name: "Semi Dark", value: "semi-dark", icon: Monitor },
    { name: "Dark Mode", value: "dark", icon: Moon },
  ]

  const colors: { name: string; value: PrimaryColor; textColor: string }[] = [
    { name: "Blue", value: "blue", textColor: "text-blue-500 font-bold" },
    { name: "Teal", value: "teal", textColor: "text-teal-600 dark:text-teal-400 font-bold" },
    { name: "Purple", value: "purple", textColor: "text-purple-600 dark:text-purple-400 font-bold" },
    { name: "Green", value: "green", textColor: "text-emerald-600 dark:text-emerald-500 font-bold" },
    { name: "Orange", value: "orange", textColor: "text-orange-500 font-bold" },
    { name: "Red", value: "red", textColor: "text-red-500 font-bold" },
  ]

  const fonts: { name: string; value: FontFamily }[] = [
    { name: "Lato", value: "lato" },
    { name: "Rubik", value: "rubik" },
    { name: "Inter", value: "inter" },
    { name: "Cinzel", value: "cinzel" },
    { name: "Poppins", value: "poppins" },
    { name: "Montserrat", value: "montserrat" },
    { name: "Roboto", value: "roboto" },
    { name: "Nunito", value: "nunito" },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative h-9 w-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? "border-purple-500 bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 ring-2 ring-purple-500/30 scale-105"
            : "border-purple-200/80 dark:border-purple-800/80 bg-purple-50/90 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:border-purple-400 hover:scale-105"
        }`}
        title="Theme Customizer (Colors & Layout)"
        aria-label="Theme Customizer"
      >
        <Paintbrush className="h-4.5 w-4.5" />
        {/* Purple Active Dot Indicator matching reference */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-[-16px] sm:right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] sm:max-w-none bg-card border border-border/90 rounded-2xl shadow-2xl z-50 p-5 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 shrink-0">
            <h3 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center">
              <Palette className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
              THEME CUSTOMIZER
            </h3>
          </div>

          <div className="space-y-5 overflow-y-auto pr-1 flex-1 py-1 custom-scrollbar">
            {/* Layout Options */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                LAYOUT STYLE
              </label>
              <div className="grid grid-cols-3 gap-2">
                {layouts.map((l) => {
                  const Icon = l.icon
                  const isSelected = theme === l.value
                  return (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setTheme(l.value)}
                      className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all border cursor-pointer select-none ${
                        isSelected
                          ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm ring-1 ring-purple-500/20"
                          : "bg-slate-50/60 dark:bg-white/[0.02] border-border/80 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1.5 opacity-85" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">{l.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Colors Section */}
            <div className="relative border border-border/80 rounded-xl p-3.5 pt-5 bg-slate-50/40 dark:bg-white/[0.01]">
              <div className="absolute -top-2.5 left-4 bg-card px-2.5 py-0.5 border border-border/80 rounded-md text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground shadow-2xs">
                COLORS
              </div>
              <div className="grid grid-cols-3 gap-2">
                {colors.map((c) => {
                  const isSelected = primaryColor === c.value
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setPrimaryColor(c.value)}
                      className={`h-9 border text-center font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center cursor-pointer bg-card shadow-2xs select-none ${
                        isSelected
                          ? "border-purple-500 bg-purple-50/40 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20"
                          : "border-border/80 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {isSelected ? (
                        <Check className="h-4 w-4 text-purple-600 dark:text-purple-400 stroke-[2.5]" />
                      ) : (
                        <span className={c.textColor}>{c.name}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Typography Section */}
            <div className="relative border border-border/80 rounded-xl p-3.5 pt-5 bg-slate-50/40 dark:bg-white/[0.01]">
              <div className="absolute -top-2.5 left-4 bg-card px-2.5 py-0.5 border border-border/80 rounded-md text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground shadow-2xs">
                TYPOGRAPHY
              </div>
              <div className="grid grid-cols-2 gap-2">
                {fonts.map((f) => {
                  const isSelected = fontFamily === f.value
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFontFamily(f.value)}
                      className={`h-9 border text-center font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center cursor-pointer bg-card shadow-2xs select-none ${
                        isSelected
                          ? "border-purple-500 bg-purple-50/40 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20"
                          : "border-border/80 text-foreground/80 hover:border-slate-300 dark:hover:border-slate-700 hover:text-foreground"
                      }`}
                      style={{ fontFamily: FONT_MAP[f.value] }}
                    >
                      {isSelected ? (
                        <Check className="h-4 w-4 text-purple-600 dark:text-purple-400 stroke-[2.5]" />
                      ) : (
                        <span>{f.name}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
