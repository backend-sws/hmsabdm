import React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

export interface Column<T> {
  key?: string
  header: string
  accessorKey?: keyof T | string
  cell?: (row: T) => React.ReactNode
  render?: (row: T) => React.ReactNode
  className?: string
}

export type DataTableColumn<T> = Column<T>

export interface DataTableProps<T> {
  title?: string
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  searchPlaceholder?: string
  onSearchChange?: (term: string) => void
  searchValue?: string
  emptyTitle?: string
  emptyDescription?: string
  keyExtractor?: (item: T, index: number) => string | number
  rowKey?: string | keyof T
  currentPage?: number
  pageSize?: number
  totalRecords?: number
  lastPage?: number
  onPageChange?: (page: number) => void
  handlePageSizeChange?: (size: number) => void
}

export function DataTable<T>({
  title,
  columns,
  data,
  isLoading = false,
  searchPlaceholder = "Search records...",
  onSearchChange,
  searchValue,
  emptyTitle = "No data found",
  emptyDescription = "There are no records matching your criteria.",
  keyExtractor,
  rowKey,
  currentPage,
  pageSize,
  totalRecords,
  lastPage,
  onPageChange,
  handlePageSizeChange,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = React.useState("")
  const currentSearch = searchValue !== undefined ? searchValue : internalSearch

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInternalSearch(val)
    if (onSearchChange) onSearchChange(val)
  }

  // Defensively normalize incoming data into guaranteed Array
  const rawList: T[] = React.useMemo(() => {
    if (Array.isArray(data)) return data
    if (data && typeof data === "object" && Array.isArray((data as any).data)) {
      return (data as any).data
    }
    return []
  }, [data])

  const filteredData = React.useMemo(() => {
    if (!Array.isArray(rawList)) return []
    if (onSearchChange || !currentSearch) return rawList
    const term = currentSearch.toLowerCase()
    return rawList.filter((item) =>
      Object.values(item as Record<string, unknown>).some((val) =>
        String(val ?? "").toLowerCase().includes(term)
      )
    )
  }, [rawList, currentSearch, onSearchChange])

  const total =
    totalRecords !== undefined
      ? totalRecords
      : ((data as any)?.meta?.total ?? filteredData.length)
  const page = currentPage !== undefined ? currentPage : 1
  const limit = pageSize !== undefined ? pageSize : 10
  const maxPage = lastPage !== undefined ? lastPage : Math.max(1, Math.ceil(total / limit))

  const fromItem = total === 0 ? 0 : (page - 1) * limit + 1
  const toItem = total === 0 ? 0 : Math.min(page * limit, total)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (maxPage <= 7) {
      for (let i = 1; i <= maxPage; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push("...")
      const start = Math.max(2, page - 1)
      const end = Math.min(maxPage - 1, page + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (page < maxPage - 2) pages.push("...")
      pages.push(maxPage)
    }
    return pages
  }

  return (
    <div className="space-y-4">
      {(title || onSearchChange !== undefined) && (
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          {title && (
            <h3 className="text-base font-bold tracking-tight text-foreground">
              {title}
            </h3>
          )}
          {onSearchChange !== undefined && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={currentSearch}
                onChange={handleSearch}
                className="pl-9"
              />
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
        {isLoading ? (
          <LoadingSpinner label="Fetching records..." />
        ) : filteredData.length === 0 ? (
          <div className="p-6">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/70 bg-muted/40 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                <tr>
                  {columns.map((col, idx) => (
                    <th
                      key={col.key || (col.accessorKey as string) || col.header || idx}
                      className={`px-4 py-3.5 ${col.className || ""}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {filteredData.map((item, rowIdx) => {
                  let key: string | number = rowIdx
                  if (keyExtractor) {
                    key = keyExtractor(item, rowIdx)
                  } else if (rowKey && (item as any)[rowKey] !== undefined) {
                    key = (item as any)[rowKey]
                  } else if ((item as any).id !== undefined) {
                    key = (item as any).id
                  } else if ((item as any).key !== undefined) {
                    key = (item as any).key
                  }

                  return (
                    <tr key={key} className="transition-colors hover:bg-muted/30">
                      {columns.map((col, colIdx) => {
                        const cellKey = col.key || (col.accessorKey as string) || colIdx
                        const renderFn = col.render || col.cell

                        return (
                          <td
                            key={cellKey}
                            className={`px-4 py-3.5 ${col.className || ""}`}
                          >
                            {renderFn
                              ? renderFn(item)
                              : col.accessorKey
                              ? String((item as any)[col.accessorKey] ?? "")
                              : String((item as any)[col.key || ""] ?? "")}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && (
        <div className="flex flex-col items-center justify-between gap-4 pt-2 text-xs text-muted-foreground sm:flex-row">
          <p className="font-medium">
            Showing {fromItem} to {toItem} of {total} entries
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {handlePageSizeChange && (
              <select
                value={limit}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="h-8 rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            )}

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 rounded-lg px-2.5 text-xs"
                disabled={page <= 1}
                onClick={() => onPageChange?.(page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>

              {onPageChange &&
                getPageNumbers().map((p, idx) =>
                  typeof p === "number" ? (
                    <Button
                      key={p}
                      size="sm"
                      variant={p === page ? "default" : "ghost"}
                      onClick={() => onPageChange(p)}
                      className={`h-8 w-8 rounded-lg p-0 text-xs font-bold ${
                        p === page
                          ? "bg-blue-600 text-white"
                          : "text-muted-foreground"
                      }`}
                    >
                      {p}
                    </Button>
                  ) : (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-1 text-muted-foreground"
                    >
                      ...
                    </span>
                  )
                )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 rounded-lg px-2.5 text-xs"
                disabled={page >= maxPage}
                onClick={() => onPageChange?.(page + 1)}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
