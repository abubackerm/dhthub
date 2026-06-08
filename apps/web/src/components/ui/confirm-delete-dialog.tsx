"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  warningDetails?: string[]
  confirmLabel?: string
  onConfirm: () => void
  isPending?: boolean
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  warningDetails,
  confirmLabel = "Delete",
  onConfirm,
  isPending = false,
}: ConfirmDeleteDialogProps) {
  const [confirmationText, setConfirmationText] = useState("")

  const isConfirmEnabled = confirmationText === "DELETE"

  const handleConfirm = () => {
    if (!isConfirmEnabled) return
    onConfirm()
    setConfirmationText("")
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setConfirmationText("")
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {warningDetails && warningDetails.length > 0 && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-destructive mb-2">
              This will also delete:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {warningDetails.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-destructive mt-0.5">&#8226;</span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="delete-confirmation">
            Type <span className="font-mono font-bold">DELETE</span> to confirm
          </Label>
          <Input
            id="delete-confirmation"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            disabled={isPending}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isPending}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
