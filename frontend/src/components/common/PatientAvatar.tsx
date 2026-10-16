import { useState } from "react"
import { createPortal } from "react-dom"
import { Eye, ShieldCheck, X, User } from "lucide-react"

interface PatientAvatarProps {
  photo?: string | null
  name?: string
  uhid?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  shape?: "circle" | "rounded"
  allowPreview?: boolean
  kyc_verified?: boolean
  subtitle?: string
  className?: string
}

export function PatientAvatar({
  photo,
  name = "Patient",
  uhid,
  size = "md",
  shape = "circle",
  allowPreview = true,
  kyc_verified,
  subtitle,
  className = "",
}: PatientAvatarProps) {
  const [hasError, setHasError] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // 1x1 blank image or corrupt string is usually <= 250 characters
  const isPhotoValid = Boolean(photo && photo.trim().length > 250 && !hasError)

  const photoSrc = isPhotoValid
    ? photo!.startsWith("data:") || photo!.startsWith("http")
      ? photo!
      : `data:image/jpeg;base64,${photo}`
    : ""

  const sizeClasses = {
    xs: "h-8 w-8 text-xs",
    sm: "h-9 w-9 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-16 w-16 text-xl",
  }[size]

  const shapeClasses = shape === "circle" ? "rounded-full" : "rounded-xl"
  const initial = (name?.trim().charAt(0) || "P").toUpperCase()

  return (
    <>
      <div
        className={`relative group inline-flex items-center justify-center shrink-0 select-none ${
          isPhotoValid && allowPreview ? "cursor-pointer" : ""
        } ${className}`}
        onClick={() => {
          if (isPhotoValid && allowPreview) {
            setIsPreviewOpen(true)
          }
        }}
        title={isPhotoValid && allowPreview ? `Click to preview photo of ${name}` : name}
      >
        {isPhotoValid ? (
          <>
            <img
              src={photoSrc}
              alt={name}
              onError={() => setHasError(true)}
              className={`${sizeClasses} ${shapeClasses} object-cover border-2 border-primary/30 shadow-2xs transition-all group-hover:ring-2 group-hover:ring-primary/40`}
            />
            {allowPreview && (
              <div
                className={`absolute inset-0 ${shapeClasses} bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white`}
              >
                <Eye className="h-4 w-4 drop-shadow" />
              </div>
            )}
          </>
        ) : (
          <div
            className={`flex items-center justify-center ${sizeClasses} ${shapeClasses} bg-primary/10 text-primary font-bold uppercase border border-primary/20 shadow-2xs`}
          >
            {initial}
          </div>
        )}

        {kyc_verified && (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs"
            title="ABDM KYC Verified"
          >
            <ShieldCheck className="h-2.5 w-2.5 stroke-[3]" />
          </span>
        )}
      </div>

      {/* Photo Preview Lightbox Dialog */}
      {isPreviewOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsPreviewOpen(false)}
            />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">Patient Photo Preview</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 shadow-md bg-muted p-1">
                  <img
                    src={photoSrc}
                    alt={name}
                    className="h-64 w-64 object-cover rounded-lg"
                  />
                  {kyc_verified && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-600/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
                      <ShieldCheck className="h-3 w-3" />
                      ABDM KYC
                    </div>
                  )}
                </div>

                <h4 className="mt-4 font-bold text-base text-foreground">{name}</h4>
                {uhid && (
                  <span className="mt-1 font-mono text-xs font-semibold text-primary px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                    {uhid}
                  </span>
                )}
                {subtitle && (
                  <p className="mt-2 text-xs text-muted-foreground max-w-xs">{subtitle}</p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-border flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
export default PatientAvatar
