import React, { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  BadgeAlert,
  Plus,
  Search,
  Trash2,
  ScanLine,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { insuranceService } from "@/services/insuranceService"

export const InsuranceNonPayablesPanel: React.FC = () => {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [testAdmissionId, setTestAdmissionId] = useState("")
  const [detectionResult, setDetectionResult] = useState<any>(null)
  const [detecting, setDetecting] = useState(false)

  const [form, setForm] = useState({
    item_name: "",
    item_code: "",
    category: "consumable",
    reason: "",
    irdai_circular: "IRDAI/HLT/REG/CIR/193/07/2020",
  })

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["insurance", "non-payables"],
    queryFn: () => insuranceService.getNonPayables(),
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => insuranceService.saveNonPayable(data),
    onSuccess: () => {
      toast.success("Non-payable rule saved")
      setShowAddModal(false)
      setForm({
        item_name: "",
        item_code: "",
        category: "consumable",
        reason: "",
        irdai_circular: "IRDAI/HLT/REG/CIR/193/07/2020",
      })
      refetch()
    },
    onError: () => toast.error("Failed to save item"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => insuranceService.deleteNonPayable(id),
    onSuccess: () => {
      toast.success("Non-payable item removed")
      refetch()
    },
    onError: () => toast.error("Failed to delete item"),
  })

  const handleDetect = async () => {
    if (!testAdmissionId) return
    setDetecting(true)
    try {
      const res = await insuranceService.detectNonPayables(Number(testAdmissionId))
      setDetectionResult(res)
      toast.success("Non-payable scan complete")
    } catch (err: any) {
      toast.error(err?.message || "Failed to scan admission billing items")
    } finally {
      setDetecting(false)
    }
  }

  const itemList = Array.isArray(items) ? items : []
  const filteredItems = itemList.filter((item: any) => {
    const matchCat = categoryFilter === "all" || item.category === categoryFilter
    const matchQuery =
      !search ||
      item.item_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.reason?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchQuery
  })

  return (
    <div className="space-y-4">
      {/* ── Bill Scanner Tool ────────────────────────────────────────── */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-primary" /> IRDAI Non-Payable Auto-Detector
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instantly audit an IPD admission bill against IRDAI Non-Payable Guidelines and calculate the patient share.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="IPD Admission ID..."
              className="h-8 text-xs w-48 bg-background"
              value={testAdmissionId}
              onChange={(e) => setTestAdmissionId(e.target.value)}
            />
            <Button size="sm" className="h-8 text-xs" disabled={!testAdmissionId || detecting} onClick={handleDetect}>
              {detecting ? "Scanning..." : "Audit Bill"}
            </Button>
          </div>
        </div>

        {detectionResult && (
          <div className="mt-3 pt-3 border-t border-primary/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                Scanned {detectionResult.items_scanned_count ?? 0} billing items
              </span>
              <span className="font-bold text-red-600 dark:text-red-400">
                Non-Payable Patient Share: ₹{Number(detectionResult.total_non_payable_amount || 0).toLocaleString("en-IN")}
              </span>
            </div>
            {detectionResult.flagged_items?.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 rounded border border-border/60 bg-background p-2">
                {detectionResult.flagged_items.map((fi: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-1 border-b last:border-0 border-border/40">
                    <span className="font-medium">{fi.name}</span>
                    <span className="text-red-500 font-mono font-semibold">₹{Number(fi.amount || 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Non-Payable Master Table ─────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <BadgeAlert className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">IRDAI Non-Payables Master List</h3>
            <span className="text-xs text-muted-foreground">({filteredItems.length} items)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-xs w-48"
                placeholder="Search exclusions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={() => setShowAddModal(true)}>
              <Plus className="h-3 w-3 mr-1" /> Add Rule
            </Button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {["all", "consumable", "toiletry", "diet", "administrative", "cosmetic", "other"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Item Name</th>
                <th className="py-2.5 px-3 font-semibold">Category</th>
                <th className="py-2.5 px-3 font-semibold">IRDAI Circular</th>
                <th className="py-2.5 px-3 font-semibold">Regulatory Reason</th>
                <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading non-payable rules...
                  </td>
                </tr>
              )}

              {!isLoading && !filteredItems.length && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    No non-payable rules configured.
                  </td>
                </tr>
              )}

              {filteredItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold">{item.item_name}</td>
                  <td className="py-2.5 px-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-muted-foreground">{item.irdai_circular || "IRDAI 2020"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground max-w-sm truncate">{item.reason || "Non-medical consumable"}</td>
                  <td className="py-2.5 px-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD ITEM MODAL ───────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Add IRDAI Non-Payable Item
            </h3>

            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label>Item Name *</Label>
                <Input
                  placeholder="e.g. Surgical Gloves, Tissue Paper, Thermometer"
                  value={form.item_name}
                  onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consumable">Consumable</SelectItem>
                      <SelectItem value="toiletry">Toiletry</SelectItem>
                      <SelectItem value="diet">Diet / Food</SelectItem>
                      <SelectItem value="administrative">Administrative</SelectItem>
                      <SelectItem value="cosmetic">Cosmetic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>IRDAI Circular Ref</Label>
                  <Input
                    value={form.irdai_circular}
                    onChange={(e) => setForm((f) => ({ ...f, irdai_circular: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Non-Payable Reason</Label>
                <Input
                  placeholder="Excluded under IRDAI Annexure 1"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button
                disabled={!form.item_name || saveMutation.isPending}
                onClick={() => saveMutation.mutate(form)}
              >
                {saveMutation.isPending ? "Saving..." : "Save Rule"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
