import React, { useState } from "react"
import { RotateCcw, Info, LayoutGrid } from "lucide-react"

interface WidalEntryProps {
  onTitreChange: (paramCode: string, titre: string) => void
  onInterpretationGenerate?: (text: string) => void
  initialValues?: Record<string, string>
}

const DILUTIONS = ["1/20", "1/40", "1/80", "1/160", "1/320", "1/640"]

interface AntigenRow {
  key: "TO" | "TH" | "AH" | "BH"
  name: string
  shortBadge: string
  dilutions: Record<string, boolean>
  titer: string
}

export const WidalMatrixEntry: React.FC<WidalEntryProps> = ({
  onTitreChange,
  initialValues = {},
}) => {
  const initRow = (
    key: "TO" | "TH" | "AH" | "BH",
    name: string,
    shortBadge: string
  ): AntigenRow => {
    const rawVal =
      initialValues[key] ||
      initialValues[key.toLowerCase()] ||
      (key === "AH" ? initialValues["AO"] || initialValues["ao"] : "") ||
      "Negative"

    let normalizedVal = "Negative"
    const dMap: Record<string, boolean> = {
      "1/20": false,
      "1/40": false,
      "1/80": false,
      "1/160": false,
      "1/320": false,
      "1/640": false,
    }

    if (rawVal.startsWith("{")) {
      try {
        const parsed = JSON.parse(rawVal)
        normalizedVal = (parsed.titer || "Negative").replace(":", "/")
        if (parsed.dilutions && typeof parsed.dilutions === "object") {
          Object.assign(dMap, parsed.dilutions)
        }
      } catch {
        normalizedVal = rawVal.replace(":", "/")
      }
    } else {
      normalizedVal = rawVal.replace(":", "/")
      if (normalizedVal !== "Negative" && DILUTIONS.includes(normalizedVal)) {
        const idx = DILUTIONS.indexOf(normalizedVal)
        for (let i = 0; i <= idx; i++) {
          dMap[DILUTIONS[i]] = true
        }
      }
    }

    return {
      key,
      name,
      shortBadge,
      dilutions: dMap,
      titer: normalizedVal,
    }
  }

  const [rows, setRows] = useState<AntigenRow[]>([
    initRow("TO", "S.Typhi-O", "TO"),
    initRow("TH", "S.Typhi-H", "TH"),
    initRow("AH", "S.Paratyphi-AH", "AH"),
    initRow("BH", "S.Paratyphi-BH", "BH"),
  ])

  const notifyChange = (updatedRows: AntigenRow[]) => {
    setRows(updatedRows)
    updatedRows.forEach((r) => {
      const payload = JSON.stringify({ titer: r.titer, dilutions: r.dilutions })
      onTitreChange(r.key, payload)
      if (r.key === "AH") {
        onTitreChange("AO", payload)
      }
    })
  }

  // Handle dropdown titer selection
  const handleTiterSelect = (key: string, titer: string) => {
    const updated = rows.map((r) => {
      if (r.key !== key) return r

      const dMap: Record<string, boolean> = {
        "1/20": false,
        "1/40": false,
        "1/80": false,
        "1/160": false,
        "1/320": false,
        "1/640": false,
      }

      if (titer !== "Negative" && DILUTIONS.includes(titer)) {
        const idx = DILUTIONS.indexOf(titer)
        for (let i = 0; i <= idx; i++) {
          dMap[DILUTIONS[i]] = true
        }
      }

      return { ...r, titer, dilutions: dMap }
    })
    notifyChange(updated)
  }

  // Handle clicking individual cell
  const handleCellToggle = (key: string, dilution: string) => {
    const updated = rows.map((r) => {
      if (r.key !== key) return r

      const currentVal = Boolean(r.dilutions[dilution])
      const targetState = !currentVal

      const dMap = { ...r.dilutions }

      if (targetState) {
        // Turning ON up to this dilution
        const idx = DILUTIONS.indexOf(dilution)
        for (let i = 0; i <= idx; i++) {
          dMap[DILUTIONS[i]] = true
        }
      } else {
        // Turning OFF this dilution and all higher ones
        const idx = DILUTIONS.indexOf(dilution)
        for (let i = idx; i < DILUTIONS.length; i++) {
          dMap[DILUTIONS[i]] = false
        }
      }

      // Compute highest active titer
      let highest = "Negative"
      for (let i = DILUTIONS.length - 1; i >= 0; i--) {
        if (dMap[DILUTIONS[i]]) {
          highest = DILUTIONS[i]
          break
        }
      }

      return { ...r, titer: highest, dilutions: dMap }
    })
    notifyChange(updated)
  }

  // All negative preset
  const handleAllNegative = () => {
    const updated = rows.map((r) => ({
      ...r,
      titer: "Negative",
      dilutions: {
        "1/20": false,
        "1/40": false,
        "1/80": false,
        "1/160": false,
        "1/320": false,
        "1/640": false,
      },
    }))
    notifyChange(updated)
  }

  // Quick positive (O & H = 1/160)
  const handlePositivePreset = () => {
    const updated = rows.map((r) => {
      if (r.key === "TO" || r.key === "TH") {
        return {
          ...r,
          titer: "1/160",
          dilutions: {
            "1/20": true,
            "1/40": true,
            "1/80": true,
            "1/160": true,
            "1/320": false,
            "1/640": false,
          },
        }
      }
      return {
        ...r,
        titer: "Negative",
        dilutions: {
          "1/20": false,
          "1/40": false,
          "1/80": false,
          "1/160": false,
          "1/320": false,
          "1/640": false,
        },
      }
    })
    notifyChange(updated)
  }

  // Determine overall interpretation
  const toRow = rows.find((r) => r.key === "TO")
  const thRow = rows.find((r) => r.key === "TH")

  const isPositive =
    Boolean(toRow && (toRow.titer === "1/80" || toRow.titer === "1/160" || toRow.titer === "1/320" || toRow.titer === "1/640")) ||
    Boolean(thRow && (thRow.titer === "1/160" || thRow.titer === "1/320" || thRow.titer === "1/640"))

  return (
    <div className="border border-sky-200 dark:border-sky-900/60 rounded-xl bg-white dark:bg-card overflow-hidden shadow-2xs">
      {/* Top Header */}
      <div className="px-4 py-2.5 bg-sky-50/60 dark:bg-sky-950/20 border-b border-sky-100 dark:border-sky-900/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sky-600 dark:text-sky-400">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-sky-950 dark:text-sky-100">
            Widal Slide Agglutination Titers
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
            Slide Method
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAllNegative}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-muted border border-slate-300 dark:border-border rounded-md hover:bg-slate-50 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            ALL NEGATIVE
          </button>

          <div className="inline-flex rounded-md border border-slate-300 dark:border-border overflow-hidden text-[11px] font-bold">
            <button
              type="button"
              onClick={handlePositivePreset}
              className={`px-3 py-1 transition-colors ${
                isPositive
                  ? "bg-red-500 text-white font-bold"
                  : "bg-white dark:bg-muted text-red-600 hover:bg-red-50"
              }`}
            >
              POSITIVE
            </button>
            <button
              type="button"
              onClick={handleAllNegative}
              className={`px-3 py-1 transition-colors border-l border-slate-300 dark:border-border ${
                !isPositive
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-white dark:bg-muted text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              NEGATIVE
            </button>
          </div>
        </div>
      </div>

      {/* Agglutination Titers Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-border text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-muted/30">
              <th className="py-2.5 px-4 w-[24%]">ANTIGEN</th>
              {DILUTIONS.map((d) => (
                <th key={d} className="py-2.5 px-2 text-center w-[10%]">
                  {d}
                </th>
              ))}
              <th className="py-2.5 px-4 text-center w-[16%]">TITER SELECTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-border/60">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50/60 dark:hover:bg-muted/20 transition-colors">
                {/* Antigen Name + Badge */}
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs">
                      {row.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                      {row.shortBadge}
                    </span>
                  </div>
                </td>

                {/* Dilution Cells */}
                {DILUTIONS.map((dil) => {
                  const isCellPositive = Boolean(row.dilutions[dil])
                  return (
                    <td key={dil} className="py-2 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleCellToggle(row.key, dil)}
                        className={`w-full max-w-[58px] h-7 mx-auto rounded font-mono font-bold text-xs transition-all border ${
                          isCellPositive
                            ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 shadow-2xs"
                            : "bg-slate-50/80 dark:bg-muted/40 text-slate-400 border-slate-200 dark:border-border hover:border-slate-300 hover:text-slate-600"
                        }`}
                        title={`Click to toggle ${dil}`}
                      >
                        {isCellPositive ? "+" : "—"}
                      </button>
                    </td>
                  )
                })}

                {/* Titer Dropdown */}
                <td className="py-2 px-4 text-center">
                  <select
                    value={row.titer}
                    onChange={(e) => handleTiterSelect(row.key, e.target.value)}
                    className="h-7.5 w-full rounded-md border border-slate-300 dark:border-border bg-white dark:bg-background px-2 font-medium text-xs text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="Negative">Negative</option>
                    {DILUTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Info & Overall Interpretation Result */}
      <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-muted/30 border-t border-slate-200 dark:border-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
          <Info className="h-3.5 w-3.5 text-sky-500 shrink-0" />
          <span>
            Click any dilution cell to toggle + / -, or choose titer from dropdown. Titer ≥ 1/80 is significant for infection.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            INTERPRETATION RESULT:
          </span>
          {isPositive ? (
            <span className="px-3 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wide bg-red-600 text-white shadow-2xs">
              RESULT : POSITIVE
            </span>
          ) : (
            <span className="px-3 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wide bg-emerald-600 text-white shadow-2xs">
              RESULT : NEGATIVE
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
