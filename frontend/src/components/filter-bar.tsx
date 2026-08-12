import React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface FilterBarProps {
  values?: Record<string, any>
  onChange?: (updates: Record<string, any>) => void
  children: React.ReactNode
  className?: string
}

export function FilterBar({ values = {}, onChange, children, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child as React.ReactElement<any>, {
          values,
          onChange,
        })
      })}
    </div>
  )
}

interface FilterSearchProps {
  name: string
  placeholder?: string
  className?: string
  values?: Record<string, any>
  onChange?: (updates: Record<string, any>) => void
}

FilterBar.Search = function FilterSearch({
  name,
  placeholder = "Search...",
  className,
  values,
  onChange,
}: FilterSearchProps) {
  return (
    <div className={cn("relative flex-1 min-w-[200px]", className)}>
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        name={name}
        placeholder={placeholder}
        value={values?.[name] || ""}
        onChange={(e) => onChange?.({ [name]: e.target.value })}
        className="pl-9"
      />
    </div>
  )
}

interface FilterSelectOption {
  label: string
  value: string
}

interface FilterSelectProps {
  name: string
  placeholder?: string
  options: FilterSelectOption[]
  className?: string
  values?: Record<string, any>
  onChange?: (updates: Record<string, any>) => void
}

FilterBar.Select = function FilterSelect({
  name,
  placeholder = "All",
  options,
  className,
  values,
  onChange,
}: FilterSelectProps) {
  return (
    <select
      name={name}
      value={values?.[name] || ""}
      onChange={(e) => onChange?.({ [name]: e.target.value })}
      className={cn(
        "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent text-foreground cursor-pointer",
        className
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export default FilterBar
