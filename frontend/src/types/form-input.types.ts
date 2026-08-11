import React from "react"

export type FormInputType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "url"
  | "search"
  | "textarea"
  | "select"
  | "checkbox"
  | "switch"
  | "radio"
  | "date"
  | "datetime-local"
  | "time"
  | "image"
  | "file"
  | "custom"

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
  description?: string
  icon?: React.ReactNode
}

export interface RadioOption {
  label: string
  value: string | number
  disabled?: boolean
  description?: string
  icon?: React.ReactNode
}

export interface ImageInputValue {
  file?: File | null
  url?: string | null
  alt?: string
}

export interface ImageInputCustomProps {
  accept?: string
  maxSizeMB?: number
  aspectRatio?: "square" | "video" | "banner" | "auto"
  previewHeight?: string
  placeholderText?: string
  showRemoveButton?: boolean
  onImageChange?: (value: ImageInputValue | null) => void
  onImageRemove?: () => void
  value?: ImageInputValue | string | File | null
}

export interface TooltipProps {
  content: React.ReactNode
  position?: "top" | "bottom" | "left" | "right"
  children: React.ReactNode
  className?: string
  delay?: number
}

export type FieldErrorLike = string | { message?: string } | undefined

export interface BaseFormInputProps {
  /** Unique name or field identifier */
  name?: string
  /** Field label text or node */
  label?: React.ReactNode
  /** Type of input to render */
  type?: FormInputType
  /** Optional tooltip content shown on info icon hover/focus */
  tooltip?: React.ReactNode
  /** Position of the tooltip popup */
  tooltipPosition?: "top" | "bottom" | "left" | "right"
  /** Whether the field is mandatory */
  required?: boolean
  /** Validation error message string or object from react-hook-form */
  error?: FieldErrorLike
  /** Whether field is in valid/success state or custom success message */
  success?: boolean | string
  /** Helper text displayed below input */
  helperText?: React.ReactNode
  /** Icon displayed on the left of input */
  startIcon?: React.ReactNode
  /** Icon or action button displayed on the right of input */
  endIcon?: React.ReactNode
  /** Options array for `select` or `radio` input types */
  options?: SelectOption[] | RadioOption[]
  /** Whether field is visually disabled */
  disabled?: boolean
  /** Whether field is read-only */
  readOnly?: boolean
  /** Orientation for radio group options */
  radioOrientation?: "horizontal" | "vertical"
  /** Specific customization for `image` or `file` input types */
  imageProps?: ImageInputCustomProps
  /** Current value */
  value?: any
  /** Event handler for value changes */
  onChange?: any
  /** Event handler for blur */
  onBlur?: any
  /** Custom render function when type === 'custom' */
  customRender?: (props: BaseFormInputProps) => React.ReactNode
  /** Optional custom container wrapper styling */
  containerClassName?: string
  /** Optional custom label styling */
  labelClassName?: string
  /** Optional custom input element styling */
  inputClassName?: string
  /** Optional custom error message styling */
  errorClassName?: string
  /** Number of rows for `textarea` type */
  rows?: number
  /** Additional custom children (e.g. for select or custom layouts) */
  children?: React.ReactNode
}
