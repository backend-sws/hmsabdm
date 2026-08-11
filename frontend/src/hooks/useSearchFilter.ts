import { useState, useCallback } from "react"

export function useSearchFilter<T extends Record<string, any>>(initialFilters: T) {
  const [filter, setFilter] = useState<T>(initialFilters)

  const handleFilter = useCallback((updates: Partial<T>) => {
    setFilter((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetFilter = useCallback(() => {
    setFilter(initialFilters)
  }, [initialFilters])

  return { filter, handleFilter, resetFilter, setFilter }
}

export default useSearchFilter
