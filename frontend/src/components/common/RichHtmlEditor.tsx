import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table,
  Code,
  Eye,
  Undo,
  Redo,
  Info,
  AlertTriangle,
  CheckCircle2,
  Heading1,
  Heading2,
  RemoveFormatting,
} from "lucide-react"

interface RichHtmlEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

export const RichHtmlEditor: React.FC<RichHtmlEditorProps> = ({
  value,
  onChange,
  placeholder = "Type clinical interpretation notes...",
  minHeight = "320px",
}) => {
  const [isCodeView, setIsCodeView] = useState(false)
  const [internalValue, setInternalValue] = useState(value || "")
  const editorRef = useRef<HTMLDivElement>(null)
  const isUpdatingFromInternal = useRef(false)

  // Keep internal state synced when value prop updates from outside
  useEffect(() => {
    if (!isUpdatingFromInternal.current) {
      setInternalValue(value || "")
      if (editorRef.current && !isCodeView) {
        editorRef.current.innerHTML = value || ""
      }
    }
    isUpdatingFromInternal.current = false
  }, [value, isCodeView])

  // Sync contentEditable innerHTML when switching between code view and visual WYSIWYG
  useEffect(() => {
    if (editorRef.current && !isCodeView) {
      editorRef.current.innerHTML = internalValue || ""
    }
  }, [isCodeView])

  // Emit changes upward
  const emitChange = useCallback(
    (newHtml: string) => {
      isUpdatingFromInternal.current = true
      setInternalValue(newHtml)
      onChange(newHtml)
    },
    [onChange]
  )

  // Execute formatting command on document without stealing focus
  const execCmd = (command: string, arg: string | undefined = undefined) => {
    if (isCodeView) return
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    if (editorRef.current) {
      emitChange(editorRef.current.innerHTML)
    }
  }

  // Handle direct input in contentEditable
  const handleContentInput = () => {
    if (editorRef.current) {
      emitChange(editorRef.current.innerHTML)
    }
  }

  // Handle direct HTML code editing
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    emitChange(e.target.value)
  }

  // Insert Table Snippet
  const insertTable = () => {
    const tableHtml = `
<table class="clinical-table" style="width:100%; border-collapse:collapse; margin:12px 0; font-size:12px; border:1px solid #cbd5e1;">
  <thead>
    <tr style="background:#f1f5f9; border-bottom:1.5px solid #cbd5e1;">
      <th style="padding:7px 10px; text-align:left; font-weight:700; border:1px solid #cbd5e1; color:#0f172a;">Diagnostic Finding / Marker</th>
      <th style="padding:7px 10px; text-align:left; font-weight:700; border:1px solid #cbd5e1; color:#0f172a;">Observed Pattern</th>
      <th style="padding:7px 10px; text-align:left; font-weight:700; border:1px solid #cbd5e1; color:#0f172a;">Clinical Correlation & Suggested Action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:7px 10px; border:1px solid #cbd5e1; font-weight:600;">Markedly Elevated</td>
      <td style="padding:7px 10px; border:1px solid #cbd5e1;">Exceeds critical decision threshold</td>
      <td style="padding:7px 10px; border:1px solid #cbd5e1;">Urgent physician review; cross-check clinical symptoms</td>
    </tr>
    <tr>
      <td style="padding:7px 10px; border:1px solid #cbd5e1; font-weight:600;">Borderline Variance</td>
      <td style="padding:7px 10px; border:1px solid #cbd5e1;">Mild elevation or physiological fluctuation</td>
      <td style="padding:7px 10px; border:1px solid #cbd5e1;">Recommend repeat testing post interval</td>
    </tr>
  </tbody>
</table>
<p><br></p>`
    execCmd("insertHTML", tableHtml)
  }

  // Insert Note / Callout Box
  const insertCallout = (type: "info" | "warning" | "success" = "info") => {
    let calloutHtml = ""
    if (type === "warning") {
      calloutHtml = `
<div style="margin:10px 0; padding:10px 14px; border-left:4px solid #f59e0b; background:#fffbeb; border-radius:4px; font-size:12px; color:#92400e; border:1px solid #fef3c7; border-left-width:4px;">
  <strong>Critical Diagnostic Alert:</strong> Severely aberrant values should be confirmed with clinical correlation and repeat analysis on a fresh specimen.
</div>
<p><br></p>`
    } else if (type === "success") {
      calloutHtml = `
<div style="margin:10px 0; padding:10px 14px; border-left:4px solid #10b981; background:#ecfdf5; border-radius:4px; font-size:12px; color:#065f46; border:1px solid #d1fae5; border-left-width:4px;">
  <strong>Pathologist Verification:</strong> Analyzed on automated calibrated systems in accordance with standard internal quality control protocols.
</div>
<p><br></p>`
    } else {
      calloutHtml = `
<div style="margin:10px 0; padding:10px 14px; border-left:4px solid #3b82f6; background:#eff6ff; border-radius:4px; font-size:12px; color:#1e3a8a; border:1px solid #dbeafe; border-left-width:4px;">
  <strong>Clinical Note:</strong> CBC and biochemical parameters must be correlated with clinical symptoms and peripheral smear findings for definitive diagnosis.
</div>
<p><br></p>`
    }
    execCmd("insertHTML", calloutHtml)
  }



  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
      {/* ── TOOLBAR ── */}
      <div className="p-2 bg-muted/60 border-b border-border flex flex-wrap items-center justify-between gap-1.5 select-none">
        <div className="flex flex-wrap items-center gap-1">
          {/* Undo / Redo */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("undo")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("redo")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Heading Presets */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("formatBlock", "<h2>")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Heading 2"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("formatBlock", "<h3>")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Heading 3"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("formatBlock", "<p>")
            }}
            disabled={isCodeView}
            className="px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 text-[11px] font-bold cursor-pointer"
            title="Paragraph"
          >
            P
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Inline Styles */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("bold")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("italic")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("underline")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("strikeThrough")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("justifyLeft")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Align Left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("justifyCenter")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Align Center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("justifyRight")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Align Right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Lists */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("insertUnorderedList")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Bulleted List"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("insertOrderedList")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Elements: Table & Callout */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              insertTable()
            }}
            disabled={isCodeView}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Insert Clinical Table"
          >
            <Table className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[11px]">Table</span>
          </button>

          {/* Note Box Dropdown */}
          <div className="relative group">
            <button
              type="button"
              disabled={isCodeView}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
              title="Insert Note or Alert Box"
            >
              <Info className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px]">Note Box</span>
            </button>
            <div className="absolute left-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-xl py-1 hidden group-hover:block z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertCallout("info")
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-500/10 flex items-center gap-2"
              >
                <Info className="h-3.5 w-3.5" />
                <span>Blue Clinical Note</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertCallout("warning")
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-500/10 flex items-center gap-2"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Amber Warning Alert</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertCallout("success")
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-500/10 flex items-center gap-2"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Green Quality Verified</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("removeFormat")
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="Clear Formatting"
          >
            <RemoveFormatting className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right Toolbar: Code View Toggle */}
        <div className="flex items-center gap-2">

          {/* Toggle Code / Visual */}
          <button
            type="button"
            onClick={() => setIsCodeView(!isCodeView)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all border cursor-pointer ${
              isCodeView
                ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400"
                : "bg-background border-border text-foreground hover:bg-muted"
            }`}
            title="Toggle Visual WYSIWYG vs Raw HTML Source Code"
          >
            {isCodeView ? (
              <>
                <Eye className="h-3.5 w-3.5 text-amber-600" />
                <span>Visual WYSIWYG</span>
              </>
            ) : (
              <>
                <Code className="h-3.5 w-3.5 text-primary" />
                <span>&lt;/&gt; HTML Source</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── EDITOR BODY ── */}
      <div className="relative bg-background">
        {isCodeView ? (
          <textarea
            value={internalValue}
            onChange={handleCodeChange}
            placeholder="Type or paste raw HTML code here..."
            style={{ minHeight }}
            className="w-full p-4 font-mono text-xs text-emerald-400 bg-slate-950 border-0 focus:outline-none resize-y leading-relaxed selection:bg-emerald-900"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleContentInput}
            onBlur={handleContentInput}
            style={{ minHeight }}
            data-placeholder={placeholder}
            className="p-5 text-xs text-foreground focus:outline-none overflow-y-auto leading-relaxed max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60 empty:before:pointer-events-none [&_table]:border-collapse [&_table]:w-full [&_table]:my-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2.5 [&_th]:text-left [&_th]:font-bold [&_td]:border [&_td]:border-border [&_td]:p-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-1 [&_h2]:mt-2 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:mt-2"
          />
        )}
      </div>

      {/* Status Footer */}
      <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Mode: <strong className="text-foreground">{isCodeView ? "Raw HTML Source (<code>)" : "Visual WYSIWYG Editor (Live)"}</strong>
        </span>
        <span className="hidden sm:inline">Supports HTML tables, diagnostic alert callouts, bullet lists & formatted pathology text</span>
      </div>
    </div>
  )
}
