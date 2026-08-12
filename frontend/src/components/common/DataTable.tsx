import React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

export interface Column<T> {
  header: string
  accessorKey?: keyof T | string
  cell?: (row: T) => React.ReactNode
  className?: string
  key?: string
}

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
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = React.useState("")
  const currentSearch = searchValue !== undefined ? searchValue : internalSearch

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInternalSearch(val)
    if (onSearchChange) onSearchChange(val)
  }

  const filteredData = React.useMemo(() => {
    if (onSearchChange || !currentSearch) return data
    const term = currentSearch.toLowerCase()
    return data.filter((item) =>
      Object.values(item as Record<string, unknown>).some((val) =>
        String(val ?? "").toLowerCase().includes(term)
      )
    )
  }, [data, currentSearch, onSearchChange])

  return (
    <div className="space-y-4">
      {(title || onSearchChange !== undefined) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {title && <h3 className="text-base font-bold tracking-tight text-foreground">{title}</h3>}
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

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {isLoading ? (
          <LoadingSpinner label="Fetching records..." />
        ) : filteredData.length === 0 ? (
          <div className="p-6">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase font-semibold text-muted-foreground">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={col.key || (col.accessorKey as string) || col.header || idx} className={`px-4 py-3.5 ${col.className || ""}`}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredData.map((item, rowIdx) => {
                  const key = keyExtractor
                    ? keyExtractor(item, rowIdx)
                    : (item as any).id || (item as any).key || rowIdx

                  return (
                    <tr key={key} className="hover:bg-muted/30 transition-colors">
                      {columns.map((col, colIdx) => {
                        const cellKey = col.key || (col.accessorKey as string) || colIdx
                        return (
                          <td key={cellKey} className={`px-4 py-3.5 ${col.className || ""}`}>
                            {col.cell
                              ? col.cell(item)
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

      {!isLoading && filteredData.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">Showing {filteredData.length} entries</p>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="xs" disabled>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="xs" disabled>
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
