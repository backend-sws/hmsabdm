import React, { useState, useRef, useEffect } from "react"
import {
  Bold,
  Italic,
  Underline,
  List,
  Table as TableIcon,
  Code,
  Eye,
  FileText,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface ClinicalEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  minHeight?: string
  testName?: string
  defaultTemplate?: string
}

export const ClinicalEditor: React.FC<ClinicalEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter clinical interpretation, impression, or diagnostic correlation...",
  label = "Clinical Interpretation & Diagnostic Impression",
  minHeight = "120px",
  testName,
  defaultTemplate,
}) => {
  const [mode, setMode] = useState<"visual" | "code">("visual")
  const contentRef = useRef<HTMLDivElement>(null)
  const isUpdatingFromInternal = useRef(false)

  // Sync external value to visual editor when not actively typing internally
  useEffect(() => {
    if (contentRef.current && !isUpdatingFromInternal.current) {
      if (contentRef.current.innerHTML !== value) {
        contentRef.current.innerHTML = value || ""
      }
    }
    isUpdatingFromInternal.current = false
  }, [value, mode])

  const handleVisualInput = () => {
    if (contentRef.current) {
      isUpdatingFromInternal.current = true
      const html = contentRef.current.innerHTML
      onChange(html)
    }
  }

  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    document.execCommand(cmd, false, val)
    if (contentRef.current) {
      contentRef.current.focus()
      handleVisualInput()
    }
  }

  // Insert standard clinical reference table
  const insertTableTemplate = () => {
    const tableHtml = `
<table class="w-full border-collapse border border-slate-300 text-xs my-2">
  <thead>
    <tr class="bg-slate-100 font-bold">
      <th class="border border-slate-300 px-2 py-1 text-left">Parameter / Antigen</th>
      <th class="border border-slate-300 px-2 py-1 text-left">Observed Titre / Value</th>
      <th class="border border-slate-300 px-2 py-1 text-left">Clinical Significance</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border border-slate-300 px-2 py-1">Sample Parameter</td>
      <td class="border border-slate-300 px-2 py-1">&ge; 1:160</td>
      <td class="border border-slate-300 px-2 py-1">Diagnostic threshold met</td>
    </tr>
  </tbody>
</table><p></p>`
    execCmd("insertHTML", tableHtml)
  }



  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      {/* Editor Header & Toolbar */}
      <div className="px-3 py-2 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <FileText className="h-3.5 w-3.5 text-primary" />
            {label}
          </Label>
          {testName && (
            <span className="text-[11px] text-muted-foreground font-semibold">
              ({testName})
            </span>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCmd("bold")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCmd("italic")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCmd("underline")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Underline"
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCmd("insertUnorderedList")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertTableTemplate}
            className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground gap-1"
            title="Insert Clinical Comparison Table"
          >
            <TableIcon className="h-3.5 w-3.5 text-primary" />
            Table
          </Button>

          {defaultTemplate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                isUpdatingFromInternal.current = false
                onChange(defaultTemplate)
              }}
              className="h-7 px-2 text-[10px] gap-1 font-semibold text-primary border-primary/30 hover:bg-primary/5"
              title="Pre-fill with standard catalog interpretation template"
            >
              <RotateCcw className="h-3 w-3" />
              Catalog Template
            </Button>
          )}

          <div className="h-4 w-px bg-border mx-1" />

          {/* Toggle Visual / Source Mode */}
          <Button
            type="button"
            variant={mode === "visual" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("visual")}
            className="h-7 px-2 text-[10px] gap-1 font-semibold"
            title="Visual Formatted Editor"
          >
            <Eye className="h-3 w-3" />
            Visual
          </Button>

          <Button
            type="button"
            variant={mode === "code" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("code")}
            className="h-7 px-2 text-[10px] gap-1 font-semibold"
            title="Edit HTML Source Code"
          >
            <Code className="h-3 w-3" />
            HTML
          </Button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="p-3 bg-background">
        {mode === "visual" ? (
          <div
            ref={contentRef}
            contentEditable
            onInput={handleVisualInput}
            onBlur={handleVisualInput}
            style={{ minHeight }}
            data-placeholder={placeholder}
            className="outline-none text-xs text-foreground font-sans leading-relaxed prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:cursor-text [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-slate-300 [&_table]:my-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-1.5 [&_th]:bg-slate-100 [&_th]:text-left [&_td]:border [&_td]:border-slate-300 [&_td]:p-1.5 [&_ul]:list-disc [&_ul]:pl-5"
          />
        ) : (
          <textarea
            rows={5}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ minHeight }}
            className="w-full rounded-lg border border-border bg-slate-950 text-slate-100 p-2.5 font-mono text-xs outline-none focus:border-primary"
            placeholder="Type raw HTML tags..."
          />
        )}
      </div>

      <div className="px-3 py-1.5 bg-muted/20 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Printed under this test on the official diagnostic report.</span>
        <span>Mode: <strong className="uppercase text-foreground">{mode}</strong></span>
      </div>
    </div>
  )
}
