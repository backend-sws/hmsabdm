import React, { useState, useRef, useEffect, useCallback } from "react"
import { Upload, X, Image as ImageIcon, Eye, FileText, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ImageInputCustomProps, ImageInputValue } from "@/types/form-input.types"
import { Button } from "@/components/ui/button"

export interface ImageInputProps extends ImageInputCustomProps {
  id?: string
  name?: string
  disabled?: boolean
  error?: boolean | string
  className?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}

export const ImageInput: React.FC<ImageInputProps> = ({
  id,
  name,
  value,
  disabled = false,
  error,
  className,
  accept = "image/*,.jpg,.jpeg,.png,.webp,.svg",
  maxSizeMB = 5,
  aspectRatio = "auto",
  previewHeight = "h-44",
  placeholderText = "Click to upload or drag & drop image here",
  showRemoveButton = true,
  onImageChange,
  onImageRemove,
  onChange,
  onBlur,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSizeText, setFileSizeText] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [showLightbox, setShowLightbox] = useState(false)

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Parse initial value prop
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      setFileName(null)
      setFileSizeText(null)
      return
    }

    if (typeof value === "string") {
      setPreviewUrl(value)
      setFileName(value.split("/").pop() || "Image URL")
      setFileSizeText(null)
    } else if (value instanceof File) {
      const url = URL.createObjectURL(value)
      setPreviewUrl(url)
      setFileName(value.name)
      setFileSizeText(formatSize(value.size))

      return () => {
        URL.revokeObjectURL(url)
      }
    } else if (typeof value === "object" && value !== null) {
      const valObj = value as ImageInputValue
      if (valObj.url) {
        setPreviewUrl(valObj.url)
        setFileName(valObj.file?.name || valObj.url.split("/").pop() || "Image")
      } else if (valObj.file) {
        const url = URL.createObjectURL(valObj.file)
        setPreviewUrl(url)
        setFileName(valObj.file.name)
        setFileSizeText(formatSize(valObj.file.size))

        return () => {
          URL.revokeObjectURL(url)
        }
      }
    }
  }, [value])

  const handleFile = useCallback(
    (file: File | null) => {
      setLocalError(null)
      if (!file) return

      // Validate size
      const maxBytes = maxSizeMB * 1024 * 1024
      if (file.size > maxBytes) {
        const err = `File size exceeds maximum allowed limit of ${maxSizeMB}MB`
        setLocalError(err)
        return
      }

      // Create preview
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
      setFileName(file.name)
      setFileSizeText(formatSize(file.size))

      const imageVal: ImageInputValue = {
        file,
        url: objectUrl,
        alt: file.name,
      }

      if (onImageChange) {
        onImageChange(imageVal)
      }
    },
    [maxSizeMB, onImageChange]
  )

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      handleFile(file)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e)
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreviewUrl(null)
    setFileName(null)
    setFileSizeText(null)
    setLocalError(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    if (onImageRemove) {
      onImageRemove()
    }
    if (onImageChange) {
      onImageChange(null)
    }
  }

  const aspectRatioClasses = {
    square: "aspect-square",
    video: "aspect-video",
    banner: "aspect-[3/1]",
    auto: "",
  }

  const hasError = !!error || !!localError
  const errorMessage = localError || (typeof error === "string" ? error : null)

  return (
    <div className={cn("w-full space-y-2", className)}>
      <input
        id={id}
        name={name}
        ref={fileInputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleInputChange}
        onBlur={onBlur}
        className="hidden"
      />

      {previewUrl ? (
        /* Image Thumbnail Preview Card */
        <div
          className={cn(
            "group relative overflow-hidden rounded-xl border bg-card p-3 shadow-xs transition-all hover:border-primary/50",
            hasError ? "border-destructive" : "border-border"
          )}
        >
          <div
            className={cn(
              "relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-muted/50",
              aspectRatioClasses[aspectRatio],
              previewHeight
            )}
          >
            <img
              src={previewUrl}
              alt={fileName || "Uploaded image"}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
            {/* Overlay Action Buttons */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 gap-1.5 rounded-lg text-xs"
                onClick={() => setShowLightbox(true)}
              >
                <Eye className="h-3.5 w-3.5" /> View
              </Button>
              {!disabled && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" /> Replace
                </Button>
              )}
              {showRemoveButton && !disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg text-xs"
                  onClick={handleRemove}
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>
          </div>

          {/* File Meta Info Bar */}
          <div className="mt-2.5 flex items-center justify-between px-1 text-xs">
            <div className="flex items-center gap-2 truncate text-foreground font-medium">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{fileName}</span>
            </div>
            {fileSizeText && (
              <span className="text-muted-foreground text-[11px] shrink-0 font-mono">
                {fileSizeText}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Drag & Drop Upload Zone */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer",
            dragActive
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
            disabled && "cursor-not-allowed opacity-50 hover:border-border hover:bg-muted/20",
            hasError && "border-destructive bg-destructive/5"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3 transition-transform duration-200 group-hover:scale-110">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{placeholderText}</p>
            <p className="text-xs text-muted-foreground">
              SVG, PNG, JPG, WEBP (Max {maxSizeMB}MB)
            </p>
          </div>
        </div>
      )}

      {/* Error Output */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-destructive font-medium mt-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Lightbox Preview Dialog */}
      {showLightbox && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in-0"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-card p-2 shadow-2xl">
            <button
              type="button"
              className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black"
              onClick={() => setShowLightbox(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewUrl}
              alt={fileName || "Image preview"}
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
