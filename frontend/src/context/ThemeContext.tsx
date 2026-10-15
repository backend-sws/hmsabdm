import React, { createContext, useContext, useEffect, useState } from "react"

export type LayoutTheme = "light" | "semi-dark" | "dark"
export type PrimaryColor = "blue" | "teal" | "purple" | "green" | "orange" | "red"
export type FontFamily = "lato" | "rubik" | "inter" | "cinzel" | "poppins" | "montserrat" | "roboto" | "nunito"

export interface ColorSchemeConfig {
  name: string
  value: PrimaryColor
  textColor: string
  activeBorder: string
  bgLight: string
  gradient: string
  shadow: string
  glow: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  cssPrimary: string
  cssPrimaryDark: string
}

export const COLOR_CONFIGS: Record<PrimaryColor, ColorSchemeConfig> = {
  blue: {
    name: "Blue",
    value: "blue",
    textColor: "text-blue-500",
    activeBorder: "border-blue-500",
    bgLight: "bg-blue-50/30 dark:bg-blue-500/10",
    gradient: "from-blue-600 to-indigo-600",
    shadow: "shadow-blue-500/25",
    glow: "shadow-blue-500/30",
    badgeBg: "bg-blue-50/80 dark:bg-blue-950/40",
    badgeText: "text-blue-700 dark:text-blue-300",
    badgeBorder: "border-blue-400/50 dark:border-blue-700/60",
    cssPrimary: "oklch(0.55 0.22 250)",
    cssPrimaryDark: "oklch(0.62 0.22 250)",
  },
  teal: {
    name: "Teal",
    value: "teal",
    textColor: "text-teal-500 dark:text-teal-400",
    activeBorder: "border-teal-500",
    bgLight: "bg-teal-50/30 dark:bg-teal-500/10",
    gradient: "from-teal-600 to-emerald-600",
    shadow: "shadow-teal-500/25",
    glow: "shadow-teal-500/30",
    badgeBg: "bg-teal-50/80 dark:bg-teal-950/40",
    badgeText: "text-teal-700 dark:text-teal-300",
    badgeBorder: "border-teal-400/50 dark:border-teal-700/60",
    cssPrimary: "oklch(0.55 0.16 180)",
    cssPrimaryDark: "oklch(0.65 0.16 180)",
  },
  purple: {
    name: "Purple",
    value: "purple",
    textColor: "text-purple-500",
    activeBorder: "border-purple-500",
    bgLight: "bg-purple-50/30 dark:bg-purple-500/10",
    gradient: "from-purple-600 via-purple-600 to-indigo-600",
    shadow: "shadow-purple-500/25",
    glow: "shadow-purple-500/30",
    badgeBg: "bg-purple-50/80 dark:bg-purple-950/40",
    badgeText: "text-purple-700 dark:text-purple-300",
    badgeBorder: "border-purple-400/50 dark:border-purple-700/60",
    cssPrimary: "oklch(0.48 0.22 258)",
    cssPrimaryDark: "oklch(0.56 0.22 258)",
  },
  green: {
    name: "Green",
    value: "green",
    textColor: "text-emerald-500",
    activeBorder: "border-emerald-500",
    bgLight: "bg-emerald-50/30 dark:bg-emerald-500/10",
    gradient: "from-emerald-600 to-teal-600",
    shadow: "shadow-emerald-500/25",
    glow: "shadow-emerald-500/30",
    badgeBg: "bg-emerald-50/80 dark:bg-emerald-950/40",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    badgeBorder: "border-emerald-400/50 dark:border-emerald-700/60",
    cssPrimary: "oklch(0.55 0.2 145)",
    cssPrimaryDark: "oklch(0.63 0.2 145)",
  },
  orange: {
    name: "Orange",
    value: "orange",
    textColor: "text-orange-500",
    activeBorder: "border-orange-500",
    bgLight: "bg-orange-50/30 dark:bg-orange-500/10",
    gradient: "from-orange-600 to-amber-600",
    shadow: "shadow-orange-500/25",
    glow: "shadow-orange-500/30",
    badgeBg: "bg-orange-50/80 dark:bg-orange-950/40",
    badgeText: "text-orange-700 dark:text-orange-300",
    badgeBorder: "border-orange-400/50 dark:border-orange-700/60",
    cssPrimary: "oklch(0.58 0.2 45)",
    cssPrimaryDark: "oklch(0.66 0.2 45)",
  },
  red: {
    name: "Red",
    value: "red",
    textColor: "text-red-500",
    activeBorder: "border-red-500",
    bgLight: "bg-red-50/30 dark:bg-red-500/10",
    gradient: "from-red-600 to-rose-600",
    shadow: "shadow-red-500/25",
    glow: "shadow-red-500/30",
    badgeBg: "bg-red-50/80 dark:bg-red-950/40",
    badgeText: "text-red-700 dark:text-red-300",
    badgeBorder: "border-red-400/50 dark:border-red-700/60",
    cssPrimary: "oklch(0.55 0.22 25)",
    cssPrimaryDark: "oklch(0.62 0.22 25)",
  },
}

export const FONT_MAP: Record<FontFamily, string> = {
  lato: "'Lato', sans-serif",
  rubik: "'Rubik', sans-serif",
  inter: "'Inter', 'Inter Variable', sans-serif",
  cinzel: "'Cinzel', serif",
  poppins: "'Poppins', sans-serif",
  montserrat: "'Montserrat', sans-serif",
  roboto: "'Roboto', sans-serif",
  nunito: "'Nunito', sans-serif",
}

interface ThemeContextType {
  theme: LayoutTheme
  setTheme: (theme: LayoutTheme) => void
  toggleTheme: () => void
  primaryColor: PrimaryColor
  setPrimaryColor: (color: PrimaryColor) => void
  fontFamily: FontFamily
  setFontFamily: (font: FontFamily) => void
  colorConfig: ColorSchemeConfig
}

const STORAGE_KEY = "hms-theme-customizer-v2"

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<LayoutTheme>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-theme`)
      if (saved === "light" || saved === "semi-dark" || saved === "dark") {
        return saved
      }
    } catch {
      // ignore
    }
    return document.documentElement.classList.contains("dark") ? "dark" : "light"
  })

  const [primaryColor, setPrimaryColorState] = useState<PrimaryColor>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-color`)
      if (saved && saved in COLOR_CONFIGS) {
        return saved as PrimaryColor
      }
    } catch {
      // ignore
    }
    return "purple"
  })

  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-font`)
      if (saved && saved in FONT_MAP) {
        return saved as FontFamily
      }
    } catch {
      // ignore
    }
    return "inter"
  })

  const setTheme = (newTheme: LayoutTheme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(`${STORAGE_KEY}-theme`, newTheme)
    } catch {
      // ignore
    }
  }

  const toggleTheme = () => {
    const next: LayoutTheme = theme === "dark" || theme === "semi-dark" ? "light" : "dark"
    setTheme(next)
  }

  const setPrimaryColor = (color: PrimaryColor) => {
    setPrimaryColorState(color)
    try {
      localStorage.setItem(`${STORAGE_KEY}-color`, color)
    } catch {
      // ignore
    }
  }

  const setFontFamily = (font: FontFamily) => {
    setFontFamilyState(font)
    try {
      localStorage.setItem(`${STORAGE_KEY}-font`, font)
    } catch {
      // ignore
    }
  }

  // Effect: Sync HTML classes for layout theme
  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
      root.classList.remove("semi-dark")
    } else if (theme === "semi-dark") {
      root.classList.remove("dark")
      root.classList.add("semi-dark")
    } else {
      root.classList.remove("dark")
      root.classList.remove("semi-dark")
    }
  }, [theme])

  // Effect: Update primary color CSS variables
  useEffect(() => {
    const root = document.documentElement
    const config = COLOR_CONFIGS[primaryColor]
    if (config) {
      root.style.setProperty("--primary", theme === "dark" ? config.cssPrimaryDark : config.cssPrimary)
      root.style.setProperty("--ring", theme === "dark" ? config.cssPrimaryDark : config.cssPrimary)
      root.style.setProperty("--sidebar-primary", theme === "dark" ? config.cssPrimaryDark : config.cssPrimary)
    }
  }, [primaryColor, theme])

  // Effect: Update font family variable and document body font
  useEffect(() => {
    const fontStr = FONT_MAP[fontFamily]
    if (fontStr) {
      document.documentElement.style.setProperty("--font-sans", fontStr)
      document.body.style.fontFamily = fontStr
    }
  }, [fontFamily])

  const colorConfig = COLOR_CONFIGS[primaryColor] || COLOR_CONFIGS.purple

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        primaryColor,
        setPrimaryColor,
        fontFamily,
        setFontFamily,
        colorConfig,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    return {
      theme: "light" as LayoutTheme,
      setTheme: () => {},
      toggleTheme: () => {},
      primaryColor: "purple" as PrimaryColor,
      setPrimaryColor: () => {},
      fontFamily: "inter" as FontFamily,
      setFontFamily: () => {},
      colorConfig: COLOR_CONFIGS.purple,
    }
  }
  return context
}

