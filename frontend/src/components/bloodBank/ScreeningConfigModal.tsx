import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  X,
  SlidersHorizontal,
  Plus,
  Trash2,
  RotateCcw,
  ShieldAlert,
  HeartPulse,
  Save,
  Loader2,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import { toast } from "sonner"
import { bloodBankService } from "@/services/bloodBankService"
import { queryKeys } from "@/constants/queryKeys"
import type {
  ScreeningConfigData,
  ScreeningQuestionItem,
  ScreeningVitalRules,
} from "@/types/bloodBank"

interface ScreeningConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ScreeningConfigModal: React.FC<ScreeningConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient()

  // Active tab: 'questions' | 'vitals'
  const [activeTab, setActiveTab] = useState<"questions" | "vitals">("questions")

  // Form State
  const [questions, setQuestions] = useState<ScreeningQuestionItem[]>([])
  const [vitalRules, setVitalRules] = useState<ScreeningVitalRules>({
    min_weight_kg: 45.0,
    min_hemoglobin_g_dl: 12.5,
    min_bp_systolic: 100,
    max_bp_systolic: 140,
    min_bp_diastolic: 60,
    max_bp_diastolic: 90,
    min_pulse: 60,
    max_pulse: 100,
    max_temperature: 37.5,
  })

  // New Question Form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newCategory, setNewCategory] = useState("Medical Condition")
  const [newDeferralType, setNewDeferralType] = useState<"temporary" | "permanent">("temporary")
  const [newDeferralDays, setNewDeferralDays] = useState<number>(30)

  // Fetch current config
  const { data: configData, isLoading: loadingConfig } = useQuery({
    queryKey: queryKeys.bloodBank.screeningConfig,
    queryFn: () => bloodBankService.getScreeningConfig(),
    enabled: isOpen,
  })

  useEffect(() => {
    if (configData) {
      setQuestions(configData.questions || [])
      setVitalRules(configData.vital_rules)
    }
  }, [configData])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: Partial<ScreeningConfigData>) =>
      bloodBankService.updateScreeningConfig(payload),
    onSuccess: (data) => {
      toast.success("Donor screening protocol & questions updated successfully!")
      queryClient.setQueryData(queryKeys.bloodBank.screeningConfig, data)
      queryClient.invalidateQueries({ queryKey: queryKeys.bloodBank.screeningConfig })
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update protocol")
    },
  })

  // Reset Mutation
  const resetMutation = useMutation({
    mutationFn: () => bloodBankService.resetScreeningConfig(),
    onSuccess: (data) => {
      toast.info("Screening protocol reset to statutory NBTC/DGHS national standards.")
      setQuestions(data.questions || [])
      setVitalRules(data.vital_rules)
      queryClient.setQueryData(queryKeys.bloodBank.screeningConfig, data)
      queryClient.invalidateQueries({ queryKey: queryKeys.bloodBank.screeningConfig })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to reset protocol")
    },
  })

  if (!isOpen) return null

  // Question helpers
  const handleToggleQuestionActive = (index: number) => {
    setQuestions((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], is_active: !updated[index].is_active }
      return updated
    })
  }

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddNewQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLabel.trim()) {
      toast.error("Please enter a question or condition description")
      return
    }

    const newId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    const newQuestion: ScreeningQuestionItem = {
      id: newId,
      label: newLabel.trim(),
      category: newCategory.trim() || "General Medical",
      deferral_type: newDeferralType,
      deferral_days: newDeferralType === "temporary" ? Number(newDeferralDays) : null,
      is_active: true,
      is_custom: true,
      display_order: questions.length + 1,
    }

    setQuestions((prev) => [...prev, newQuestion])
    setNewLabel("")
    setNewCategory("Medical Condition")
    setNewDeferralType("temporary")
    setNewDeferralDays(30)
    setShowAddForm(false)
    toast.success("New declaration question added to draft list!")
  }

  const handleSaveAll = () => {
    saveMutation.mutate({
      vital_rules: vitalRules,
      questions,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Donor Screening Protocol & Questionnaire Setup
              </h2>
              <p className="text-xs text-indigo-200 flex items-center gap-2">
                <span>Customize Pre-Donation Declaration Questions & Vital Limits</span>
                <span>•</span>
                <span className="font-semibold text-emerald-300">Live Hospital Rules</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("questions")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "questions"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Declaration Questions ({questions.filter((q) => q.is_active).length} Active)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("vitals")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "vitals"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              Physical Vital Rules (Hb, Weight, BP)
            </button>
          </div>

          <button
            type="button"
            disabled={resetMutation.isPending}
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to reset all questions and vital thresholds to National NBTC/DGHS standards?"
                )
              ) {
                resetMutation.mutate()
              }
            }}
            className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 transition"
            title="Reset to DGHS / NBTC Defaults"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to Standards
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingConfig ? (
            <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Loading protocol configuration...
            </div>
          ) : activeTab === "questions" ? (
            /* TAB 1: QUESTIONS */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Pre-Donation Medical Declaration Checklist
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Any condition checked by the donor or medical officer during screening flags an immediate deferral reason.
                  </p>
                </div>
                {!showAddForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Custom Question
                  </button>
                )}
              </div>

              {/* Add Custom Question Form */}
              {showAddForm && (
                <form
                  onSubmit={handleAddNewQuestion}
                  className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Add New Screening Question / High-Risk Parameter
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Question / Condition Statement *
                    </label>
                    <input
                      type="text"
                      required
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. COVID-19 or live vaccine taken in last 14 days / Taking blood thinners"
                      className="w-full px-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Category Tag
                      </label>
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="e.g. Vaccination / Travel"
                        className="w-full px-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Deferral Severity *
                      </label>
                      <select
                        value={newDeferralType}
                        onChange={(e) =>
                          setNewDeferralType(e.target.value as "temporary" | "permanent")
                        }
                        className="w-full px-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      >
                        <option value="temporary">Temporary Deferral</option>
                        <option value="permanent">Permanent Deferral (Ineligible)</option>
                      </select>
                    </div>

                    {newDeferralType === "temporary" && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Deferral Duration (Days)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={1825}
                          value={newDeferralDays}
                          onChange={(e) => setNewDeferralDays(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      Insert Question
                    </button>
                  </div>
                </form>
              )}

              {/* Questions List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className={`p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition ${
                      !q.is_active ? "opacity-50 bg-slate-50/50 dark:bg-slate-900/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Active Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleQuestionActive(idx)}
                        className="text-slate-400 hover:text-indigo-600 transition shrink-0"
                        title={q.is_active ? "Deactivate Question" : "Activate Question"}
                      >
                        {q.is_active ? (
                          <ToggleRight className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {q.label}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                            {q.category}
                          </span>
                          {q.deferral_type === "permanent" ? (
                            <span className="text-[10px] font-bold text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 rounded">
                              Permanent Deferral
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {q.deferral_days ? `${q.deferral_days} Days Deferral` : "Temporary Deferral"}
                            </span>
                          )}
                          {q.is_custom && (
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900">
                              Custom Hospital Question
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete for custom questions */}
                    {q.is_custom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(idx)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0"
                        title="Remove Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* TAB 2: VITALS RULES */
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mandatory Physiological Limits & Vitals Thresholds
                </h3>
                <p className="text-[11px] text-slate-500">
                  Any donor presenting with values outside these boundaries will be automatically flagged for temporary deferral.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Weight */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Minimum Donor Weight (kg) *
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Standard: 45 kg for 350 mL whole blood; 55 kg for 450 mL.
                  </p>
                  <input
                    type="number"
                    step="0.5"
                    value={vitalRules.min_weight_kg}
                    onChange={(e) =>
                      setVitalRules({ ...vitalRules, min_weight_kg: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  />
                </div>

                {/* Hemoglobin */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Minimum Hemoglobin (g/dL) *
                  </label>
                  <p className="text-[11px] text-slate-400">
                    DGHS / NBTC Standard: Minimum 12.5 g/dL for all donors.
                  </p>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalRules.min_hemoglobin_g_dl}
                    onChange={(e) =>
                      setVitalRules({
                        ...vitalRules,
                        min_hemoglobin_g_dl: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  />
                </div>

                {/* Systolic BP Range */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Systolic Blood Pressure Range (mmHg) *
                  </label>
                  <p className="text-[11px] text-slate-400">Acceptable Range (Min - Max):</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={vitalRules.min_bp_systolic}
                      onChange={(e) =>
                        setVitalRules({ ...vitalRules, min_bp_systolic: Number(e.target.value) })
                      }
                      className="w-1/2 px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                    />
                    <span className="text-slate-400 font-bold">to</span>
                    <input
                      type="number"
                      value={vitalRules.max_bp_systolic}
                      onChange={(e) =>
                        setVitalRules({ ...vitalRules, max_bp_systolic: Number(e.target.value) })
                      }
                      className="w-1/2 px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                    />
                  </div>
                </div>

                {/* Diastolic BP Range */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Diastolic Blood Pressure Range (mmHg) *
                  </label>
                  <p className="text-[11px] text-slate-400">Acceptable Range (Min - Max):</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={vitalRules.min_bp_diastolic}
                      onChange={(e) =>
                        setVitalRules({ ...vitalRules, min_bp_diastolic: Number(e.target.value) })
                      }
                      className="w-1/2 px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                    />
                    <span className="text-slate-400 font-bold">to</span>
                    <input
                      type="number"
                      value={vitalRules.max_bp_diastolic}
                      onChange={(e) =>
                        setVitalRules({ ...vitalRules, max_bp_diastolic: Number(e.target.value) })
                      }
                      className="w-1/2 px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                    />
                  </div>
                </div>

                {/* Pulse Rate */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Resting Pulse Rate Range (bpm) *
                  </label>
                  <p className="text-[11px] text-slate-400">Normative pulse: 60 - 100 bpm.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={vitalRules.min_pulse}
                      onChange={(e) =>
                        setVitalRules({ ...vitalRules, min_pulse: Number(e.target.value) })
                      }
                      className="w-1/2 px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                    />
                    <span className="text-slate-400 font-bold">to</span>
                    <input
                      type="number"
                      value={vitalRules.max_pulse}
                      onChange={(e) =>
                        setVitalRules({ ...vitalRules, max_pulse: Number(e.target.value) })
                      }
                      className="w-1/2 px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                    />
                  </div>
                </div>

                {/* Maximum Temperature */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Maximum Body Temperature (°C) *
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Normothermic threshold: ≤ 37.5 °C (99.5 °F)
                  </p>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalRules.max_temperature}
                    onChange={(e) =>
                      setVitalRules({ ...vitalRules, max_temperature: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={handleSaveAll}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md flex items-center gap-2 transition"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Protocol & Update Screening
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
