import React from "react"
import { AlertTriangle, AlertCircle, Info, HelpCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog"
import { Button } from "./button"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "destructive" | "warning" | "info" | "default"
  isLoading?: boolean
  onConfirm: () => void
  onCancel?: () => void
  children?: React.ReactNode
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}) => {
  const getIcon = () => {
    switch (variant) {
      case "destructive":
        return <AlertCircle className="h-5 w-5 text-destructive" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <HelpCircle className="h-5 w-5 text-primary" />
    }
  }

  const handleCancel = () => {
    if (onCancel) onCancel()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {getIcon()}
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children && <div className="py-2">{children}</div>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
