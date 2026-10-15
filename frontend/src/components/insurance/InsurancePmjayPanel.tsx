import React, { useState } from "react"
import {
  HeartHandshake,
  QrCode,
  Search,
  Landmark,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const SAMPLE_HBP_PACKAGES = [
  { code: "BM001A", name: "Coronary Angiography", category: "Cardiology", rate: 11000, los: 1, preauth: false },
  { code: "BM002B", name: "PTCA / Stenting (Single)", category: "Cardiology", rate: 65000, los: 3, preauth: true },
  { code: "SG021C", name: "Laparoscopic Cholecystectomy", category: "General Surgery", rate: 22000, los: 2, preauth: true },
  { code: "OR014A", name: "Total Knee Replacement (Unilateral)", category: "Orthopaedics", rate: 80000, los: 5, preauth: true },
  { code: "OR015A", name: "Total Hip Replacement", category: "Orthopaedics", rate: 90000, los: 6, preauth: true },
  { code: "NE005A", name: "Craniotomy for Evacuation of Haematoma", category: "Neurosurgery", rate: 50000, los: 7, preauth: true },
  { code: "OB003A", name: "Caesarean Delivery (LSCS)", category: "Obstetrics", rate: 14000, los: 4, preauth: false },
]

export const InsurancePmjayPanel: React.FC = () => {
  const [ayushmanId, setAyushmanId] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verifiedPatient, setVerifiedPatient] = useState<any>(null)
  const [hbpSearch, setHbpSearch] = useState("")

  const handleVerify = () => {
    if (!ayushmanId) return
    setVerifying(true)
    setTimeout(() => {
      setVerifying(false)
      setVerifiedPatient({
        ayushman_id: ayushmanId,
        beneficiary_name: "Rameshwar Prasad Sharma",
        gender: "Male",
        age: 52,
        state: "Uttar Pradesh",
        district: "Varanasi",
        family_id: "UP-PMJAY-8829104",
        sum_insured_limit: 500000,
        balance_available: 435000,
        status: "ELIGIBLE",
        kyc_status: "Aadhaar eKYC Verified",
        card_issue_date: "2023-04-12",
      })
      toast.success("Ayushman Bharat beneficiary verified successfully")
    }, 800)
  }

  const filteredHbp = SAMPLE_HBP_PACKAGES.filter(
    (p) =>
      p.code.toLowerCase().includes(hbpSearch.toLowerCase()) ||
      p.name.toLowerCase().includes(hbpSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(hbpSearch.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* ── PMJAY Compliance Banner ─────────────────────────────────── */}
      <div className="rounded-xl border border-orange-200 bg-orange-50/60 dark:bg-orange-950/20 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-600 text-white p-2.5 shrink-0 shadow-sm">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-orange-900 dark:text-orange-200">
              Ayushman Bharat — Pradhan Mantri Jan Arogya Yojana (AB-PMJAY) & NHA TMS 2.0
            </h3>
            <p className="text-xs text-orange-800/80 dark:text-orange-300/80 mt-0.5">
              100% Cashless treatment up to ₹5,00,000 per family/year. No out-of-pocket copay or consumable charges allowed under NHA guidelines.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Golden Card Verification Widget ────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" /> Beneficiary Verification
            </h4>
            <Badge variant="outline" className="text-[10px]">TMS 2.0 API</Badge>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Ayushman Card / ABHA / Family ID</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. PMJAY-UP-99214 or ABHA ID"
                value={ayushmanId}
                onChange={(e) => setAyushmanId(e.target.value)}
                className="text-xs h-9"
              />
              <Button
                size="sm"
                className="h-9 text-xs"
                disabled={!ayushmanId || verifying}
                onClick={handleVerify}
              >
                {verifying ? "Checking..." : "Verify"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Supports Ayushman Golden Card QR scan or manual Beneficiary Identification System (BIS) lookup.
            </p>
          </div>

          {verifiedPatient && (
            <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20 p-3 space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                    ✓ {verifiedPatient.status}
                  </span>
                  <h5 className="font-bold text-sm mt-1">{verifiedPatient.beneficiary_name}</h5>
                  <p className="text-xs text-muted-foreground">
                    {verifiedPatient.gender}, {verifiedPatient.age} yrs · {verifiedPatient.district}, {verifiedPatient.state}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Family Wallet</p>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    ₹{(verifiedPatient.balance_available / 100000).toFixed(2)}L
                  </p>
                  <p className="text-[10px] text-muted-foreground">of ₹5.00L Limit</p>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/50 text-[11px] space-y-1 text-muted-foreground">
                <p>Family ID: <strong className="text-foreground">{verifiedPatient.family_id}</strong></p>
                <p>eKYC: <strong className="text-foreground">{verifiedPatient.kyc_status}</strong></p>
              </div>

              <Button size="sm" className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white">
                Block Package for Admission
              </Button>
            </div>
          )}
        </div>

        {/* ── Health Benefit Package (HBP 2.0) Browser ───────────────── */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" /> Health Benefit Packages (HBP 2.0 Master)
              </h4>
              <p className="text-xs text-muted-foreground">Pre-fixed package rates inclusive of surgery, bed, meds & diagnostics</p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-xs w-52"
                placeholder="Search HBP code, procedure..."
                value={hbpSearch}
                onChange={(e) => setHbpSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 px-3 font-semibold">HBP Code</th>
                  <th className="py-2 px-3 font-semibold">Procedure</th>
                  <th className="py-2 px-3 font-semibold">Specialty</th>
                  <th className="py-2 px-3 font-semibold">Package Rate</th>
                  <th className="py-2 px-3 font-semibold">LOS</th>
                  <th className="py-2 px-3 font-semibold">Pre-Auth Req.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredHbp.map((p) => (
                  <tr key={p.code} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-primary">{p.code}</td>
                    <td className="py-2.5 px-3 font-medium">{p.name}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{p.category}</td>
                    <td className="py-2.5 px-3 font-bold font-mono">₹{p.rate.toLocaleString("en-IN")}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{p.los} days</td>
                    <td className="py-2.5 px-3">
                      {p.preauth ? (
                        <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                          Required
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                          Auto-Approved
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
