import React from "react"
import { toast } from "sonner"
import { ApiError } from "@/services/apiClient"

/**
 * Parses and displays API errors nicely using Sonner toasts.
 * Enforces crisp enterprise box aesthetics, structured lists, and eliminates duplicate spam.
 */
export function toastApiError(error: unknown, defaultMessage = "Action Failed") {
  let title = defaultMessage
  let description: React.ReactNode = undefined

  if (error instanceof ApiError) {
    const errorData = error.data

    if (errorData && typeof errorData === "object") {
      // 1. Check for Blood Bank / Clinical screening deferral or structured reasons array
      const rejectionReasons =
        errorData.rejection_reasons ||
        errorData.data?.rejection_reasons ||
        errorData.errors?.rejection_reasons

      if (Array.isArray(rejectionReasons) && rejectionReasons.length > 0) {
        title = "Donor Screening Deferred"
        description = (
          <div className="mt-1.5 space-y-1.5">
            <div className="text-[11px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
              Deferral Conditions Triggered:
            </div>
            <ul className="space-y-1">
              {rejectionReasons.map((reason: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300 leading-snug">
                  <span className="inline-block w-1.5 h-1.5 bg-red-600 mt-1 flex-shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      }
      // 2. Handle standard Laravel validation errors (e.g. { errors: { email: ["taken"] } })
      else if (errorData.errors && typeof errorData.errors === "object") {
        const errorList: string[] = []

        for (const [key, value] of Object.entries(errorData.errors)) {
          // Skip if key is already an object or non-field payload
          if (["eligible", "rejection_reasons", "screening", "donor", "rejection_reason"].includes(key)) {
            continue
          }
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
          title = errorData.message && errorData.message.length < 50
            ? errorData.message
            : "Validation Failed"

          if (errorList.length === 1) {
            description = (
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{errorList[0]}</p>
            )
          } else {
            description = (
              <div className="mt-1.5 space-y-1">
                <ul className="space-y-1">
                  {errorList.map((err, index) => (
                    <li key={index} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300 leading-snug">
                      <span className="inline-block w-1.5 h-1.5 bg-red-500 mt-1 flex-shrink-0" />
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
        } else if (errorData.message || errorData.error) {
          const rawMsg = errorData.message || errorData.error
          formatSingleMessage(rawMsg, defaultMessage, (t, d) => {
            title = t
            description = d
          })
        }
      }
      // 3. Handle simple message or error string
      else if (errorData.message || errorData.error) {
        const rawMsg = errorData.message || errorData.error
        formatSingleMessage(rawMsg, defaultMessage, (t, d) => {
          title = t
          description = d
        })
      }
    } else {
      title = error.message || title
    }
  } else if (error instanceof Error) {
    formatSingleMessage(error.message, defaultMessage, (t, d) => {
      title = t
      description = d
    })
  } else if (typeof error === "string") {
    formatSingleMessage(error, defaultMessage, (t, d) => {
      title = t
      description = d
    })
  }

  // Deduplication key to prevent stacked duplicate error popups
  const toastKey = `err-${typeof title === "string" ? title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32) : "gen"}`

  toast.error(title, {
    id: toastKey,
    description,
    duration: description ? 7500 : 4500,
  })
}

function formatSingleMessage(
  rawMsg: string,
  fallbackTitle: string,
  setResult: (title: string, desc: React.ReactNode) => void
) {
  if (!rawMsg) {
    setResult(fallbackTitle, undefined)
    return
  }

  // Check if message is a compound string with colon and semicolons:
  // e.g. "Donor is temporarily deferred from donating blood: Known Heart Disease; Malaria in last 3 months; ..."
  if (rawMsg.includes(":") && rawMsg.includes(";")) {
    const colonIdx = rawMsg.indexOf(":")
    const head = rawMsg.substring(0, colonIdx).trim()
    const tail = rawMsg.substring(colonIdx + 1).trim()
    const items = tail.split(";").map((s) => s.trim()).filter(Boolean)

    if (items.length > 0) {
      setResult(
        head || fallbackTitle,
        <div className="mt-1.5 space-y-1.5">
          <div className="text-[11px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
            Deferral Reasons:
          </div>
          <ul className="space-y-1">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300 leading-snug">
                <span className="inline-block w-1.5 h-1.5 bg-red-600 mt-1 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )
      return
    }
  }

  // If message is very long (> 70 characters), avoid huge bold headings
  if (rawMsg.length > 70) {
    setResult(
      fallbackTitle,
      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{rawMsg}</p>
    )
    return
  }

  // Short clean message
  setResult(rawMsg, undefined)
}
