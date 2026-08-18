import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FormFieldProps<T extends FieldValues = any> {
  control: Control<T, any, any>
  name: Path<T>
  label: string
  placeholder?: string
  required?: boolean
  readOnly?: boolean
  disabled?: boolean
  inputType?: string
  className?: string
}

export function FormField<T extends FieldValues = any>({
  control,
  name,
  label,
  placeholder,
  required = false,
  readOnly = false,
  disabled = false,
  inputType = "text",
  className = "",
}: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <div className={`space-y-1.5 ${className}`}>
          <Label
            htmlFor={String(name)}
            className={`text-xs font-bold tracking-wider text-muted-foreground uppercase ${
              required ? "after:ml-0.5 after:text-destructive after:content-['*']" : ""
            }`}
          >
            {label}
          </Label>
          <Input
            {...field}
            value={field.value ?? ""}
            id={String(name)}
            type={inputType}
            placeholder={placeholder}
            disabled={disabled || readOnly}
            readOnly={readOnly}
            className={error ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {error && <p className="text-xs text-destructive">{error.message}</p>}
        </div>
      )}
    />
  )
}

interface FormSelectOption {
  label: string
  value: string
}

interface FormSelectFieldProps<T extends FieldValues = any> {
  control: Control<T, any, any>
  name: Path<T>
  label: string
  options: FormSelectOption[]
  required?: boolean
  readOnly?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function FormSelectField<T extends FieldValues = any>({
  control,
  name,
  label,
  options,
  required = false,
  readOnly = false,
  disabled = false,
  placeholder = "Select...",
  className = "",
}: FormSelectFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <div className={`space-y-1.5 ${className}`}>
          <Label
            htmlFor={String(name)}
            className={`text-xs font-bold tracking-wider text-muted-foreground uppercase ${
              required ? "after:ml-0.5 after:text-destructive after:content-['*']" : ""
            }`}
          >
            {label}
          </Label>
          <select
            {...field}
            value={field.value ?? ""}
            id={String(name)}
            disabled={disabled || readOnly}
            className={`h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent text-foreground cursor-pointer ${
              error ? "border-destructive" : ""
            }`}
          >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-destructive">{error.message}</p>}
        </div>
      )}
    />
  )
}
