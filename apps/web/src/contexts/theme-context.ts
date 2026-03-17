import * as React from "react"

type Theme = "dark" | "light" | "system"

export type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  portalContainer: HTMLElement | null
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  portalContainer: null,
}

export const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)
