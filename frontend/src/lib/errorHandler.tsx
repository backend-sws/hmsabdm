import React from "react"
import { toast } from "sonner"
import { ApiError } from "@/services/apiClient"

/**
 * Parses and displays API errors nicely using Sonner toasts.
 * Handles validation errors, standard API errors, and generic JavaScript errors.
 */
export function toastApiError(error: unknown, defaultMessage = "An error occurred") {
  let title = defaultMessage
  let description: React.ReactNode = undefined

  if (error instanceof ApiError) {
    const errorData = error.data

    if (errorData && typeof errorData === "object") {
      // 1. Handle validation errors (e.g. { errors: { email: ["taken"] } })
      if (errorData.errors && typeof errorData.errors === "object") {
        const errorList: string[] = []

        for (const [key, value] of Object.entries(errorData.errors)) {
          // Format field name: e.g. "username" -> "Username", "confirm_password" -> "Confirm password"
          const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")

          if (Array.isArray(value)) {
            value.forEach((val) => {
              if (typeof val === "string") {
                errorList.push(`${fieldName}: ${val}`)
              }
            })
          } else if (typeof value === "string") {
            errorList.push(`${fieldName}: ${value}`)
          }
        }

        if (errorList.length > 0) {
          title = errorData.message || "Validation Error"

          if (errorList.length === 1) {
            description = errorList[0]
          } else {
            description = (
              <ul className="mt-1 list-disc pl-4 space-y-1 text-xs opacity-90">
                {errorList.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )
          }
        }
      } else if (errorData.message || errorData.error) {
        // 2. Handle simple message or error string
        title = errorData.message || errorData.error
      }
    } else {
      title = error.message || title
    }
  } else if (error instanceof Error) {
    title = error.message
  } else if (typeof error === "string") {
    title = error
  }

  // Display the toast using Sonner
  toast.error(title, {
    description,
    duration: description ? 6000 : 4000,
  })
}
