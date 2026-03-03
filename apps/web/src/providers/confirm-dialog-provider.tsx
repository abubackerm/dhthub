"use client"

import * as React from "react"
import {
  ConfirmDialog,
  ConfirmDialogOptions,
} from "@/components/ui/confirm-dialog"

interface ConfirmDialogState extends ConfirmDialogOptions {
  open: boolean
  isAlert: boolean
  resolve: (value: boolean) => void
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>
  alert: (options: Omit<ConfirmDialogOptions, "confirmLabel" | "cancelLabel">) => Promise<void>
}

const ConfirmDialogContext = React.createContext<ConfirmDialogContextValue | null>(null)

export function useConfirmDialog() {
  const context = React.useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error("useConfirmDialog must be used within a ConfirmDialogProvider")
  }
  return context
}

interface ConfirmDialogProviderProps {
  children: React.ReactNode
}

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  const [state, setState] = React.useState<ConfirmDialogState | null>(null)
  const resolvingRef = React.useRef(false)

  const confirm = React.useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolvingRef.current = false
      setState({
        ...options,
        open: true,
        isAlert: false,
        resolve,
      })
    })
  }, [])

  const alert = React.useCallback(
    (options: Omit<ConfirmDialogOptions, "confirmLabel" | "cancelLabel">): Promise<void> => {
      return new Promise((resolve) => {
        resolvingRef.current = false
        setState({
          ...options,
          open: true,
          isAlert: true,
          resolve: () => resolve(undefined),
        })
      })
    },
    []
  )

  const handleConfirm = React.useCallback(() => {
    if (state && !resolvingRef.current) {
      resolvingRef.current = true
      state.resolve(true)
      setState((prev) => (prev ? { ...prev, open: false } : null))
    }
  }, [state])

  const handleCancel = React.useCallback(() => {
    if (state && !resolvingRef.current) {
      resolvingRef.current = true
      state.resolve(false)
      setState((prev) => (prev ? { ...prev, open: false } : null))
    }
  }, [state])

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open && state && !resolvingRef.current) {
      resolvingRef.current = true
      state.resolve(false)
      setState((prev) => (prev ? { ...prev, open: false } : null))
    }
  }, [state])

  const contextValue = React.useMemo(
    () => ({
      confirm,
      alert,
    }),
    [confirm, alert]
  )

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      {state && (
        <ConfirmDialog
          open={state.open}
          onOpenChange={handleOpenChange}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          title={state.title}
          description={state.description}
          variant={state.variant}
          confirmLabel={state.confirmLabel}
          cancelLabel={state.cancelLabel}
          closeLabel={state.closeLabel}
          icon={state.icon}
          isAlert={state.isAlert}
        />
      )}
    </ConfirmDialogContext.Provider>
  )
}
