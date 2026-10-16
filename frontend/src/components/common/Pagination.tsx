import React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/context/ThemeContext"

export interface PaginationProps {
  currentPage: number
  totalRecords: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  recordLabel?: string
  className?: string
  showPageSize?: boolean
  showFirstLast?: boolean
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  recordLabel = "records",
  className = "",
  showPageSize = true,
  showFirstLast = true,
}) => {
  const { colorConfig } = useTheme()
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

  const fromItem = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const toItem = totalRecords === 0 ? 0 : Math.min(safeCurrentPage * pageSize, totalRecords)

  // Calculate visible page buttons with smart windowing
  const getPageNumbers = () => {
    const pages: (number | string)[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (safeCurrentPage > 3) {
        pages.push("...")
      }

      const start = Math.max(2, safeCurrentPage - 1)
      const end = Math.min(totalPages - 1, safeCurrentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (safeCurrentPage < totalPages - 2) {
        pages.push("...")
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  if (totalRecords === 0) {
    return null
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-border bg-white dark:bg-card select-none ${className}`}
    >
      {/* Left: Summary text */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <span>
          Showing <strong className="font-semibold text-foreground">{fromItem}</strong> to{" "}
          <strong className="font-semibold text-foreground">{toItem}</strong> of{" "}
          <strong className="font-semibold text-foreground">{totalRecords}</strong> {recordLabel}
        </span>
        <span className="hidden md:inline-block text-muted-foreground/40">•</span>
        <span className="hidden md:inline-block text-xs font-mono text-muted-foreground">
          Page {safeCurrentPage} of {totalPages}
        </span>
      </div>

      {/* Right: Per-page selector & Navigation buttons */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
            <span className="font-medium hidden sm:inline">Per page:</span>
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary/50 transition-colors"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* First page button */}
          {showFirstLast && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md border-border p-0 text-muted-foreground hover:text-foreground disabled:opacity-40"
              disabled={safeCurrentPage <= 1}
              onClick={() => onPageChange(1)}
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Previous page button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-md border-border px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange(safeCurrentPage - 1)}
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Prev</span>
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) =>
              typeof p === "number" ? (
                <Button
                  key={`page-${p}`}
                  size="sm"
                  variant={p === safeCurrentPage ? "default" : "ghost"}
                  onClick={() => onPageChange(p)}
                  className={`h-8 min-w-8 px-2.5 rounded-md text-xs transition-all ${
                    p === safeCurrentPage
                      ? `bg-gradient-to-r ${colorConfig.gradient} text-white font-bold shadow-xs ${colorConfig.shadow}`
                      : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                  }`}
                >
                  {p}
                </Button>
              ) : (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-muted-foreground font-mono"
                >
                  …
                </span>
              )
            )}
          </div>

          {/* Next page button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-md border-border px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange(safeCurrentPage + 1)}
            title="Next Page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page button */}
          {showFirstLast && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md border-border p-0 text-muted-foreground hover:text-foreground disabled:opacity-40"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => onPageChange(totalPages)}
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Pagination
