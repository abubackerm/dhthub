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
  storageKey = "nextjs-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme

    try {
      const savedTheme = localStorage.getItem(storageKey) as Theme
      if (savedTheme && ["dark", "light", "system"].includes(savedTheme)) {
        return savedTheme
      }
      return defaultTheme
    } catch (error) {
      console.warn("Failed to read theme from localStorage:", error)
      return defaultTheme
    }
  })

  const resolvedTheme = React.useMemo(() => {
    return getResolvedTheme(theme)
  }, [theme])

  // Only update the class when the resolved theme actually changes after
  // initial mount. The inline <script> in <head> already set the correct
  // class before paint, so we skip the first run to avoid a flash.
  const isFirstRender = React.useRef(true)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (isFirstRender.current) {
      isFirstRender.current = false
      const root = window.document.documentElement
      if (root.classList.contains(resolvedTheme)) return
    }
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

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
