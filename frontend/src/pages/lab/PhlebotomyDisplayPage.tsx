import React, { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Clock,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Activity,
  Layers,
} from "lucide-react"
import { labService } from "@/services/labService"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const PhlebotomyDisplayPage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const lastCalledTokenRef = useRef<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Real-time clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Poll Queue Display every 4 seconds
  const { data: queueData } = useQuery({
    queryKey: ["lab", "queue-display"],
    queryFn: () => labService.getQueueDisplay(),
    refetchInterval: 4000,
  })

  // Play two-tone airport/hospital chime via Web Audio API
  const playChime = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        audioCtxRef.current = new AudioContextClass()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") {
        ctx.resume()
      }

      const now = ctx.currentTime
      // Tone 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = "sine"
      osc1.frequency.setValueAtTime(659.25, now)
      gain1.gain.setValueAtTime(0, now)
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.05)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.8)

      // Tone 2: C5 (523.25 Hz) after 0.3s
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = "sine"
      osc2.frequency.setValueAtTime(523.25, now + 0.35)
      gain2.gain.setValueAtTime(0, now + 0.35)
      gain2.gain.linearRampToValueAtTime(0.5, now + 0.4)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.35)
      osc2.stop(now + 1.2)
    } catch {
      // Audio play error ignored
    }
  }

  // Detect newly called token to trigger chime & visual flash
  useEffect(() => {
    if (queueData?.currently_calling) {
      const currentToken = `${queueData.currently_calling.token_number}-${queueData.currently_calling.token_called_at}`
      if (lastCalledTokenRef.current && lastCalledTokenRef.current !== currentToken) {
        if (audioEnabled) {
          playChime()
        }
      }
      lastCalledTokenRef.current = currentToken
    }
  }, [queueData, audioEnabled])

  const enableAudio = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      audioCtxRef.current = new AudioContextClass()
      audioCtxRef.current.resume()
      setAudioEnabled(true)
      playChime()
    } catch {
      setAudioEnabled(true)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
        setIsFullscreen(false)
      }
    }
  }

  const activeToken = queueData?.currently_calling
  const waitingTokens = queueData?.upcoming_waiting || []
  const recentCalls = queueData?.recent_called || []

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between font-sans select-none overflow-hidden p-4 sm:p-6 lg:p-8">
      {/* ───────────────── TOP HEADER ───────────────── */}
      <header className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-slate-800 gap-4">
        {/* Hospital Brand & Department */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/30">
            <Activity className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                Laboratory Phlebotomy Center
              </h1>
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-widest">
                <Radio className="h-3 w-3 animate-ping" />
                Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Sample Collection & Blood Draw Token Calling System
            </p>
          </div>
        </div>

        {/* Clock & Controls */}
        <div className="flex items-center gap-4">
          {/* Digital Clock */}
          <div className="text-right bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
            <div className="font-mono text-2xl sm:text-3xl font-black text-cyan-400 tracking-wider">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
              {currentTime.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>

          {/* Audio Chime Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={audioEnabled ? () => setAudioEnabled(false) : enableAudio}
            className={`h-11 px-3.5 rounded-xl border transition-all text-xs font-bold gap-2 ${
              audioEnabled
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{audioEnabled ? "Chime ON" : "Unmute Chime"}</span>
          </Button>

          {/* Fullscreen Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="h-11 px-3 rounded-xl bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
            title="Toggle TV Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Audio permission banner if muted */}
      {!audioEnabled && (
        <div
          onClick={enableAudio}
          className="my-3 py-2 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-all"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-amber-400 animate-bounce" />
            <span>Audio Chime is currently muted. Click anywhere or here to enable voice/chime announcements.</span>
          </div>
          <span className="text-[11px] underline font-bold">Enable Sound</span>
        </div>
      )}

      {/* ───────────────── MAIN TV CONTENT ───────────────── */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-stretch">
        {/* ─── LEFT COLUMN: CURRENTLY CALLING TOKEN (HERO) ─── */}
        <section className="lg:col-span-7 flex flex-col">
          <div className="relative flex-1 rounded-3xl bg-gradient-to-b from-slate-900 to-[#0c1424] border-2 border-cyan-500/40 p-6 sm:p-10 flex flex-col justify-between shadow-2xl shadow-cyan-950/50 overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

            {/* Top Indicator */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs sm:text-sm font-black tracking-widest text-emerald-400 uppercase">
                  Now Calling For Sample Collection
                </span>
              </div>
              {activeToken && activeToken.urgency === "STAT" && (
                <Badge variant="destructive" className="animate-pulse text-xs font-black uppercase tracking-wider py-1 px-3">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  STAT Emergency Priority
                </Badge>
              )}
            </div>

            {/* Hero Token Display */}
            {activeToken ? (
              <div className="my-auto py-8 text-center z-10">
                <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Token Number
                </div>
                <div className="font-mono text-7xl sm:text-8xl md:text-9xl font-black tracking-wider text-white drop-shadow-[0_0_40px_rgba(34,211,238,0.5)]">
                  {activeToken.token_number}
                </div>

                {/* Booth Destination Callout */}
                <div className="mt-8 inline-flex items-center gap-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/25 border border-cyan-300/40">
                  <span className="text-lg sm:text-xl font-medium tracking-wide uppercase">
                    Please Proceed To
                  </span>
                  <div className="h-6 w-px bg-white/40" />
                  <span className="text-2xl sm:text-3xl font-black uppercase tracking-wider font-mono">
                    {activeToken.booth_number || "BOOTH 1"}
                  </span>
                </div>

                {/* Patient Information & Tests */}
                <div className="mt-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 max-w-xl mx-auto shadow-inner text-left">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2 mb-2">
                    <span className="text-slate-400 uppercase font-semibold">Patient Name:</span>
                    <span className="font-bold text-white text-sm">
                      {activeToken.patient?.name || "Patient"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2 mb-2">
                    <span className="text-slate-400 uppercase font-semibold">Hospital UHID:</span>
                    <span className="font-mono font-bold text-cyan-400 text-xs">
                      {activeToken.patient?.uhid || "UHID-N/A"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between text-xs">
                    <span className="text-slate-400 uppercase font-semibold mt-0.5">Tests Prescribed:</span>
                    <span className="font-medium text-slate-200 text-right max-w-xs truncate">
                      {activeToken.items?.map((i: any) => i.test_name).join(", ") || "General Diagnostics"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="my-auto py-16 text-center z-10">
                <Clock className="h-16 w-16 mx-auto text-slate-600 mb-4 animate-spin duration-3000" />
                <h2 className="text-2xl sm:text-3xl font-black text-slate-300">
                  No Active Token Called
                </h2>
                <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                  Please be seated in the waiting lounge. Your token number will appear here and be announced shortly.
                </p>
              </div>
            )}

            {/* Bottom Status Note */}
            <div className="z-10 flex items-center justify-between pt-4 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Phlebotomy booths active: Booth 1, Booth 2, Booth 3
              </span>
              <span>Fast-track available for Fasting & Pediatric patients</span>
            </div>
          </div>
        </section>

        {/* ─── RIGHT COLUMN: RECENT CALLS & UPCOMING QUEUE ─── */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Card 1: Recently Called Tokens */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Recently Called Tokens
              </h3>
              <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                Counters Active
              </Badge>
            </div>

            {recentCalls.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500 py-6">
                No previous tokens called today
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
                {recentCalls.slice(0, 4).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xl font-black text-cyan-300 tracking-wider">
                        {item.token_number}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-200">
                          {item.patient?.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.patient?.uhid}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 block">
                        {item.booth_number || "BOOTH 1"}
                      </span>
                      <span className="text-[9px] text-slate-500 mt-0.5 block">
                        {item.token_called_at
                          ? new Date(item.token_called_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "Called"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Upcoming in Queue */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-400" />
                Waiting in Queue ({waitingTokens.length})
              </h3>
              <span className="text-[10px] font-bold text-amber-400">
                Next In Line
              </span>
            </div>

            {waitingTokens.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500 py-6">
                All tokens have been collected! Queue is clear.
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
                {waitingTokens.slice(0, 5).map((tokenItem: any, idx: number) => (
                  <div
                    key={tokenItem.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-base font-bold text-slate-200">
                        {tokenItem.token_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {tokenItem.urgency === "STAT" && (
                        <Badge variant="destructive" className="text-[9px] py-0 px-1 font-bold">
                          STAT
                        </Badge>
                      )}
                      <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                        {tokenItem.patient?.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ───────────────── BOTTOM TICKER ───────────────── */}
      <footer className="mt-2 py-3 px-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3 overflow-hidden">
          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] uppercase font-bold shrink-0">
            Notice
          </Badge>
          <div className="truncate text-slate-300 font-medium">
            📢 Please keep your billing receipt and token slip ready with barcode facing up. Fasting blood glucose & lipid profile patients are requested to notify Phlebotomy Counter 1.
          </div>
        </div>

        <div className="shrink-0 text-[11px] font-mono text-slate-500 ml-4 hidden sm:block">
          Hospital LIS Real-Time Display v2.5
        </div>
      </footer>
    </div>
  )
}
