import { useState, useCallback } from "react"

interface UsePaginationOptions {
  defaultPage?: number
  defaultPerPage?: number
}

/**
 * Standardized pagination state hook.
 * Eliminates repeated page/perPage useState patterns across all list pages.
 *
 * @example
 * const { page, perPage, setPage, setPerPage, resetPage } = usePagination()
 */
export function usePagination({
  defaultPage = 1,
  defaultPerPage = 15,
}: UsePaginationOptions = {}) {
  const [page, setPageState] = useState(defaultPage)
  const [perPage, setPerPageState] = useState(defaultPerPage)

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage)
  }, [])

  const setPerPage = useCallback((newPerPage: number) => {
    setPerPageState(newPerPage)
    setPageState(1) // Reset to page 1 on size change
  }, [])

  const resetPage = useCallback(() => {
    setPageState(defaultPage)
  }, [defaultPage])

  return { page, perPage, setPage, setPerPage, resetPage }
}

export default usePagination
