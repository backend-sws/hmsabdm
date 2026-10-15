import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Stethoscope,
  Clock,
  ShieldCheck,
  ArrowRight,
  PhoneCall,
  CheckCircle2,
} from "lucide-react"
import { useNavigate } from "react-router"

interface QueuePatient {
  id: string
  token: string
  name: string
  age: number
  gender: "M" | "F" | "O"
  abhaVerified: boolean
  doctor: string
  roomNo: string
  status: "WAITING" | "IN_CONSULTATION" | "COMPLETED"
  durationOrTime: string
}

const MOCK_QUEUE: QueuePatient[] = [
  {
    id: "q-1",
    token: "A-102",
    name: "Rajesh Kumar",
    age: 45,
    gender: "M",
    abhaVerified: true,
    doctor: "Dr. Ananya Sharma",
    roomNo: "Room 104",
    status: "IN_CONSULTATION",
    durationOrTime: "08:24",
  },
  {
    id: "q-2",
    token: "A-103",
    name: "Sunita Patel",
    age: 38,
    gender: "F",
    abhaVerified: true,
    doctor: "Dr. Ananya Sharma",
    roomNo: "Room 104",
    status: "WAITING",
    durationOrTime: "14 mins",
  },
  {
    id: "q-3",
    token: "A-104",
    name: "Vikram Singh",
    age: 52,
    gender: "F",
    abhaVerified: true,
    doctor: "Dr. Rahul Mehta",
    roomNo: "Room 105",
    status: "WAITING",
    durationOrTime: "22 mins",
  },
  {
    id: "q-4",
    token: "A-101",
    name: "Meena Joshi",
    age: 60,
    gender: "F",
    abhaVerified: true,
    doctor: "Dr. Rahul Mehta",
    roomNo: "Room 105",
    status: "COMPLETED",
    durationOrTime: "10:42 AM",
  },
]

export const OpdQueueWidget: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<"ALL" | "WAITING" | "IN_CONSULTATION" | "COMPLETED">("ALL")

  const filteredQueue = MOCK_QUEUE.filter((item) => {
    if (activeTab === "ALL") return true
    return item.status === activeTab
  })

  const consultCount = MOCK_QUEUE.filter((i) => i.status === "IN_CONSULTATION").length
  const waitingCount = MOCK_QUEUE.filter((i) => i.status === "WAITING").length
  const completedCount = MOCK_QUEUE.filter((i) => i.status === "COMPLETED").length

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
              Live OPD Queue Tracker
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">Real-time consultation queue & token assignments</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/opd")}
          className="text-xs font-semibold self-start sm:self-auto gap-1.5 border-border hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors rounded-lg px-3.5"
        >
          <span>Open OPD Desk</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Filter Tabs Bar */}
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-muted/60 p-1 rounded-lg text-xs w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition-all ${
              activeTab === "ALL"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({MOCK_QUEUE.length})
          </button>
          <button
            onClick={() => setActiveTab("IN_CONSULTATION")}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "IN_CONSULTATION"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            In Consult ({consultCount})
          </button>
          <button
            onClick={() => setActiveTab("WAITING")}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "WAITING"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Waiting ({waitingCount})
          </button>
          <button
            onClick={() => setActiveTab("COMPLETED")}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "COMPLETED"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            Completed ({completedCount})
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Clock className="h-3.5 w-3.5 text-emerald-500" />
          <span>Avg Wait: <strong className="text-foreground font-bold">12 mins</strong></span>
        </div>
      </div>

      {/* Patient Queue Cards List */}
      <div className="mt-4 space-y-2.5">
        {filteredQueue.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/60 bg-card hover:bg-slate-50/80 dark:hover:bg-accent/40 hover:border-primary/30 transition-all gap-3"
          >
            <div className="flex items-center gap-3.5">
              {/* Token Pill */}
              <div className="flex flex-col items-center justify-center px-3 py-1.5 rounded-md bg-slate-100 dark:bg-muted/80 border border-border/60 shrink-0">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">TOKEN</span>
                <span className="text-sm font-extrabold font-mono text-primary leading-tight">{item.token}</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.name}
                  </h4>
                  <span className="text-xs text-muted-foreground font-medium">
                    ({item.gender}, {item.age}y)
                  </span>

                  {item.abhaVerified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="h-3 w-3" /> ABHA Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <span>{item.doctor}</span>
                  <span>•</span>
                  <span className="font-semibold text-foreground/80">{item.roomNo}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
              {item.status === "IN_CONSULTATION" && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> In Consult
                  </span>
                  <span className="text-xs font-mono font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground/70" /> {item.durationOrTime}
                  </span>
                </div>
              )}

              {item.status === "WAITING" && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    Wait: {item.durationOrTime}
                  </span>
                  <Button size="sm" variant="outline" className="h-7 text-xs font-semibold gap-1 text-primary border-primary/40 hover:bg-primary/10 rounded-md px-2.5">
                    <PhoneCall className="h-3 w-3" /> Call
                  </Button>
                </div>
              )}

              {item.status === "COMPLETED" && (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{item.durationOrTime}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer View All Queue Link */}
      <div className="mt-5 pt-3 border-t border-border/50 text-center">
        <button
          onClick={() => navigate("/opd")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
        >
          <span>View All Queue</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

