import React from "react"
import { Badge } from "@/components/ui/badge"
import {
  History,
  QrCode,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  FileText,
} from "lucide-react"

interface ActivityItem {
  id: string
  title: string
  detail: string
  time: string
  type: "RECEPTION" | "ABHA" | "CONSULT" | "RECORD"
}

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    title: "ABHA Card Verified",
    detail: "Rajesh Kumar (91-3829-1928-4019) via Aadhaar OTP",
    time: "4 mins ago",
    type: "ABHA",
  },
  {
    id: "act-2",
    title: "OPD Token Issued",
    detail: "Token A-103 assigned to Dr. Ananya Sharma",
    time: "12 mins ago",
    type: "RECEPTION",
  },
  {
    id: "act-3",
    title: "Consultation Completed",
    detail: "Dr. Ananya Sharma finished consultation for Token A-101",
    time: "28 mins ago",
    type: "CONSULT",
  },
  {
    id: "act-4",
    title: "Health Record Linked",
    detail: "FHIR OPD Prescription bundle linked to ABHA profile",
    time: "45 mins ago",
    type: "RECORD",
  },
]

export const RecentActivityWidget: React.FC = () => {
  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "ABHA":
        return <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
      case "RECEPTION":
        return <QrCode className="h-3.5 w-3.5 text-primary" />
      case "CONSULT":
        return <Stethoscope className="h-3.5 w-3.5 text-purple-500" />
      case "RECORD":
        return <FileText className="h-3.5 w-3.5 text-blue-500" />
      default:
        return <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Recent System Activity
            </h3>
            <p className="text-xs text-muted-foreground">Live hospital event audit log</p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px]">
          Live Feed
        </Badge>
      </div>

      <div className="space-y-3">
        {MOCK_ACTIVITIES.map((act) => (
          <div
            key={act.id}
            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border/50 shrink-0 mt-0.5">
              {getIcon(act.type)}
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground truncate">
                  {act.title}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                  {act.time}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {act.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
