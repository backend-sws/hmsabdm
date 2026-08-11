import React, { useState, forwardRef, useId } from "react"
import {
  Eye,
  EyeOff,
  Search,
  X,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { BaseFormInputProps, SelectOption, RadioOption } from "@/types/form-input.types"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectItem } from "@/components/ui/select"
import { Tooltip } from "@/components/ui/tooltip"
import { ImageInput } from "@/components/ui/image-input"

export interface FormInputProps
  extends BaseFormInputProps,
    Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      "type" | "error" | "required" | "value" | "defaultValue" | "children" | "onChange" | "onBlur"
    > {
  value?: any
  defaultValue?: any
  rows?: number
  autoComplete?: string
  onChange?: (e: any) => void
  onBlur?: (e: any) => void
}

export const FormInput = forwardRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, FormInputProps>(
  (
    {
      id,
      name,
      label,
      type = "text",
      tooltip,
      tooltipPosition = "top",
      required = false,
      error,
      success,
      helperText,
      startIcon,
      endIcon,
      options = [],
      radioOrientation = "vertical",
      imageProps,
      customRender,
      containerClassName,
      labelClassName,
      inputClassName,
      errorClassName,
      rows = 4,
      disabled = false,
      readOnly = false,
      placeholder,
      value,
      defaultValue,
      onChange,
      onBlur,
      children,
      className,
      ...restProps
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const [showPassword, setShowPassword] = useState(false)
    const [searchValue, setSearchValue] = useState(value || defaultValue || "")

    // Extract error message string
    const errorMessage =
      typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : null

    const hasError = !!errorMessage

    // Password visibility toggle handler
    const togglePassword = () => setShowPassword((prev) => !prev)

    // Clear search handler
    const handleClearSearch = (e: React.MouseEvent) => {
      e.stopPropagation()
      setSearchValue("")
      if (onChange) {
        const event = {
          target: { name, value: "" },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(event)
      }
    }

    // Input element rendering based on type
    const renderInputControl = () => {
      // Custom type render
      if (type === "custom" && customRender) {
        return customRender({
          name,
          label,
          type,
          error,
          disabled,
          required,
          value,
          onChange,
          onBlur,
        })
      }

      // Image & File Input
      if (type === "image" || type === "file") {
        return (
          <ImageInput
            id={inputId}
            name={name}
            value={value}
            disabled={disabled}
            error={errorMessage || undefined}
            onChange={onChange as any}
            onBlur={onBlur as any}
            {...imageProps}
          />
        )
      }

      // Checkbox Input
      if (type === "checkbox") {
        return (
          <div className="flex items-start gap-3 py-1">
            <input
              id={inputId}
              name={name}
              ref={ref as React.Ref<HTMLInputElement>}
              type="checkbox"
              disabled={disabled}
              checked={!!value}
              onChange={onChange as any}
              onBlur={onBlur as any}
              className={cn(
                "h-4 w-4 rounded border-input text-primary shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 transition-colors cursor-pointer",
                hasError && "border-destructive focus-visible:ring-destructive",
                inputClassName
              )}
              {...(restProps as React.InputHTMLAttributes<HTMLInputElement>)}
            />
            {label && (
              <div className="grid gap-0.5">
                <Label htmlFor={inputId} className="cursor-pointer font-medium text-sm">
                  {label}
                  {required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
              </div>
            )}
          </div>
        )
      }

      // Switch Toggle Input
      if (type === "switch") {
        const isChecked = !!value
        return (
          <div className="flex items-center justify-between py-1">
            <div className="grid gap-0.5">
              {label && (
                <Label htmlFor={inputId} className="cursor-pointer font-medium text-sm">
                  {label}
                  {required && <span className="text-destructive ml-1">*</span>}
                </Label>
              )}
              {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
            </div>
            <button
              id={inputId}
              type="button"
              role="switch"
              aria-checked={isChecked}
              disabled={disabled}
              onClick={() => {
                if (disabled) return
                if (onChange) {
                  const event = {
                    target: { name, value: !isChecked },
                  } as unknown as React.ChangeEvent<HTMLInputElement>
                  onChange(event)
                }
              }}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                isChecked ? "bg-primary" : "bg-muted-foreground/30",
                hasError && "ring-2 ring-destructive"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                  isChecked ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        )
      }

      // Radio Group Input
      if (type === "radio") {
        return (
          <div
            className={cn(
              "grid gap-2 py-1",
              radioOrientation === "horizontal" ? "sm:grid-flow-col sm:auto-cols-fr" : "grid-cols-1"
            )}
          >
            {options.map((opt: RadioOption | SelectOption, idx) => {
              const optId = `${inputId}-radio-${idx}`
              const isSelected = value === opt.value
              return (
                <label
                  key={opt.value}
                  htmlFor={optId}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all duration-150 hover:border-primary/40",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/80 bg-card hover:bg-muted/30",
                    opt.disabled && "cursor-not-allowed opacity-50 hover:border-border",
                    hasError && "border-destructive"
                  )}
                >
                  <input
                    id={optId}
                    name={name}
                    type="radio"
                    value={opt.value}
                    checked={isSelected}
                    disabled={disabled || opt.disabled}
                    onChange={onChange as any}
                    onBlur={onBlur as any}
                    className="h-4 w-4 text-primary border-input focus:ring-primary mt-0.5 cursor-pointer"
                  />
                  <div className="grid gap-0.5 text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      {opt.icon}
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span className="text-muted-foreground text-[11px] leading-tight">
                        {opt.description}
                      </span>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        )
      }

      // Textarea Input
      if (type === "textarea") {
        return (
          <textarea
            id={inputId}
            name={name}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={placeholder}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange as any}
            onBlur={onBlur as any}
            className={cn(
              "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]",
              hasError && "border-destructive focus-visible:ring-destructive/50",
              inputClassName
            )}
            {...(restProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        )
      }

      // Select Dropdown Input
      if (type === "select") {
        return (
          <Select
            id={inputId}
            name={name}
            ref={ref as React.Ref<HTMLSelectElement>}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange as any}
            onBlur={onBlur as any}
            className={cn(
              "h-10 text-sm border-input bg-background font-normal text-foreground focus-visible:ring-2 focus-visible:ring-primary rounded-lg",
              hasError && "border-destructive focus-visible:ring-destructive/50",
              inputClassName
            )}
            {...(restProps as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt: SelectOption) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
            {children}
          </Select>
        )
      }

      // Standard / Password / Search / Date Input
      const actualType = type === "password" ? (showPassword ? "text" : "password") : type

      return (
        <div className="relative flex items-center w-full">
          {/* Start Icon */}
          {startIcon ? (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
              {startIcon}
            </div>
          ) : type === "search" ? (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
          ) : type === "date" || type === "datetime-local" ? (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
              <Calendar className="h-4 w-4" />
            </div>
          ) : null}

          <Input
            id={inputId}
            name={name}
            ref={ref as React.Ref<HTMLInputElement>}
            type={actualType}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={placeholder}
            value={type === "search" ? searchValue : value}
            defaultValue={defaultValue}
            onChange={(e) => {
              if (type === "search") setSearchValue(e.target.value)
              if (onChange) onChange(e)
            }}
            onBlur={onBlur}
            error={hasError}
            className={cn(
              "h-10 text-sm transition-all duration-150 rounded-lg",
              (startIcon || type === "search" || type === "date" || type === "datetime-local") && "pl-9",
              (endIcon || type === "password" || type === "search" || success) && "pr-10",
              inputClassName
            )}
            {...(restProps as React.InputHTMLAttributes<HTMLInputElement>)}
          />

          {/* End Action / Icon Controls */}
          <div className="absolute right-3 flex items-center gap-1.5 text-muted-foreground">
            {type === "password" && (
              <button
                type="button"
                tabIndex={-1}
                onClick={togglePassword}
                className="hover:text-foreground transition-colors p-0.5 rounded focus:outline-hidden"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}

            {type === "search" && searchValue && (
              <button
                type="button"
                tabIndex={-1}
                onClick={handleClearSearch}
                className="hover:text-foreground transition-colors p-0.5 rounded focus:outline-hidden"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {endIcon && type !== "password" && type !== "search" && endIcon}

            {success && !endIcon && (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 animate-in zoom-in-50" />
            )}
          </div>
        </div>
      )
    }

    // Skip wrapping outer layout for checkbox & switch since they handle label internally
    if (type === "checkbox" || type === "switch") {
      return (
        <div className={cn("w-full space-y-1", containerClassName)}>
          {renderInputControl()}
          {errorMessage && (
            <p className={cn("flex items-center gap-1 text-xs text-destructive font-medium mt-1", errorClassName)}>
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          )}
        </div>
      )
    }

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {/* Field Label Header */}
        {label && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label
                htmlFor={inputId}
                className={cn(
                  "text-sm font-medium text-foreground flex items-center gap-1",
                  labelClassName
                )}
              >
                {label}
                {required && <span className="text-destructive font-bold">*</span>}
              </Label>

              {/* Tooltip Icon Button */}
              {tooltip && (
                <Tooltip content={tooltip} position={tooltipPosition}>
                  <button
                    type="button"
                    tabIndex={-1}
                    className="text-muted-foreground/70 hover:text-muted-foreground transition-colors rounded-full p-0.5 focus:outline-hidden"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span className="sr-only">Information</span>
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {/* Input Control */}
        {renderInputControl()}

        {/* Validation Error Message */}
        {errorMessage ? (
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs text-destructive font-medium mt-1 animate-in fade-in-50 slide-in-from-top-1",
              errorClassName
            )}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        ) : typeof success === "string" ? (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{success}</span>
          </p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

FormInput.displayName = "FormInput"
