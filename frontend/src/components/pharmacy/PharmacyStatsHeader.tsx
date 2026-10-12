import React from "react"
import {
  DollarSign,
  ShoppingCart,
  Pill,
  AlertTriangle,
  Clock,
  Ban,
} from "lucide-react"
import type { PharmacyDashboardStats } from "@/types/pharmacy"

interface PharmacyStatsHeaderProps {
  stats?: PharmacyDashboardStats
  isLoading?: boolean
}

export const PharmacyStatsHeader: React.FC<PharmacyStatsHeaderProps> = ({
  stats,
  isLoading,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {/* 1. Today's Revenue */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 dark:bg-emerald-500/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Today's Revenue</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isLoading ? "..." : `₹${(stats?.today_revenue || 0).toLocaleString("en-IN")}`}
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">GST-inclusive billing</p>
      </div>

      {/* 2. Today's Sales Count */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 dark:bg-blue-500/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Prescriptions & Sales</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ShoppingCart className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isLoading ? "..." : stats?.today_sales_count || 0}
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Invoices billed today</p>
      </div>

      {/* 3. Active Formulary */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 dark:bg-indigo-500/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Active Formulary</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Pill className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isLoading ? "..." : stats?.total_medicines || 0}
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Catalogued drugs</p>
      </div>

      {/* 4. Low Stock Alert */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 dark:bg-amber-500/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Low Stock Re-order</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
          {isLoading ? "..." : stats?.low_stock_count || 0}
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Below safety threshold</p>
      </div>

      {/* 5. Near Expiry Batches */}
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3.5 dark:bg-orange-500/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Near Expiry (&lt;90d)</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
          {isLoading ? "..." : stats?.near_expiry_count || 0}
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">FEFO priority batches</p>
      </div>

      {/* 6. Expired Batches (Locked) */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 dark:bg-red-500/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-red-600 dark:text-red-400">Expired (Locked)</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
            <Ban className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-red-600 dark:text-red-400">
          {isLoading ? "..." : stats?.expired_count || 0}
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Dispensing blocked</p>
      </div>
    </div>
  )
}
