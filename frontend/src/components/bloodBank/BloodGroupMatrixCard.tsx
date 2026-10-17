import React from "react"
import { Droplet, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { BloodGroupMatrixItem, BloodGroup } from "@/types/bloodBank"

interface BloodGroupMatrixCardProps {
  matrix: BloodGroupMatrixItem[]
  selectedGroup: string
  onSelectGroup: (group: BloodGroup | "all") => void
}

export const BloodGroupMatrixCard: React.FC<BloodGroupMatrixCardProps> = ({
  matrix,
  selectedGroup,
  onSelectGroup,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplet className="h-4 w-4 text-rose-600 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Live Blood Group Matrix (8 ABO/Rh Phenotypes)
          </h3>
        </div>
        {selectedGroup !== "all" && (
          <button
            type="button"
            onClick={() => onSelectGroup("all")}
            className="text-xs text-primary hover:underline font-semibold"
          >
            Clear Filter (Show All)
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {matrix.map((item) => {
          const isSelected = selectedGroup === item.blood_group
          const isCritical = item.is_critical_low

          return (
            <div
              key={item.blood_group}
              onClick={() => onSelectGroup(isSelected ? "all" : item.blood_group)}
              className={`relative cursor-pointer rounded-2xl border p-3.5 transition-all duration-200 select-none ${
                isSelected
                  ? "ring-2 ring-rose-600 bg-rose-50/50 dark:bg-rose-950/30 border-rose-600 shadow-md scale-[1.02]"
                  : "bg-card hover:bg-muted/50 hover:border-rose-300 dark:hover:border-rose-900"
              }`}
            >
              {/* Critical Shortage Warning Banner */}
              {isCritical && (
                <div className="absolute -top-2 -right-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs">
                    <AlertTriangle className="h-2.5 w-2.5" />
                  </span>
                </div>
              )}

              {/* Group Badge Header */}
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xl font-black font-mono tracking-tight text-foreground">
                  {item.blood_group}
                </span>
                <Badge
                  variant={isCritical ? "destructive" : "outline"}
                  className="text-[10px] font-mono px-1.5 py-0 h-4"
                >
                  {item.total_available} units
                </Badge>
              </div>

              {/* Component Breakdowns */}
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between items-center text-rose-700 dark:text-rose-400 font-semibold">
                  <span>PRBC:</span>
                  <span>{item.prbc_units}</span>
                </div>
                <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                  <span>FFP:</span>
                  <span>{item.ffp_units}</span>
                </div>
                <div className="flex justify-between items-center text-sky-600 dark:text-sky-400">
                  <span>Plt:</span>
                  <span>{item.platelet_units}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground text-[10px] pt-1 border-t">
                  <span>WB:</span>
                  <span>{item.whole_blood}</span>
                </div>
              </div>

              {/* Status indicators */}
              {item.reserved_units > 0 && (
                <div className="mt-2 pt-1 border-t text-[10px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
                  <span>Reserved:</span>
                  <span className="font-bold">{item.reserved_units}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
