import React, { useState, useEffect } from "react"
import QRCode from "qrcode"
import { QrCode, ShieldCheck } from "lucide-react"
import { BarcodeSvg } from "@/utils/barcode"
import type { DiagnosticReportPayload } from "@/types/lab"

interface DiagnosticReportPaperProps {
  report: DiagnosticReportPayload
  includeLetterhead?: boolean
  selectedItemIds?: number[]
  publicMode?: boolean
}

const WIDAL_DILUTIONS = ["1/20", "1/40", "1/80", "1/160", "1/320", "1/640"]

export const DiagnosticReportPaper: React.FC<DiagnosticReportPaperProps> = ({
  report,
  includeLetterhead = true,
  selectedItemIds = [],
  publicMode = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")

  // Generate real scannable QR Code that links directly to the public online report
  useEffect(() => {
    if (!report?.order?.id) return
    const publicUrl = `${window.location.origin}/public/report/${report.order.id}`
    QRCode.toDataURL(publicUrl, {
      width: 160,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR Code generation error:", err))
  }, [report?.order?.id])

  // Filter sections
  const displayedSections =
    selectedItemIds.length > 0
      ? report.sections.filter((s) => selectedItemIds.includes(s.item_id))
      : report.sections

  return (
    <div
      className={`max-w-[760px] mx-auto space-y-4 print:max-w-none print:space-y-4 ${
        !includeLetterhead ? "pt-[45mm] print:pt-[45mm]" : ""
      }`}
    >
      {/* ── 1. Digital Letterhead (Omitted if pre-printed physical stationery) ── */}
      {includeLetterhead && (
        <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase leading-none">
              {report.hospital.name}
            </h1>
            <div className="text-[11px] font-bold text-slate-700 tracking-wider uppercase">
              DEPARTMENT OF PATHOLOGY & CLINICAL DIAGNOSTICS
            </div>
            <div className="text-[10px] text-slate-600 max-w-lg leading-tight mt-1">
              {report.hospital.address} • Ph: {report.hospital.phone} • Email: {report.hospital.email}
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] font-bold tracking-widest text-slate-900">
              NABL ACCREDITED
            </div>
            <div className="text-[8px] font-mono text-slate-500 mt-0.5">
              ISO 15189:2022 COMPLIANT
            </div>
            {publicMode && (
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Online Report</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. Patient Demographics & Accession Header Box (Exact Reference Layout) ── */}
      <div className="border border-slate-400 rounded-lg p-2.5 bg-white text-xs">
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* Left Column */}
          <div className="col-span-5 space-y-1">
            <div className="grid grid-cols-12">
              <span className="col-span-4 font-bold text-slate-800">Name</span>
              <span className="col-span-8 font-black text-slate-950">: {report.patient.name}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-4 font-bold text-slate-800">Age/Gender</span>
              <span className="col-span-8 text-slate-900">: {report.patient.age} Y / {report.patient.gender}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-4 font-bold text-slate-800">Referred By</span>
              <span className="col-span-8 font-semibold text-slate-900">: {report.doctor.name || "SELF"}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-4 font-bold text-slate-800">Patient ID</span>
              <span className="col-span-8 font-mono font-bold text-slate-900">
                : {report.patient.uhid || `PAT${String(report.patient.id).padStart(4, "0")}`}
              </span>
            </div>
          </div>

          {/* Middle Column */}
          <div className="col-span-4 space-y-1">
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-bold text-slate-800">Report ID</span>
              <span className="col-span-7 font-mono font-black text-slate-950">
                : {report.order.sample_accession_number || report.order.order_number}
              </span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-bold text-slate-800">Collection Date</span>
              <span className="col-span-7 text-slate-900 text-[11px]">
                : {report.order.sample_collected_at || report.order.order_date}
              </span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-bold text-slate-800">Report Date</span>
              <span className="col-span-7 text-slate-900 text-[11px]">
                : {report.order.authorized_at || report.order.result_entered_at || report.order.order_date}
              </span>
            </div>
          </div>

          {/* Right Column: Real Scannable QR Code + Vector Barcode */}
          <div className="col-span-3 flex flex-col items-center justify-center space-y-1 border-l border-slate-200 pl-2">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan QR to view report online"
                className="w-14 h-14 object-contain shadow-2xs"
                title="Scan with smartphone camera to view report online"
              />
            ) : (
              <div className="w-14 h-14 bg-slate-100 flex items-center justify-center rounded border border-slate-200">
                <QrCode className="h-8 w-8 text-slate-700" />
              </div>
            )}

            <div className="w-full flex flex-col items-center">
              <BarcodeSvg
                code={report.order.sample_accession_number || report.order.order_number}
                height={18}
                className="w-28 h-4.5"
              />
              <span className="font-mono text-[8px] font-bold text-slate-800 tracking-wider">
                {report.order.sample_accession_number || report.order.order_number}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Test Sections & Results ── */}
      <div className="space-y-6">
        {displayedSections.map((section) => {
          const isWidalSection =
            section.test_name?.toLowerCase().includes("widal") ||
            section.test_code?.toUpperCase() === "WIDAL" ||
            section.results.some((r) =>
              ["to", "th", "ao", "ah", "bh"].includes((r.short_code || "").toLowerCase())
            )

          let cultureData: any = null
          for (const r of section.results) {
            if (
              r.observed_value &&
              r.observed_value.startsWith("{") &&
              r.observed_value.includes("antibiogram")
            ) {
              try {
                cultureData = JSON.parse(r.observed_value)
                break
              } catch {
                // not json
              }
            }
          }

          /* ── CASE 1: WIDAL TEST (SLIDE METHOD) - EXACT REFERENCE LAYOUT ── */
          if (isWidalSection) {
            const getAntigenData = (keys: string[], label: string) => {
              const res = section.results.find((r) =>
                keys.some(
                  (k) =>
                    r.short_code?.toUpperCase() === k ||
                    r.name?.toUpperCase().includes(k)
                )
              )

              const rawVal = res?.observed_value || "Negative"
              let titer = "Negative"
              const dilutionsMap: Record<string, boolean> = {
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
                  titer = (parsed.titer || "Negative").replace(":", "/")
                  if (parsed.dilutions && typeof parsed.dilutions === "object") {
                    Object.assign(dilutionsMap, parsed.dilutions)
                  }
                } catch {
                  titer = rawVal.replace(":", "/")
                }
              } else {
                titer = rawVal.replace(":", "/")
                if (titer !== "Negative" && WIDAL_DILUTIONS.includes(titer)) {
                  const idx = WIDAL_DILUTIONS.indexOf(titer)
                  for (let i = 0; i <= idx; i++) {
                    dilutionsMap[WIDAL_DILUTIONS[i]] = true
                  }
                }
              }

              return { label, titer, dilutions: dilutionsMap }
            }

            const toData = getAntigenData(["TO", "TYPHI-O", "TYPHI O"], "S.Typhi-O")
            const thData = getAntigenData(["TH", "TYPHI-H", "TYPHI H"], "S.Typhi-H")
            const ahData = getAntigenData(["AH", "AO", "PARATYPHI-A", "PARATYPHI A"], "S.Paratyphi-AH")
            const bhData = getAntigenData(["BH", "PARATYPHI-B", "PARATYPHI B"], "S.Paratyphi-BH")

            const widalAntigens = [toData, thData, ahData, bhData]

            // Positive if significant titers (≥1/80 for O or ≥1/160 for H) or any active high dilution
            const isOverallPositive =
              ["1/80", "1/160", "1/320", "1/640"].includes(toData.titer) ||
              ["1/160", "1/320", "1/640"].includes(thData.titer) ||
              widalAntigens.some(
                (a) =>
                  a.dilutions["1/160"] ||
                  a.dilutions["1/320"] ||
                  a.dilutions["1/640"]
              )

            return (
              <div key={section.item_id} className="relative py-4 break-inside-avoid">
                {/* Subtle Center Laboratory Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] select-none">
                  <svg
                    className="w-80 h-80 text-teal-900"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <path d="M10 2v7.31L4.89 18.27A2 2 0 0 0 6.61 21h10.78a2 2 0 0 0 1.72-2.73L14 9.31V2" />
                    <path d="M8.5 2h7" />
                    <path d="M7 16h10" />
                  </svg>
                </div>

                {/* Centered Department & Test Headers */}
                <div className="text-center space-y-1 mb-6 relative z-10">
                  <h3 className="text-sm font-black tracking-widest text-slate-900 uppercase">
                    SEROLOGY & IMMUNOLOGY
                  </h3>
                  <h4 className="text-xs font-black tracking-wider text-slate-900 uppercase">
                    WIDAL TEST (SLIDE METHOD)
                  </h4>
                  <p className="text-[11px] italic text-slate-500 font-medium">
                    Method: {section.method || "Slide Agglutination"}
                  </p>
                </div>

                {/* Dilution Matrix Table */}
                <div className="max-w-xl mx-auto px-4 relative z-10">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="py-2.5 px-3 w-[30%] text-left font-bold text-slate-900"></th>
                        {WIDAL_DILUTIONS.map((d) => (
                          <th
                            key={d}
                            className="py-2.5 px-1 text-center font-bold text-slate-900 w-[11.6%]"
                          >
                            {d},
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {widalAntigens.map((antigen) => (
                        <tr key={antigen.label} className="leading-9">
                          <td className="py-1 px-3 font-bold text-slate-900">
                            <div className="flex items-center justify-between">
                              <span>{antigen.label}</span>
                              <span className="font-bold">:</span>
                            </div>
                          </td>
                          {WIDAL_DILUTIONS.map((dil) => {
                            const isPos = antigen.dilutions[dil]
                            return (
                              <td
                                key={dil}
                                className="py-1 px-1 text-center font-bold text-slate-900"
                              >
                                {isPos ? (
                                  <span className="text-sm font-black text-slate-950">+</span>
                                ) : (
                                  <span className="text-sm font-black text-slate-700">—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Centered Overall Result */}
                  <div className="mt-8 text-center space-y-3">
                    <div className="text-sm font-black tracking-widest text-slate-950 uppercase">
                      RESULT &nbsp; : &nbsp;{" "}
                      <span className={isOverallPositive ? "text-slate-950 font-black" : "text-slate-900"}>
                        {isOverallPositive ? "POSITIVE" : "NEGATIVE"}
                      </span>
                    </div>

                    <div className="pt-4 flex flex-col items-center justify-center space-y-1">
                      <div className="w-56 border-t border-dashed border-slate-400"></div>
                      <div className="text-[10px] text-slate-500 tracking-wider">
                        *** End of Report ***
                      </div>
                    </div>
                  </div>

                  {/* Optional Custom Pathologist Note if entered */}
                  {section.interpretation && (
                    <div
                      className="mt-4 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                      dangerouslySetInnerHTML={{ __html: section.interpretation }}
                    />
                  )}

                  {/* Footer Tagline */}
                  <div className="mt-12 text-center text-xs text-slate-400 font-normal">
                    Technology-enabled lab facility
                  </div>
                </div>
              </div>
            )
          }

          /* ── CASE 2: CULTURE & ANTIMICROBIAL SENSITIVITY ── */
          if (cultureData) {
            return (
              <div key={section.item_id} className="space-y-2 break-inside-avoid">
                <div className="border-b border-slate-900 pb-1 pt-1 flex items-baseline justify-between">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">
                      {section.test_name}
                    </h2>
                    <span className="text-[10px] text-slate-600">
                      Specimen: {cultureData.specimen || section.sample_type || "Biological Specimen"} • Method: Standard CLSI Culture & Antimicrobial Susceptibility
                    </span>
                  </div>
                </div>

                <div className="my-2 border border-slate-300 rounded overflow-hidden p-3 bg-slate-50/50 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-200 pb-2">
                    <div>
                      <strong>Specimen Source:</strong> {cultureData.specimen}
                    </div>
                    <div>
                      <strong>Incubation:</strong> {cultureData.incubation}
                    </div>
                    {cultureData.growthStatus === "No Growth" ? (
                      <div className="col-span-2 text-emerald-700 font-bold text-xs pt-1">
                        ✓ CULTURE RESULT: NO BACTERIAL GROWTH (STERILE) — {cultureData.sterileRemark || cultureData.noGrowthRemark || "No bacterial growth observed after 48 hours."}
                      </div>
                    ) : (
                      <>
                        <div>
                          <strong>Colony Count:</strong> {cultureData.colonyCount}
                        </div>
                        <div>
                          <strong>Primary Organism:</strong>{" "}
                          <span className="font-bold text-sky-800 italic">
                            {cultureData.organism}
                          </span>
                        </div>
                        {cultureData.secondOrganism && (
                          <div className="col-span-2">
                            <strong>Secondary Organism:</strong>{" "}
                            <span className="italic">{cultureData.secondOrganism}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {cultureData.growthStatus === "Growth Detected" &&
                    Array.isArray(cultureData.antibiogram) &&
                    cultureData.antibiogram.length > 0 && (
                      <div>
                        <div className="text-[10px] font-black uppercase text-slate-800 tracking-wider mb-1.5">
                          Antimicrobial Susceptibility Profile (Antibiogram - CLSI)
                        </div>
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-[10px] font-bold text-slate-800 uppercase border-y border-slate-300">
                              <th className="py-1 px-2 text-left">Antimicrobial Agent</th>
                              <th className="py-1 px-2 text-left">Class</th>
                              <th className="py-1 px-2 text-center w-24">Zone / MIC</th>
                              <th className="py-1 px-2 text-center w-28">Susceptibility</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {cultureData.antibiogram.map((ab: any, idx: number) => {
                              const s = ab.susceptibility
                              const colorClass =
                                s === "Sensitive"
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-300"
                                  : s === "Resistant"
                                  ? "text-red-700 bg-red-50 border-red-300"
                                  : "text-amber-700 bg-amber-50 border-amber-300"
                              return (
                                <tr key={idx}>
                                  <td className="py-1 px-2 font-semibold text-slate-900">
                                    {ab.name}
                                  </td>
                                  <td className="py-1 px-2 text-[10px] text-slate-500">
                                    {ab.category || "—"}
                                  </td>
                                  <td className="py-1 px-2 font-mono text-[10px] text-center text-slate-700">
                                    {ab.zoneDiameter || ab.mic || "—"}
                                  </td>
                                  <td className="py-1 px-2 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold border ${colorClass}`}
                                    >
                                      {s}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                </div>

                {/* Per-test interpretation if present */}
                {section.interpretation && (
                  <div className="mt-2 text-xs text-slate-700 bg-slate-50/70 p-2.5 rounded border border-slate-200">
                    <div className="font-bold text-[10px] uppercase text-slate-500 mb-0.5">
                      Interpretation:
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: section.interpretation }} />
                  </div>
                )}
              </div>
            )
          }

          /* ── CASE 3: STANDARD ROUTINE PARAMETERS TABLE ── */
          return (
            <div key={section.item_id} className="space-y-2 break-inside-avoid">
              <div className="border-b border-slate-900 pb-1 pt-1 flex items-baseline justify-between">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">
                    {section.test_name}
                  </h2>
                  <span className="text-[10px] text-slate-600">
                    Specimen: {section.sample_type || "Blood / Serum"}
                    {section.method ? ` • Method: ${section.method}` : ""}
                  </span>
                </div>
                {section.test_code && (
                  <span className="font-mono text-[9px] font-bold text-slate-500">
                    [{section.test_code}]
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-[10px] font-bold uppercase text-slate-700 bg-slate-50">
                      <th className="py-1.5 px-3 w-[36%]">Test Parameter</th>
                      <th className="py-1.5 px-3 w-[22%]">Observed Value</th>
                      <th className="py-1.5 px-2 w-[14%]">Unit</th>
                      <th className="py-1.5 px-3 w-[28%]">Biological Ref Interval</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {section.results.map((res) => {
                      const isAbnormal =
                        res.flag === "high" ||
                        res.flag === "low" ||
                        res.flag === "panic_high" ||
                        res.flag === "panic_low" ||
                        res.flag === "abnormal"

                      return (
                        <tr key={res.id} className="hover:bg-slate-50/50">
                          <td className="py-1 px-3 font-semibold text-slate-900">
                            {res.name}
                            {res.short_code && (
                              <span className="text-slate-400 font-normal ml-1 text-[10px]">
                                ({res.short_code})
                              </span>
                            )}
                          </td>
                          <td className="py-1 px-3 font-mono">
                            <span
                              className={`font-black ${
                                isAbnormal ? "text-red-600 font-black" : "text-slate-950"
                              }`}
                            >
                              {res.observed_value || "—"}
                            </span>
                            {res.flag && res.flag !== "normal" && (
                              <span className="ml-1 text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-red-100 text-red-700">
                                {res.flag.replace("_", " ")}
                              </span>
                            )}
                          </td>
                          <td className="py-1 px-2 font-mono text-slate-600 text-[11px]">
                            {res.unit || "—"}
                          </td>
                          <td className="py-1 px-3 text-slate-600 text-[11px]">
                            {res.range_text || "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Per-test interpretation if present */}
              {section.interpretation && (
                <div className="mt-2 text-xs text-slate-700 bg-slate-50/70 p-2 rounded border border-slate-200">
                  <div className="font-bold text-[10px] uppercase text-slate-500 mb-0.5">
                    Interpretation:
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: section.interpretation }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 4. Signatures & Digital Authorization Seal ── */}
      <div className="pt-6 border-t-2 border-slate-900 mt-8 break-inside-avoid">
        <div className="flex items-end justify-between text-xs">
          <div>
            <div className="font-mono text-[9px] text-slate-500">
              Report Generated:{" "}
              {report.order.authorized_at || report.order.order_date || new Date().toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">
              Verified via LIS QR Digital Signature Protocol
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="w-36 h-10 border-b border-dashed border-slate-400 mb-1 flex items-center justify-center">
              <span className="font-serif italic text-slate-700 text-sm">
                Dr. {report.doctor.name || "Consultant Pathologist"}
              </span>
            </div>
            <div className="font-bold text-slate-950 text-xs uppercase">
              Medical Microbiologist / Pathologist
            </div>
            <div className="text-[10px] text-slate-600 font-mono">
              Reg No: MCI/DMC-{report.doctor.id || "48921"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
