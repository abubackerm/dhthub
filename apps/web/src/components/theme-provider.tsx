"use client"

import * as React from "react"
import { ThemeProviderContext } from "@/contexts/theme-context"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

function getResolvedTheme(theme: Theme): "dark" | "light" {
  if (theme === "system") {
    if (typeof window === "undefined") return "light"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }
  return theme
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(
    () => (typeof window !== "undefined" && localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  const [mounted, setMounted] = React.useState(false)

  // Only set mounted to true after the first client render
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const resolvedTheme = mounted ? getResolvedTheme(theme) : "light"

  // Apply resolved theme class to documentElement so theme customizer inline styles apply correctly in dark mode
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  // Listen for system theme changes when theme is "system"
  React.useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => setTheme("system")
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, newTheme)
      }
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
