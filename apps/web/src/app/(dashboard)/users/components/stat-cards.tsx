"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, ShieldCheck, Store, UserCheck } from "lucide-react"
import type { User } from "../page"

interface StatCardsProps {
  users: User[]
  loading: boolean
}

export function StatCards({ users, loading }: StatCardsProps) {
  const totalUsers = users.length
  const activeUsers = users.filter((u) => !u.banned).length
  const dealers = users.filter((u) => u.role === "dealer").length
  const admins = users.filter((u) => u.role === "admin").length

  const metrics = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
    },
    {
      title: "Active Users",
      value: activeUsers,
      icon: UserCheck,
    },
    {
      title: "Dealers",
      value: dealers,
      icon: Store,
    },
    {
      title: "Admins",
      value: admins,
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="border">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <metric.icon className="text-muted-foreground size-6" />
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                {metric.title}
              </p>
              <div className="text-2xl font-bold">
                {loading ? "..." : metric.value}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
