"use client"

import * as React from "react"
import { AlertTriangleIcon, InfoIcon, Trash2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type ConfirmDialogVariant = "default" | "destructive" | "warning"

export interface ConfirmDialogOptions {
  title: string
  description?: string
  variant?: ConfirmDialogVariant
  confirmLabel?: string
  cancelLabel?: string
  closeLabel?: string
  icon?: React.ReactNode
}

export interface ConfirmDialogProps extends ConfirmDialogOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  isAlert?: boolean
}

const variantConfig: Record<
  ConfirmDialogVariant,
  {
    icon: React.ReactNode
    iconClassName: string
    confirmVariant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }
> = {
  default: {
    icon: <InfoIcon className="size-5" />,
    iconClassName: "text-primary",
    confirmVariant: "default",
  },
  destructive: {
    icon: <Trash2Icon className="size-5" />,
    iconClassName: "text-destructive",
    confirmVariant: "destructive",
  },
  warning: {
    icon: <AlertTriangleIcon className="size-5" />,
    iconClassName: "text-amber-500 dark:text-amber-400",
    confirmVariant: "default",
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  variant = "default",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  closeLabel = "OK",
  icon,
  isAlert = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant]

  const handleCancel = () => {
    onCancel()
  }

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                variant === "destructive" && "bg-destructive/10",
                variant === "warning" && "bg-amber-500/10 dark:bg-amber-400/10",
                variant === "default" && "bg-primary/10"
              )}
            >
              {icon || <span className={config.iconClassName}>{config.icon}</span>}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-left">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1.5 text-left">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          {!isAlert && (
            <Button variant="outline" onClick={handleCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button variant={config.confirmVariant} onClick={isAlert ? handleCancel : handleConfirm}>
            {isAlert ? closeLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
