import { Skeleton } from "./skeleton"

export function AppLoadingSkeleton() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground antialiased select-none">
      {/* ─── Top Header Skeleton ─── */}
      <header className="sticky top-0 z-50 h-14 w-full shrink-0 border-b border-border/80 bg-background/95 dark:bg-card/95 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4">
          {/* Left Brand Area */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
            <div className="space-y-1.5 hidden sm:block">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-7 w-7 rounded-lg lg:block hidden" />
            <div className="hidden md:block h-4 w-px bg-border/80" />
            <Skeleton className="h-6 w-32 rounded-full hidden md:block" />
          </div>

          {/* Middle Search Bar Placeholder */}
          <div className="mx-3 hidden lg:flex max-w-sm flex-1">
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>

          {/* Right Action Controls Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-36 rounded-lg hidden xl:block" />
            <Skeleton className="h-9 w-9 rounded-xl hidden sm:block" />
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl hidden sm:block" />
            <Skeleton className="h-9 w-9 rounded-xl hidden sm:block" />
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="hidden h-5 w-px bg-border/80 sm:block" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </header>

      {/* ─── Body Layout (Sidebar Skeleton + Main Content Area Skeleton) ─── */}
      <div className="flex h-[calc(100vh-3.5rem)] w-full flex-1 overflow-hidden">
        {/* Sidebar Skeleton */}
        <aside className="w-60 shrink-0 border-r border-border/80 bg-card p-3 flex flex-col justify-between hidden lg:flex">
          <div className="space-y-5">
            {/* Group 1: Clinical Workflows */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 mb-2">
                <Skeleton className="h-2.5 w-28" />
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl">
                    <Skeleton className="h-4 w-4 rounded shrink-0" />
                    <Skeleton
                      className={`h-3 ${
                        i === 1 ? "w-24" : i === 2 ? "w-36" : i === 3 ? "w-32" : "w-28"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Group 2: Hospital Setup */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 px-1 mb-2">
                <Skeleton className="h-2.5 w-24" />
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="space-y-1.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl">
                    <Skeleton className="h-4 w-4 rounded shrink-0" />
                    <Skeleton
                      className={`h-3 ${i === 1 ? "w-36" : i === 2 ? "w-24" : "w-32"}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Logout Skeleton */}
          <div className="pt-3 border-t border-border/60">
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </aside>

        {/* Main Content Area Skeleton */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-6">
          {/* Welcome / Page Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28 rounded-xl" />
              <Skeleton className="h-9 w-32 rounded-xl" />
            </div>
          </div>

          {/* 4 KPI Stat Cards Skeleton (Exact Match to Hospital Dashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            ))}
          </div>

          {/* Content Cards / Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="space-y-3 pt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40"
                  >
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-2.5 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modern Floating Micro Status Badge */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border/80 bg-card/95 backdrop-blur-md px-3.5 py-1.5 shadow-xl text-xs font-medium text-muted-foreground animate-in fade-in duration-300">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
        </span>
        <span>Initializing ABDM Workspace...</span>
      </div>
    </div>
  )
}
