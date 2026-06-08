"use client"

import { TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDashboardStats, type StatValue } from "@/lib/api/dashboard"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value)
}

function TrendBadge({ stat }: { stat: StatValue }) {
  if (stat.trend === "up") {
    return (
      <Badge variant="outline">
        <TrendingUp />
        +{stat.change}%
      </Badge>
    )
  }
  if (stat.trend === "down") {
    return (
      <Badge variant="outline">
        <TrendingDown />
        {stat.change}%
      </Badge>
    )
  }
  return (
    <Badge variant="outline">0%</Badge>
  )
}

function TrendFooter({ stat, upLabel, downLabel, neutralLabel }: { stat: StatValue; upLabel: string; downLabel: string; neutralLabel: string }) {
  if (stat.trend === "up") {
    return (
      <div className="line-clamp-1 flex gap-2 font-medium">
        {upLabel} <TrendingUp className="size-4" />
      </div>
    )
  }
  if (stat.trend === "down") {
    return (
      <div className="line-clamp-1 flex gap-2 font-medium">
        {downLabel} <TrendingDown className="size-4" />
      </div>
    )
  }
  return (
    <div className="line-clamp-1 flex gap-2 font-medium">
      {neutralLabel}
    </div>
  )
}

export function SectionCards() {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading || !stats) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["Total Revenue", "New Customers", "Active Users", "Total Orders"].map((label) => (
          <Card key={label} className="@container/card">
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                &mdash;
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(stats.totalOrderValue.value)}
          </CardTitle>
          <CardAction>
            <TrendBadge stat={stats.totalOrderValue} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <TrendFooter
            stat={stats.totalOrderValue}
            upLabel="Trending up this month"
            downLabel="Down this month"
            neutralLabel="No change this month"
          />
          <div className="text-muted-foreground">
            Total order value for current month
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>New Customers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats.newCustomers.value)}
          </CardTitle>
          <CardAction>
            <TrendBadge stat={stats.newCustomers} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <TrendFooter
            stat={stats.newCustomers}
            upLabel="More new customers this month"
            downLabel="Fewer new customers this month"
            neutralLabel="Same as last month"
          />
          <div className="text-muted-foreground">
            Users registered this month
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats.activeUsers.value)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">30d</Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Users active in last 30 days
          </div>
          <div className="text-muted-foreground">
            Based on last login activity
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Orders</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(stats.totalOrders.value)}
          </CardTitle>
          <CardAction>
            <TrendBadge stat={stats.totalOrders} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <TrendFooter
            stat={stats.totalOrders}
            upLabel="More orders this month"
            downLabel="Fewer orders this month"
            neutralLabel="Same as last month"
          />
          <div className="text-muted-foreground">
            Enquiries created this month
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
