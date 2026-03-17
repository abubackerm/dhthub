"use client"

import * as React from "react"
import { ThemeProviderContext } from "@/contexts/theme-context"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

function resolveTheme(theme: Theme): "dark" | "light" {
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
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    try {
      const saved = localStorage.getItem(storageKey) as Theme | null
      if (saved && ["dark", "light", "system"].includes(saved)) return saved
    } catch { /* noop */ }
    return defaultTheme
  })
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null)

  const wrapperRef = React.useCallback((node: HTMLDivElement | null) => {
    if (!node) { setPortalContainer(null); return }
    setPortalContainer(node)

    // On first mount, the wrapper div now has the correct class from React.
    // We can safely remove the pre-hydration hint and migrate CSS vars.
    // Using the ref callback guarantees the DOM node exists and has the
    // React-applied className before we touch the attribute.
    const resolved = resolveTheme(
      (() => {
        try {
          const saved = localStorage.getItem(storageKey) as Theme | null
          if (saved && ["dark", "light", "system"].includes(saved)) return saved
        } catch { /* noop */ }
        return defaultTheme
      })()
    )

    // Set the correct class directly on the DOM node to avoid any gap
    // between removing the attribute and React re-rendering.
    node.className = resolved

    // Now it's safe to remove the pre-hydration attribute.
    document.documentElement.removeAttribute("data-dashboard-resolved-theme")

    // Migrate inline CSS vars from <html> to [data-dashboard-theme].
    const htmlStyle = document.documentElement.style
    for (let i = 0; i < htmlStyle.length; i++) {
      const prop = htmlStyle[i]
      if (prop.startsWith("--")) {
        node.style.setProperty(prop, htmlStyle.getPropertyValue(prop))
      }
    }
    for (let i = htmlStyle.length - 1; i >= 0; i--) {
      const prop = htmlStyle[i]
      if (prop.startsWith("--")) {
        htmlStyle.removeProperty(prop)
      }
    }

    // If no inline vars were migrated (first visit), apply from localStorage.
    if (node.style.length === 0) {
      try {
        const raw = localStorage.getItem("dht-theme-customizer")
        if (raw) {
          const config = JSON.parse(raw)
          const vars = resolved === "dark" ? config.cssVarsDark : config.cssVarsLight
          if (vars && typeof vars === "object") {
            Object.entries(vars).forEach(([key, value]) => {
              node.style.setProperty(`--${key}`, value as string)
            })
          }
          if (config.radius) {
            node.style.setProperty("--radius", config.radius)
          }
        }
      } catch { /* noop */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    if (theme !== "system") return

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => setThemeState("system")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  const resolved = resolveTheme(theme)

  const setTheme = React.useCallback((newTheme: Theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, newTheme)
    }
    setThemeState(newTheme)
  }, [storageKey])

  const value = React.useMemo(() => ({
    theme,
    setTheme,
    portalContainer,
  }), [theme, setTheme, portalContainer])

  return (
    <ThemeProviderContext.Provider value={value}>
      <div
        ref={wrapperRef}
        data-dashboard-theme
        className={resolved}
        style={{ display: "contents" }}
        suppressHydrationWarning
      >
        {children}
      </div>
    </ThemeProviderContext.Provider>
  )
}
