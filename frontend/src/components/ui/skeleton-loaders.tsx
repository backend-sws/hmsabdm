import { Skeleton } from "./skeleton"

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  const getCellClassName = (colIdx: number) => {
    if (colIdx === cols - 1) return "px-4 py-3.5 text-right"
    if (colIdx === cols - 2) return "px-4 py-3.5 text-center"
    return "px-4 py-3.5"
  }

  const widths = ["w-28", "w-36", "w-24", "w-44", "w-32", "w-20"]

  return (
    <>
      {[...Array(rows)].map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-border/60">
          {[...Array(cols)].map((_, colIdx) => {
            if (colIdx === cols - 1) {
              return (
                <td key={colIdx} className={getCellClassName(colIdx)}>
                  <Skeleton className="h-7 w-16 ml-auto rounded-lg" />
                </td>
              )
            }
            if (colIdx === cols - 2) {
              return (
                <td key={colIdx} className={getCellClassName(colIdx)}>
                  <Skeleton className="h-5 w-20 mx-auto rounded-full" />
                </td>
              )
            }
            if (colIdx === 0) {
              return (
                <td key={colIdx} className={getCellClassName(colIdx)}>
                  <Skeleton className="h-4 w-20" />
                </td>
              )
            }
            return (
              <td key={colIdx} className={getCellClassName(colIdx)}>
                <Skeleton className={`h-4 ${widths[(rowIndex + colIdx) % widths.length]}`} />
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      ))}
    </div>
  )
}
