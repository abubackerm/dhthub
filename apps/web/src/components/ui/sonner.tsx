"use client"

import { useTheme } from "@/hooks/use-theme"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  let resolvedTheme: "light" | "dark" = "light"
  try {
    const { theme } = useTheme()
    if (theme === "dark") {
      resolvedTheme = "dark"
    } else if (theme === "system" && typeof window !== "undefined") {
      resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }
  } catch {
    // useTheme throws if not inside ThemeProvider (e.g. public pages)
  }

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
