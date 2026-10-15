import React from "react"
import {
  DollarSign,
  ShoppingCart,
  Pill,
  AlertTriangle,
  Clock,
  Ban,
} from "lucide-react"
import { StatCardsRow, type StatItem } from "@/components/common/stat-cards-row"
import type { PharmacyDashboardStats } from "@/types/pharmacy"

interface PharmacyStatsHeaderProps {
  stats?: PharmacyDashboardStats
  isLoading?: boolean
}

export const PharmacyStatsHeader: React.FC<PharmacyStatsHeaderProps> = ({
  stats,
  isLoading,
}) => {
  const statItems: StatItem[] = [
    {
      title: "Today's Revenue",
      value: `₹${(stats?.today_revenue || 0).toLocaleString("en-IN")}`,
      description: "GST-inclusive billing",
      icon: <DollarSign className="h-5 w-5" />,
      colorScheme: "emerald",
    },
    {
      title: "Prescriptions & Sales",
      value: stats?.today_sales_count || 0,
      description: "Invoices billed today",
      icon: <ShoppingCart className="h-5 w-5" />,
      colorScheme: "blue",
    },
    {
      title: "Active Formulary",
      value: stats?.total_medicines || 0,
      description: "Catalogued drugs",
      icon: <Pill className="h-5 w-5" />,
      colorScheme: "indigo",
    },
    {
      title: "Low Stock Re-order",
      value: stats?.low_stock_count || 0,
      description: "Below safety threshold",
      icon: <AlertTriangle className="h-5 w-5" />,
      colorScheme: "amber",
    },
    {
      title: "Near Expiry (≤90d)",
      value: stats?.near_expiry_count || 0,
      description: "FEFO priority batches",
      icon: <Clock className="h-5 w-5" />,
      colorScheme: "amber",
    },
    {
      title: "Expired (Locked)",
      value: stats?.expired_count || 0,
      description: "Dispensing blocked",
      icon: <Ban className="h-5 w-5" />,
      colorScheme: "rose",
    },
  ]

  return <StatCardsRow stats={statItems} isLoading={isLoading} columns={6} />
}
