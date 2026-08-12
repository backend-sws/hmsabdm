import React from "react"
import { X } from "lucide-react"

interface FormContainerProps {
  variant?: "modal" | "drawer"
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: "sm" | "md" | "lg" | "xl"
  children: React.ReactNode
  footer?: React.ReactNode
}

export function FormContainer({
  open,
  onOpenChange,
  title,
  description,
  size = "lg",
  children,
  footer,
}: FormContainerProps) {
  if (!open) return null

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Container Card */}
      <div
        className={`relative w-full ${sizeClasses} max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-slate-200/80 px-6 py-4 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default FormContainer
