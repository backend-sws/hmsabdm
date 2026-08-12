import React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

interface SectionCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function SectionCard({ title, description, children, className }: SectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default SectionCard
