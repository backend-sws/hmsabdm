import React, { useState, useMemo } from "react"
import {
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Beaker,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface AntibioticSensitivity {
  name: string
  category: string
  susceptibility: "Sensitive" | "Intermediate" | "Resistant" | "Not Tested"
  zoneDiameter?: string // e.g. "22 mm"
  mic?: string // e.g. "<= 2 ug/mL"
}

export interface CultureSensitivityData {
  growthStatus: "No Growth" | "Growth Detected"
  specimen: string
  incubation: string
  colonyCount: string
  organism: string
  secondOrganism?: string
  noGrowthRemark: string
  antibiogram: AntibioticSensitivity[]
}

interface CultureSensitivityEntryProps {
  onResultChange: (summaryText: string, structuredJson: string) => void
  onInterpretationGenerate?: (interpretationHtml: string) => void
  initialValue?: string // JSON or plain text
  testName?: string
  defaultSpecimen?: string
}

// Preset Antibiotic Panels
const URINE_PANEL: AntibioticSensitivity[] = [
  { name: "Nitrofurantoin", category: "Urinary Antiseptic", susceptibility: "Sensitive", zoneDiameter: "20 mm", mic: "≤ 16 µg/mL" },
  { name: "Fosfomycin", category: "Phosphonic Acid", susceptibility: "Sensitive", zoneDiameter: "26 mm", mic: "≤ 32 µg/mL" },
  { name: "Amikacin", category: "Aminoglycoside", susceptibility: "Sensitive", zoneDiameter: "22 mm", mic: "≤ 4 µg/mL" },
  { name: "Gentamicin", category: "Aminoglycoside", susceptibility: "Sensitive", zoneDiameter: "19 mm", mic: "≤ 2 µg/mL" },
  { name: "Ciprofloxacin", category: "Fluoroquinolone", susceptibility: "Resistant", zoneDiameter: "12 mm", mic: "> 4 µg/mL" },
  { name: "Norfloxacin", category: "Fluoroquinolone", susceptibility: "Resistant", zoneDiameter: "11 mm", mic: "> 8 µg/mL" },
  { name: "Ceftriaxone", category: "Cephalosporin (3rd Gen)", susceptibility: "Sensitive", zoneDiameter: "24 mm", mic: "≤ 1 µg/mL" },
  { name: "Cefepime", category: "Cephalosporin (4th Gen)", susceptibility: "Sensitive", zoneDiameter: "22 mm", mic: "≤ 2 µg/mL" },
  { name: "Amoxicillin-Clavulanate", category: "Penicillin + BLI", susceptibility: "Intermediate", zoneDiameter: "16 mm", mic: "16/8 µg/mL" },
  { name: "Piperacillin-Tazobactam", category: "Ureidopenicillin + BLI", susceptibility: "Sensitive", zoneDiameter: "25 mm", mic: "≤ 8 µg/mL" },
  { name: "Meropenem", category: "Carbapenem", susceptibility: "Sensitive", zoneDiameter: "28 mm", mic: "≤ 0.5 µg/mL" },
  { name: "Cotrimoxazole", category: "Folate Antagonist", susceptibility: "Resistant", zoneDiameter: "10 mm", mic: "> 4/76 µg/mL" },
]

const GRAM_NEGATIVE_PANEL: AntibioticSensitivity[] = [
  { name: "Amikacin", category: "Aminoglycoside", susceptibility: "Sensitive", zoneDiameter: "23 mm", mic: "≤ 4 µg/mL" },
  { name: "Gentamicin", category: "Aminoglycoside", susceptibility: "Sensitive", zoneDiameter: "20 mm", mic: "≤ 2 µg/mL" },
  { name: "Ceftriaxone", category: "Cephalosporin (3rd Gen)", susceptibility: "Resistant", zoneDiameter: "14 mm", mic: "> 4 µg/mL" },
  { name: "Ceftazidime", category: "Cephalosporin (3rd Gen)", susceptibility: "Resistant", zoneDiameter: "13 mm", mic: "> 8 µg/mL" },
  { name: "Cefepime", category: "Cephalosporin (4th Gen)", susceptibility: "Intermediate", zoneDiameter: "17 mm", mic: "8 µg/mL" },
  { name: "Piperacillin-Tazobactam", category: "Ureidopenicillin + BLI", susceptibility: "Sensitive", zoneDiameter: "24 mm", mic: "≤ 8 µg/mL" },
  { name: "Cefoperazone-Sulbactam", category: "Cephalosporin + BLI", susceptibility: "Sensitive", zoneDiameter: "22 mm", mic: "≤ 16 µg/mL" },
  { name: "Meropenem", category: "Carbapenem", susceptibility: "Sensitive", zoneDiameter: "28 mm", mic: "≤ 0.5 µg/mL" },
  { name: "Imipenem", category: "Carbapenem", susceptibility: "Sensitive", zoneDiameter: "27 mm", mic: "≤ 0.5 µg/mL" },
  { name: "Ciprofloxacin", category: "Fluoroquinolone", susceptibility: "Resistant", zoneDiameter: "12 mm", mic: "> 4 µg/mL" },
  { name: "Levofloxacin", category: "Fluoroquinolone", susceptibility: "Resistant", zoneDiameter: "14 mm", mic: "> 4 µg/mL" },
  { name: "Colistin", category: "Polymyxin", susceptibility: "Sensitive", zoneDiameter: "NA", mic: "≤ 1 µg/mL" },
  { name: "Tigecycline", category: "Glycylcycline", susceptibility: "Sensitive", zoneDiameter: "21 mm", mic: "≤ 0.5 µg/mL" },
]

const GRAM_POSITIVE_PANEL: AntibioticSensitivity[] = [
  { name: "Vancomycin", category: "Glycopeptide", susceptibility: "Sensitive", zoneDiameter: "NA", mic: "≤ 1 µg/mL" },
  { name: "Linezolid", category: "Oxazolidinone", susceptibility: "Sensitive", zoneDiameter: "26 mm", mic: "≤ 2 µg/mL" },
  { name: "Teicoplanin", category: "Glycopeptide", susceptibility: "Sensitive", zoneDiameter: "21 mm", mic: "≤ 2 µg/mL" },
  { name: "Cefoxitin (MRSA Screen)", category: "Cephamycin", susceptibility: "Sensitive", zoneDiameter: "24 mm", mic: "Negative" },
  { name: "Amoxicillin-Clavulanate", category: "Penicillin + BLI", susceptibility: "Sensitive", zoneDiameter: "25 mm", mic: "≤ 4 µg/mL" },
  { name: "Clindamycin", category: "Lincosamide", susceptibility: "Sensitive", zoneDiameter: "24 mm", mic: "≤ 0.25 µg/mL" },
  { name: "Erythromycin", category: "Macrolide", susceptibility: "Resistant", zoneDiameter: "12 mm", mic: "> 4 µg/mL" },
  { name: "Doxycycline", category: "Tetracycline", susceptibility: "Sensitive", zoneDiameter: "22 mm", mic: "≤ 1 µg/mL" },
  { name: "Ciprofloxacin", category: "Fluoroquinolone", susceptibility: "Resistant", zoneDiameter: "13 mm", mic: "> 2 µg/mL" },
  { name: "Gentamicin (High Level)", category: "Aminoglycoside", susceptibility: "Sensitive", zoneDiameter: "18 mm", mic: "Synergistic" },
]

const COMMON_ORGANISMS = [
  "Escherichia coli",
  "Klebsiella pneumoniae",
  "Pseudomonas aeruginosa",
  "Proteus mirabilis",
  "Proteus vulgaris",
  "Acinetobacter baumannii",
  "Enterobacter cloacae",
  "Citrobacter freundii",
  "Salmonella enterica serovar Typhi",
  "Staphylococcus aureus (MSSA)",
  "Methicillin-Resistant Staphylococcus aureus (MRSA)",
  "Coagulase-Negative Staphylococci (CONS)",
  "Enterococcus faecalis",
  "Enterococcus faecium (VRE)",
  "Streptococcus pneumoniae",
  "Streptococcus pyogenes (Group A)",
  "Streptococcus agalactiae (Group B)",
  "Candida albicans",
  "Candida non-albicans",
]

const COLONY_COUNTS = [
  "> 10⁵ CFU/mL (Significant Bacteriuria)",
  "10⁴ - 10⁵ CFU/mL (Borderline Count - Clinical Correlation)",
  "< 10⁴ CFU/mL (Low Colony Count / Probable Contamination)",
  "Heavy Growth (Pure Culture)",
  "Moderate Growth",
  "Scanty / Light Growth",
]

const SPECIMENS = [
  "Urine (Clean-Catch Midstream)",
  "Urine (Catheterized)",
  "Blood (Peripheral Vein)",
  "Blood (Central Venous Catheter)",
  "Sputum (Deep Expectorated)",
  "Endotracheal Aspirate (ETA)",
  "Pus / Wound Discharge",
  "High Vaginal Swab (HVS)",
  "Throat Swab",
  "Stool",
  "Pleural Fluid",
  "Ascitic / Peritoneal Fluid",
  "Synovial / Joint Fluid",
  "Cerebrospinal Fluid (CSF)",
  "Ear Swab",
  "Conjunctival / Eye Swab",
]

export const CultureSensitivityEntry: React.FC<CultureSensitivityEntryProps> = ({
  onResultChange,
  onInterpretationGenerate,
  initialValue = "",
  testName = "Culture & Sensitivity",
  defaultSpecimen,
}) => {
  // Parse initial state if provided
  const [data, setData] = useState<CultureSensitivityData>(() => {
    let resolvedSpecimen = defaultSpecimen || "Urine (Clean-Catch Midstream)"
    if (testName.toLowerCase().includes("blood")) resolvedSpecimen = "Blood (Peripheral Vein)"
    else if (testName.toLowerCase().includes("sputum")) resolvedSpecimen = "Sputum (Deep Expectorated)"
    else if (testName.toLowerCase().includes("wound") || testName.toLowerCase().includes("pus")) resolvedSpecimen = "Pus / Wound Discharge"
    else if (testName.toLowerCase().includes("throat")) resolvedSpecimen = "Throat Swab"
    else if (testName.toLowerCase().includes("stool")) resolvedSpecimen = "Stool"
    else if (testName.toLowerCase().includes("ear")) resolvedSpecimen = "Ear Swab"
    else if (testName.toLowerCase().includes("eye")) resolvedSpecimen = "Conjunctival / Eye Swab"
    else if (testName.toLowerCase().includes("vaginal") || testName.toLowerCase().includes("hvs")) resolvedSpecimen = "High Vaginal Swab (HVS)"

    if (initialValue) {
      try {
        const parsed = JSON.parse(initialValue)
        if (parsed.growthStatus && Array.isArray(parsed.antibiogram)) {
          return {
            growthStatus: parsed.growthStatus,
            specimen: parsed.specimen || resolvedSpecimen,
            incubation: parsed.incubation || "48 Hours at 37°C Aerobic",
            colonyCount: parsed.colonyCount || "> 10⁵ CFU/mL (Significant Bacteriuria)",
            organism: parsed.organism || "Escherichia coli",
            secondOrganism: parsed.secondOrganism || "",
            noGrowthRemark: parsed.noGrowthRemark || "No bacterial growth observed after 48 hours of aerobic incubation at 37°C.",
            antibiogram: parsed.antibiogram,
          }
        }
      } catch {
        // Not JSON
      }
    }

    // Default sterile setup
    return {
      growthStatus: "No Growth",
      specimen: resolvedSpecimen,
      incubation: "48 Hours at 37°C Aerobic",
      colonyCount: "> 10⁵ CFU/mL (Significant Bacteriuria)",
      organism: "Escherichia coli",
      secondOrganism: "",
      noGrowthRemark: "No bacterial growth observed after 48 hours of aerobic incubation at 37°C.",
      antibiogram: URINE_PANEL,
    }
  })

  const [customAntiName, setCustomAntiName] = useState("")
  const [customAntiCategory, setCustomAntiCategory] = useState("Other Antimicrobial")

  // Helper to generate formatted HTML report & summary
  const syncToParent = (curr: CultureSensitivityData) => {
    let summaryText = ""
    let reportHtml = ""

    if (curr.growthStatus === "No Growth") {
      summaryText = `Sterile - ${curr.noGrowthRemark}`
      reportHtml = `
<div class="culture-report sterile-report" style="font-family: inherit; font-size: 12px; line-height: 1.5;">
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
      <span><strong>Specimen:</strong> ${curr.specimen}</span>
      <span><strong>Incubation Period:</strong> ${curr.incubation}</span>
    </div>
    <div style="color: #059669; font-weight: bold; font-size: 13px; margin-top: 4px;">
      ✓ CULTURE RESULT: NO BACTERIAL GROWTH (STERILE)
    </div>
    <div style="color: #475569; font-size: 12px; margin-top: 4px;">
      ${curr.noGrowthRemark}
    </div>
  </div>
</div>`.trim()
    } else {
      const sensitiveList = curr.antibiogram
        .filter((a) => a.susceptibility === "Sensitive")
        .map((a) => a.name)
        .join(", ")
      const resistantList = curr.antibiogram
        .filter((a) => a.susceptibility === "Resistant")
        .map((a) => a.name)
        .join(", ")

      summaryText = `Growth: ${curr.organism} (${curr.colonyCount}). Sensitive: ${sensitiveList || "None"}. Resistant: ${resistantList || "None"}.`

      const rowsHtml = curr.antibiogram
        .map((a) => {
          const color =
            a.susceptibility === "Sensitive"
              ? "#16a34a"
              : a.susceptibility === "Resistant"
              ? "#dc2626"
              : a.susceptibility === "Intermediate"
              ? "#d97706"
              : "#64748b"
          const bg =
            a.susceptibility === "Sensitive"
              ? "#dcfce7"
              : a.susceptibility === "Resistant"
              ? "#fee2e2"
              : a.susceptibility === "Intermediate"
              ? "#fef3c7"
              : "#f1f5f9"

          return `
<tr>
  <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 500;">${a.name}</td>
  <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b; font-size: 11px;">${a.category || "—"}</td>
  <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px; text-align: center;">${a.zoneDiameter || a.mic || "—"}</td>
  <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center;">
    <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; color: ${color}; background-color: ${bg};">
      ${a.susceptibility}
    </span>
  </td>
</tr>`.trim()
        })
        .join("\n")

      reportHtml = `
<div class="culture-report growth-report" style="font-family: inherit; font-size: 12px; line-height: 1.5;">
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
      <span><strong>Specimen:</strong> ${curr.specimen}</span>
      <span><strong>Incubation:</strong> ${curr.incubation}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
      <span><strong>Colony Count:</strong> ${curr.colonyCount}</span>
      <span><strong>Primary Organism:</strong> <em style="font-weight: 700; color: #0284c7;">${curr.organism}</em></span>
    </div>
    ${curr.secondOrganism ? `<div><strong>Secondary Organism:</strong> <em>${curr.secondOrganism}</em></div>` : ""}
  </div>

  <h5 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #1e293b; margin: 10px 0 6px 0; letter-spacing: 0.5px;">
    ANTIMICROBIAL SUSCEPTIBILITY PROFILE (ANTIBIOGRAM - CLSI GUIDELINES)
  </h5>
  <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px;">
    <thead>
      <tr style="background-color: #f1f5f9; text-align: left;">
        <th style="padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase;">Antimicrobial Agent</th>
        <th style="padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase;">Class</th>
        <th style="padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; text-align: center;">Zone / MIC</th>
        <th style="padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; text-align: center;">Susceptibility</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div style="font-size: 10.5px; color: #64748b; font-style: italic;">
    * S = Sensitive, I = Intermediate, R = Resistant. Susceptibility testing performed as per standard CLSI disk diffusion / MIC break point guidelines.
  </div>
</div>`.trim()
    }

    onResultChange(summaryText, JSON.stringify(curr))
    if (onInterpretationGenerate) onInterpretationGenerate(reportHtml)
  }

  const handleUpdate = (updated: CultureSensitivityData) => {
    setData(updated)
    syncToParent(updated)
  }

  const handleSusceptibilityChange = (
    index: number,
    val: "Sensitive" | "Intermediate" | "Resistant" | "Not Tested"
  ) => {
    const nextList = [...data.antibiogram]
    nextList[index] = { ...nextList[index], susceptibility: val }
    handleUpdate({ ...data, antibiogram: nextList })
  }

  const handleMetricChange = (index: number, field: "zoneDiameter" | "mic", val: string) => {
    const nextList = [...data.antibiogram]
    nextList[index] = { ...nextList[index], [field]: val }
    handleUpdate({ ...data, antibiogram: nextList })
  }

  const handleRemoveAntibiotic = (index: number) => {
    const nextList = data.antibiogram.filter((_, i) => i !== index)
    handleUpdate({ ...data, antibiogram: nextList })
  }

  const handleAddCustomAntibiotic = () => {
    if (!customAntiName.trim()) return
    const nextList = [
      ...data.antibiogram,
      {
        name: customAntiName.trim(),
        category: customAntiCategory.trim(),
        susceptibility: "Sensitive" as const,
        zoneDiameter: "20 mm",
        mic: "≤ 2 µg/mL",
      },
    ]
    handleUpdate({ ...data, antibiogram: nextList })
    setCustomAntiName("")
  }

  const handleSetAll = (status: "Sensitive" | "Resistant") => {
    const nextList = data.antibiogram.map((a) => ({ ...a, susceptibility: status }))
    handleUpdate({ ...data, antibiogram: nextList })
  }

  const loadPanel = (panel: AntibioticSensitivity[]) => {
    handleUpdate({ ...data, antibiogram: panel })
  }

  // Count stats
  const stats = useMemo(() => {
    let s = 0
    let i = 0
    let r = 0
    data.antibiogram.forEach((a) => {
      if (a.susceptibility === "Sensitive") s++
      else if (a.susceptibility === "Intermediate") i++
      else if (a.susceptibility === "Resistant") r++
    })
    return { s, i, r, total: data.antibiogram.length }
  }, [data.antibiogram])

  return (
    <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs my-3">
      {/* Header Banner */}
      <div className="p-4 bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-b border-border/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
            <Beaker className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                Microbiology Culture & Antimicrobial Sensitivity Workstation
              </h3>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-semibold">
                CLSI Standards
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Direct entry for specimen isolation, colony counts, and CLSI antibiotic susceptibility profiles
            </p>
          </div>
        </div>

        {/* Growth Toggle Tab */}
        <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/60">
          <button
            type="button"
            onClick={() => handleUpdate({ ...data, growthStatus: "No Growth" })}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              data.growthStatus === "No Growth"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Sterile / No Growth
          </button>
          <button
            type="button"
            onClick={() => handleUpdate({ ...data, growthStatus: "Growth Detected" })}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              data.growthStatus === "Growth Detected"
                ? "bg-red-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Pathogen Isolated (Growth)
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Specimen and Incubation Meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 text-xs">
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Specimen / Source
            </Label>
            <select
              value={data.specimen}
              onChange={(e) => handleUpdate({ ...data, specimen: e.target.value })}
              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-medium"
            >
              {SPECIMENS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Incubation Duration & Condition
            </Label>
            <select
              value={data.incubation}
              onChange={(e) => handleUpdate({ ...data, incubation: e.target.value })}
              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-medium"
            >
              <option value="48 Hours at 37°C Aerobic">48 Hours at 37°C Aerobic</option>
              <option value="24 Hours at 37°C Aerobic">24 Hours at 37°C Aerobic</option>
              <option value="72 Hours at 37°C Aerobic">72 Hours at 37°C Aerobic</option>
              <option value="5 Days Automated Continuous Blood Culture (Aerobic)">
                5 Days Automated Continuous Blood Culture (Aerobic)
              </option>
              <option value="48 Hours Anaerobic Incubation">48 Hours Anaerobic Incubation</option>
              <option value="4 Weeks on SDA at 25°C & 37°C (Fungal)">
                4 Weeks on SDA at 25°C & 37°C (Fungal)
              </option>
            </select>
          </div>
        </div>

        {/* CONDITION 1: NO GROWTH */}
        {data.growthStatus === "No Growth" ? (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>Standard Sterile Report Comment</span>
            </div>
            <Input
              value={data.noGrowthRemark}
              onChange={(e) => handleUpdate({ ...data, noGrowthRemark: e.target.value })}
              placeholder="e.g. No bacterial growth observed after 48 hours of aerobic incubation at 37°C."
              className="text-xs font-medium bg-background"
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground font-medium">Quick Presets:</span>
              <button
                type="button"
                onClick={() =>
                  handleUpdate({
                    ...data,
                    noGrowthRemark: "No bacterial growth observed after 48 hours of aerobic incubation at 37°C.",
                  })
                }
                className="text-[10.5px] px-2 py-0.8 rounded-md bg-muted border border-border text-foreground hover:bg-muted/80"
              >
                Urine/Pus (48h)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdate({
                    ...data,
                    noGrowthRemark: "Sterile after 5 days of automated continuous aerobic blood culture.",
                  })
                }
                className="text-[10.5px] px-2 py-0.8 rounded-md bg-muted border border-border text-foreground hover:bg-muted/80"
              >
                Blood Culture (5 Days)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdate({
                    ...data,
                    noGrowthRemark: "Normal Commensal Flora isolated. No pathogenic organisms grown.",
                  })
                }
                className="text-[10.5px] px-2 py-0.8 rounded-md bg-muted border border-border text-foreground hover:bg-muted/80"
              >
                Normal Commensal Flora
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdate({
                    ...data,
                    noGrowthRemark: "No fungal growth observed after 4 weeks of incubation on Sabouraud Dextrose Agar at 25°C and 37°C.",
                  })
                }
                className="text-[10.5px] px-2 py-0.8 rounded-md bg-muted border border-border text-foreground hover:bg-muted/80"
              >
                Fungal (4 Weeks)
              </button>
            </div>
          </div>
        ) : (
          /* CONDITION 2: PATHOGEN ISOLATED */
          <div className="space-y-4">
            {/* Organism & Colony Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Primary Isolated Pathogen *
                </Label>
                <select
                  value={data.organism}
                  onChange={(e) => handleUpdate({ ...data, organism: e.target.value })}
                  className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-bold text-foreground"
                >
                  {COMMON_ORGANISMS.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Colony Count / Growth Density *
                </Label>
                <select
                  value={data.colonyCount}
                  onChange={(e) => handleUpdate({ ...data, colonyCount: e.target.value })}
                  className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground"
                >
                  {COLONY_COUNTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Secondary Organism (Optional)
                </Label>
                <Input
                  value={data.secondOrganism || ""}
                  onChange={(e) => handleUpdate({ ...data, secondOrganism: e.target.value })}
                  placeholder="e.g. Enterococcus faecalis (Scanty)"
                  className="h-8.5 text-xs bg-background"
                />
              </div>
            </div>

            {/* Antibiogram Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Load Panels:
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => loadPanel(URINE_PANEL)}
                  className="h-7 text-xs font-semibold"
                >
                  Urine (UTI)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => loadPanel(GRAM_NEGATIVE_PANEL)}
                  className="h-7 text-xs font-semibold"
                >
                  Gram Negative
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => loadPanel(GRAM_POSITIVE_PANEL)}
                  className="h-7 text-xs font-semibold"
                >
                  Gram Positive
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetAll("Sensitive")}
                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700 border-emerald-500/30"
                >
                  All Sensitive (S)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetAll("Resistant")}
                  className="h-7 text-xs text-red-600 hover:text-red-700 border-red-500/30"
                >
                  All Resistant (R)
                </Button>
              </div>
            </div>

            {/* Antibiogram Matrix Table */}
            <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[11px] font-bold uppercase text-muted-foreground">
                    <th className="py-2.5 px-3">Antibiotic Name</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3 w-28">Zone Diam.</th>
                    <th className="py-2.5 px-3 w-28">MIC Val</th>
                    <th className="py-2.5 px-3 text-center w-52">Susceptibility (CLSI)</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.antibiogram.map((item, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-muted/20 transition-colors ${
                        item.susceptibility === "Resistant"
                          ? "bg-red-500/5"
                          : item.susceptibility === "Sensitive"
                          ? "bg-emerald-500/5"
                          : ""
                      }`}
                    >
                      <td className="py-2 px-3 font-semibold text-foreground">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-[11px]">
                        {item.category}
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={item.zoneDiameter || ""}
                          onChange={(e) => handleMetricChange(idx, "zoneDiameter", e.target.value)}
                          placeholder="e.g. 22 mm"
                          className="h-7 text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={item.mic || ""}
                          onChange={(e) => handleMetricChange(idx, "mic", e.target.value)}
                          placeholder="e.g. ≤ 2 µg/mL"
                          className="h-7 text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex rounded-lg border border-border p-0.5 bg-background shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleSusceptibilityChange(idx, "Sensitive")}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                              item.susceptibility === "Sensitive"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            S (Sensitive)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSusceptibilityChange(idx, "Intermediate")}
                            className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                              item.susceptibility === "Intermediate"
                                ? "bg-amber-500 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            I (Interm.)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSusceptibilityChange(idx, "Resistant")}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                              item.susceptibility === "Resistant"
                                ? "bg-red-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            R (Resistant)
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveAntibiotic(idx)}
                          className="text-muted-foreground hover:text-red-500 p-1 transition-colors"
                          title="Remove Antibiotic"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add Custom Antibiotic */}
              <div className="p-3 bg-muted/30 border-t border-border flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Add Antibiotic:</span>
                <Input
                  value={customAntiName}
                  onChange={(e) => setCustomAntiName(e.target.value)}
                  placeholder="Antibiotic name (e.g. Daptomycin)"
                  className="h-7.5 w-48 text-xs bg-background"
                />
                <Input
                  value={customAntiCategory}
                  onChange={(e) => setCustomAntiCategory(e.target.value)}
                  placeholder="Category (e.g. Lipopeptide)"
                  className="h-7.5 w-40 text-xs bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleAddCustomAntibiotic}
                  className="h-7.5 text-xs gap-1 font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Add to Profile
                </Button>
              </div>
            </div>

            {/* Antibiogram Summary Counter */}
            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 px-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Sensitive: {stats.s}
                </span>
                <span className="flex items-center gap-1 font-semibold text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Intermediate: {stats.i}
                </span>
                <span className="flex items-center gap-1 font-semibold text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Resistant: {stats.r}
                </span>
                <span>Total Tested: {stats.total}</span>
              </div>
              <span className="text-[11px] italic">
                Report auto-generates printable Antibiogram table with CLSI interpretations
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
