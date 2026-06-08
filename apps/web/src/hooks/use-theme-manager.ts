"use client"

import React from 'react'
import { useTheme } from '@/hooks/use-theme'
import { baseColors } from '@/config/theme-customizer-constants'
import { colorThemes, tweakcnThemes } from '@/config/theme-data'
import type { ThemePreset, ImportedTheme } from '@/types/theme-customizer'

const STORAGE_KEY = 'dht-theme-customizer'

export interface PersistedThemeConfig {
  themeType: 'shadcn' | 'tweakcn' | 'imported' | 'none'
  themeValue: string
  radius: string
  cssVarsLight: Record<string, string>
  cssVarsDark: Record<string, string>
}

function loadPersistedConfig(): PersistedThemeConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedThemeConfig
  } catch {
    return null
  }
}

function savePersistedConfig(config: PersistedThemeConfig) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage may be unavailable
  }
}

function clearPersistedConfig() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // noop
  }
}

function getDashboardRoot(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-dashboard-theme]') ?? document.documentElement
}

export function useThemeManager() {
  const { theme, setTheme } = useTheme()
  const [brandColorsValues, setBrandColorsValues] = React.useState<Record<string, string>>({})

  const isDarkMode = React.useMemo(() => {
    if (theme === "dark") return true
    if (theme === "light") return false
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  }, [theme])

  const clearCssVars = React.useCallback(() => {
    const root = getDashboardRoot()
    const allPossibleVars = [
      'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground',
      'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground',
      'accent', 'accent-foreground', 'destructive', 'destructive-foreground', 'border', 'input',
      'ring', 'radius',
      'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
      'sidebar', 'sidebar-background', 'sidebar-foreground', 'sidebar-primary', 'sidebar-primary-foreground', 
      'sidebar-accent', 'sidebar-accent-foreground', 'sidebar-border', 'sidebar-ring',
      'font-sans', 'font-serif', 'font-mono',
      'shadow-2xs', 'shadow-xs', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl',
      'spacing', 'tracking-normal',
      'card-header', 'card-content', 'card-footer', 'muted-background', 'accent-background',
      'destructive-background', 'warning', 'warning-foreground', 'success', 'success-foreground',
      'info', 'info-foreground'
    ]
    
    allPossibleVars.forEach(varName => {
      root.style.removeProperty(`--${varName}`)
    })
    
    const inlineStyles = root.style
    for (let i = inlineStyles.length - 1; i >= 0; i--) {
      const property = inlineStyles[i]
      if (property.startsWith('--')) {
        root.style.removeProperty(property)
      }
    }
  }, [])

  const resetTheme = React.useCallback(() => {
    clearCssVars()
    clearPersistedConfig()
  }, [clearCssVars])

  const updateBrandColorsFromTheme = React.useCallback((styles: Record<string, string>) => {
    const newValues: Record<string, string> = {}
    baseColors.forEach(color => {
      const cssVar = color.cssVar.replace('--', '')
      if (styles[cssVar]) {
        newValues[color.cssVar] = styles[cssVar]
      }
    })
    setBrandColorsValues(newValues)
  }, [])

  const applyTheme = React.useCallback((themeValue: string, darkMode: boolean) => {
    const found = colorThemes.find(t => t.value === themeValue)
    if (!found) return

    clearCssVars()
    const styles = darkMode ? found.preset.styles.dark : found.preset.styles.light
    const root = getDashboardRoot()

    Object.entries(styles).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })

    updateBrandColorsFromTheme(styles)

    const existingConfig = loadPersistedConfig()
    savePersistedConfig({
      themeType: 'shadcn',
      themeValue,
      radius: existingConfig?.radius || getComputedStyle(root).getPropertyValue('--radius').trim() || '0.5rem',
      cssVarsLight: found.preset.styles.light,
      cssVarsDark: found.preset.styles.dark,
    })
  }, [clearCssVars, updateBrandColorsFromTheme])

  const applyTweakcnTheme = React.useCallback((themePreset: ThemePreset, darkMode: boolean) => {
    clearCssVars()
    const styles = darkMode ? themePreset.styles.dark : themePreset.styles.light
    const root = getDashboardRoot()

    Object.entries(styles).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })

    updateBrandColorsFromTheme(styles)

    const matchingTheme = tweakcnThemes.find(t => t.preset === themePreset)
    const existingConfig = loadPersistedConfig()
    savePersistedConfig({
      themeType: 'tweakcn',
      themeValue: matchingTheme?.value ?? '',
      radius: existingConfig?.radius || getComputedStyle(root).getPropertyValue('--radius').trim() || '0.5rem',
      cssVarsLight: themePreset.styles.light,
      cssVarsDark: themePreset.styles.dark,
    })
  }, [clearCssVars, updateBrandColorsFromTheme])

  const applyImportedTheme = React.useCallback((themeData: ImportedTheme, darkMode: boolean) => {
    const root = getDashboardRoot()
    const themeVars = darkMode ? themeData.dark : themeData.light
    
    Object.entries(themeVars).forEach(([variable, value]) => {
      root.style.setProperty(`--${variable}`, value)
    })
    
    const newBrandColors: Record<string, string> = {}
    baseColors.forEach(color => {
      const varName = color.cssVar.replace('--', '')
      if (themeVars[varName]) {
        newBrandColors[color.cssVar] = themeVars[varName]
      }
    })
    setBrandColorsValues(newBrandColors)

    savePersistedConfig({
      themeType: 'imported',
      themeValue: 'custom',
      radius: getComputedStyle(root).getPropertyValue('--radius').trim() || '0.5rem',
      cssVarsLight: themeData.light,
      cssVarsDark: themeData.dark,
    })
  }, [])

  const applyRadius = React.useCallback((radius: string) => {
    getDashboardRoot().style.setProperty('--radius', radius)

    const existing = loadPersistedConfig()
    if (existing) {
      savePersistedConfig({ ...existing, radius })
    } else {
      savePersistedConfig({
        themeType: 'none',
        themeValue: '',
        radius,
        cssVarsLight: {},
        cssVarsDark: {},
      })
    }
  }, [])

  const handleColorChange = (cssVar: string, value: string) => {
    getDashboardRoot().style.setProperty(cssVar, value)
  }

  return {
    theme,
    setTheme,
    isDarkMode,
    brandColorsValues,
    setBrandColorsValues,
    resetTheme,
    applyTheme,
    applyTweakcnTheme,
    applyImportedTheme,
    applyRadius,
    handleColorChange,
    updateBrandColorsFromTheme,
    loadPersistedConfig,
  }
}
