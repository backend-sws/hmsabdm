import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sliders,
  Layers,
  Tag,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { settingsService } from "@/services/settingsService"

export interface TriageSectionConfig {
  enable_symptoms: boolean
  enable_past_medical: boolean
  enable_past_surgical: boolean
  enable_addictions: boolean
  enable_personal_history: boolean
  symptoms_catalog: string[]
  custom_sections: Array<{
    id: string
    title: string
    description?: string
    fields: Array<{
      id: string
      label: string
      type: "text" | "number" | "textarea" | "select"
      options?: string
      placeholder?: string
    }>
  }>
}

const DEFAULT_CONFIG: TriageSectionConfig = {
  enable_symptoms: true,
  enable_past_medical: true,
  enable_past_surgical: true,
  enable_addictions: true,
  enable_personal_history: true,
  symptoms_catalog: [
    "FEVER",
    "CHEST PAIN",
    "BACK PAIN",
    "HEADACHE",
    "ABD DISCOMFORT",
    "ABDOMINAL DISTENTION",
    "ABDOMINAL FULLNESS",
    "LEFT SIDE THIGH PAIN",
    "HEAVINESS IN RIGHT LOWER LIMB",
    "COUGH & COLD",
    "BREATHLESSNESS / DYSPNEA",
    "NAUSEA & VOMITING",
    "DIZZINESS / VERTIGO",
    "LOOSE MOTIONS / DIARRHEA",
    "CONSTIPATION",
    "BURNING MICTURITION",
    "GENERAL WEAKNESS / FATIGUE",
    "JOINT PAIN",
  ],
  custom_sections: [],
}

export const TriageSectionsSettingsCard: React.FC = () => {
  const queryClient = useQueryClient()

  const { data: savedData, isLoading } = useQuery({
    queryKey: ["hospital", "settings", "triage_sections"],
    queryFn: () => settingsService.getSettings("triage_sections"),
  })

  const [config, setConfig] = useState<TriageSectionConfig>(DEFAULT_CONFIG)
  const [newSymptomTag, setNewSymptomTag] = useState("")

  // Load from backend if available
  useEffect(() => {
    if (savedData && typeof savedData === "object" && Object.keys(savedData).length > 0) {
      setConfig({
        ...DEFAULT_CONFIG,
        ...savedData,
        symptoms_catalog: savedData.symptoms_catalog || DEFAULT_CONFIG.symptoms_catalog,
        custom_sections: savedData.custom_sections || [],
      })
    }
  }, [savedData])

  const saveMutation = useMutation({
    mutationFn: (newConfig: TriageSectionConfig) =>
      settingsService.saveSettings("triage_sections", newConfig as any),
    onSuccess: () => {
      toast.success("Pre-consultation triage & assessment sections configuration saved!")
      queryClient.invalidateQueries({ queryKey: ["hospital", "settings", "triage_sections"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save settings")
    },
  })

  // Add symptom tag
  const handleAddSymptomTag = () => {
    const val = newSymptomTag.trim().toUpperCase()
    if (!val) return
    if (config.symptoms_catalog.includes(val)) {
      toast.error("Symptom tag already exists in catalog")
      return
    }
    setConfig((prev) => ({
      ...prev,
      symptoms_catalog: [...prev.symptoms_catalog, val],
    }))
    setNewSymptomTag("")
  }

  // Remove symptom tag
  const handleRemoveSymptomTag = (tag: string) => {
    setConfig((prev) => ({
      ...prev,
      symptoms_catalog: prev.symptoms_catalog.filter((t) => t !== tag),
    }))
  }

  // Add custom section
  const handleAddCustomSection = () => {
    const newSec = {
      id: `sec_${Date.now()}`,
      title: "New Clinical Section",
      description: "Custom assessment section for hospital requirements",
      fields: [
        {
          id: `f_${Date.now()}`,
          label: "Assessment Field",
          type: "text" as const,
          placeholder: "Enter details...",
        },
      ],
    }
    setConfig((prev) => ({
      ...prev,
      custom_sections: [...prev.custom_sections, newSec],
    }))
  }

  // Remove custom section
  const handleRemoveCustomSection = (secId: string) => {
    setConfig((prev) => ({
      ...prev,
      custom_sections: prev.custom_sections.filter((s) => s.id !== secId),
    }))
  }

  // Add field to section
  const handleAddFieldToSection = (secId: string) => {
    setConfig((prev) => ({
      ...prev,
      custom_sections: prev.custom_sections.map((s) => {
        if (s.id !== secId) return s
        return {
          ...s,
          fields: [
            ...s.fields,
            {
              id: `f_${Date.now()}`,
              label: "New Field",
              type: "text",
              placeholder: "Enter value...",
            },
          ],
        }
      }),
    }))
  }

  return (
    <Card className="p-5 rounded-2xl border shadow-xs bg-card space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/80 gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sliders className="h-4 w-4 text-teal-600" />
            Pre-Consultation Clinical Assessment Sections & Catalog Customization
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure which clinical sections appear at the Nurse Triage desk before doctor consultation.
          </p>
        </div>

        <Button
          size="sm"
          disabled={saveMutation.isPending || isLoading}
          onClick={() => saveMutation.mutate(config)}
          className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs font-semibold rounded-xl self-start sm:self-auto"
        >
          {saveMutation.isPending ? (
            <RotateCcw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Assessment Sections
        </Button>
      </div>

      {/* ─── 1. Standard Sections Toggle ─────────────────────────────── */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          Standard Pre-Consultation Assessment Sections
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {/* Section 1 */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
            <div>
              <span className="font-semibold text-foreground block">Symptoms & Complaints</span>
              <span className="text-[11px] text-muted-foreground">Chief complaints with catalog search</span>
            </div>
            <input
              type="checkbox"
              checked={config.enable_symptoms}
              onChange={(e) => setConfig({ ...config, enable_symptoms: e.target.checked })}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
          </div>

          {/* Section 2 */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
            <div>
              <span className="font-semibold text-foreground block">Past Medical History</span>
              <span className="text-[11px] text-muted-foreground">Chronic illnesses, duration & medication</span>
            </div>
            <input
              type="checkbox"
              checked={config.enable_past_medical}
              onChange={(e) => setConfig({ ...config, enable_past_medical: e.target.checked })}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
          </div>

          {/* Section 3 */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
            <div>
              <span className="font-semibold text-foreground block">Past Surgical History</span>
              <span className="text-[11px] text-muted-foreground">Surgeries, dates, surgeons & hospitals</span>
            </div>
            <input
              type="checkbox"
              checked={config.enable_past_surgical}
              onChange={(e) => setConfig({ ...config, enable_past_surgical: e.target.checked })}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
          </div>

          {/* Section 4 */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
            <div>
              <span className="font-semibold text-foreground block">Addiction & Substance Habits</span>
              <span className="text-[11px] text-muted-foreground">Tobacco, smoking, alcohol, units</span>
            </div>
            <input
              type="checkbox"
              checked={config.enable_addictions}
              onChange={(e) => setConfig({ ...config, enable_addictions: e.target.checked })}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
          </div>

          {/* Section 5 */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
            <div>
              <span className="font-semibold text-foreground block">Personal History</span>
              <span className="text-[11px] text-muted-foreground">Diet, appetite, sleep, bladder, bowel</span>
            </div>
            <input
              type="checkbox"
              checked={config.enable_personal_history}
              onChange={(e) => setConfig({ ...config, enable_personal_history: e.target.checked })}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* ─── 2. Quick Symptoms Master Catalog ─────────────────────────── */}
      <div className="space-y-3 pt-3 border-t border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-teal-600" />
              Quick Symptoms Catalog ({config.symptoms_catalog.length} items)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              These quick tags appear in the Nurse Triage desk for fast 1-click symptom appending.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Input
              placeholder="Add symptom (e.g. CHEST PAIN)..."
              value={newSymptomTag}
              onChange={(e) => setNewSymptomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddSymptomTag()
                }
              }}
              className="h-8 text-xs w-56"
            />
            <Button
              type="button"
              size="xs"
              onClick={handleAddSymptomTag}
              className="h-8 px-2.5 text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-muted/20 border border-border/60 max-h-48 overflow-y-auto">
          {config.symptoms_catalog.map((tag, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="gap-1.5 text-xs py-1 px-2.5 bg-background border-border/70 hover:border-destructive/40 font-mono"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveSymptomTag(tag)}
                className="text-muted-foreground hover:text-destructive rounded-full"
                title={`Remove ${tag}`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* ─── 3. Hospital Custom Clinical Sections ─────────────────────── */}
      <div className="space-y-3 pt-3 border-t border-border/80">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-primary" />
              Custom Hospital Clinical Sections ({config.custom_sections.length})
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Add specialized clinical sections tailored for your hospital (e.g. Gynaecology, Pediatrics, Allergy profile).
            </p>
          </div>

          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={handleAddCustomSection}
            className="text-xs gap-1 border-primary/30 text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Add Custom Section
          </Button>
        </div>

        {config.custom_sections.length === 0 ? (
          <p className="text-xs text-muted-foreground italic bg-muted/15 p-3 rounded-xl border border-dashed border-border text-center">
            No custom clinical sections added yet. Click "Add Custom Section" if your facility requires specialized intake forms.
          </p>
        ) : (
          <div className="space-y-3">
            {config.custom_sections.map((sec) => (
              <div key={sec.id} className="p-3.5 rounded-xl border border-border bg-muted/15 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={sec.title}
                    onChange={(e) => {
                      const val = e.target.value
                      setConfig((prev) => ({
                        ...prev,
                        custom_sections: prev.custom_sections.map((s) =>
                          s.id === sec.id ? { ...s, title: val } : s
                        ),
                      }))
                    }}
                    placeholder="Section Title (e.g. Allergy Profile)"
                    className="font-bold text-xs h-8 flex-1"
                  />
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => handleRemoveCustomSection(sec.id)}
                    className="text-destructive hover:bg-destructive/10 h-8"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    Section Fields:
                  </span>
                  {sec.fields.map((field) => (
                    <div key={field.id} className="flex items-center gap-2 text-xs">
                      <Input
                        value={field.label}
                        onChange={(e) => {
                          const val = e.target.value
                          setConfig((prev) => ({
                            ...prev,
                            custom_sections: prev.custom_sections.map((s) => {
                              if (s.id !== sec.id) return s
                              return {
                                ...s,
                                fields: s.fields.map((f) =>
                                  f.id === field.id ? { ...f, label: val } : f
                                ),
                              }
                            }),
                          }))
                        }}
                        placeholder="Field Label"
                        className="h-7 text-xs flex-1"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const val = e.target.value as any
                          setConfig((prev) => ({
                            ...prev,
                            custom_sections: prev.custom_sections.map((s) => {
                              if (s.id !== sec.id) return s
                              return {
                                ...s,
                                fields: s.fields.map((f) =>
                                  f.id === field.id ? { ...f, type: val } : f
                                ),
                              }
                            }),
                          }))
                        }}
                        className="h-7 rounded border border-border bg-background px-2 text-[11px]"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Textarea</option>
                        <option value="number">Number</option>
                        <option value="select">Dropdown</option>
                      </select>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setConfig((prev) => ({
                            ...prev,
                            custom_sections: prev.custom_sections.map((s) => {
                              if (s.id !== sec.id) return s
                              return {
                                ...s,
                                fields: s.fields.filter((f) => f.id !== field.id),
                              }
                            }),
                          }))
                        }}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => handleAddFieldToSection(sec.id)}
                    className="text-[10px] gap-1 h-6 mt-1"
                  >
                    <Plus className="h-3 w-3" /> Add Field
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
