"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  Grid3x3,
  QrCode,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  Users,
  UtensilsCrossed,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatTime, relativeTime } from "@/lib/constants"
import type { OrderWithItems, OrderStatus, PaymentStatus, Profile } from "@/lib/types"
import type { DashboardStats } from "@/lib/data/admin"

const STATUS_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  pending:    { label: "Pending",    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",   dot: "bg-amber-500" },
  confirmed:  { label: "Confirmed",  className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",       dot: "bg-cyan-500" },
  preparing:  { label: "Preparing",  className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",       dot: "bg-blue-500" },
  ready:      { label: "Ready",      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  served:     { label: "Served",     className: "bg-purple-500/10 text-purple-700 dark:text-purple-400", dot: "bg-purple-500" },
  completed:  { label: "Completed",  className: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",       dot: "bg-zinc-500" },
  cancelled:  { label: "Cancelled",  className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",       dot: "bg-rose-500" },
}

const PAYMENT_STYLES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  unpaid:    { label: "Unpaid",    variant: "destructive" },
  pending:   { label: "Pending",   variant: "outline" },
  paid:      { label: "Paid",      variant: "default" },
  refunded:  { label: "Refunded",  variant: "secondary" },
}

const QUICK_LINKS = [
  {
    href: "/admin/menu",
    title: "Manage Menu",
    description: "Categories & items",
    icon: UtensilsCrossed,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/admin/tables",
    title: "Tables & QR",
    description: "Generate QR codes",
    icon: QrCode,
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    href: "/admin/staff",
    title: "Staff",
    description: "Roles & permissions",
    icon: Users,
    iconClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    href: "/admin/reservations",
    title: "Reservations",
    description: "Manage bookings",
    icon: CalendarClock,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export function AdminDashboardClient({
  profile,
  initialStats,
  initialOrders,
  topItems,
}: {
  profile: Profile
  initialStats: DashboardStats
  initialOrders: OrderWithItems[]
  topItems: { name: string; qty: number; revenue: number }[]
}) {
  const [stats, setStats] = useState(initialStats)
  const [orders, setOrders] = useState(initialOrders)
  const [refreshing, setRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>("")
  const [todayLabel, setTodayLabel] = useState("")

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }))
      setTodayLabel(
        now.toLocaleDateString("en-PH", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      )
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        if (data.stats) setStats(data.stats)
        if (data.orders) setOrders(data.orders)
      }
    } catch {
      // network error — keep existing data
    } finally {
      setTimeout(() => setRefreshing(false), 400)
    }
  }

  const tableUtilization = stats.totalTables > 0
    ? Math.round((stats.occupiedTables / stats.totalTables) * 100)
    : 0

  const openOrders = orders.filter((o) => o.status === "pending").length
  const preparingOrders = orders.filter((o) => o.status === "preparing").length
  const readyOrders = orders.filter((o) => o.status === "ready").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Dashboard"
        description={`${greeting()}, ${profile.full_name?.split(" ")[0] ?? "Admin"} • ${todayLabel || "today"} • Last updated ${currentTime || "—"}`}
        crumbs={[{ label: "Lumière", href: "/" }, { label: "Admin" }, { label: "Dashboard" }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/activity">
                <Download className="mr-2 size-4" />
                Export
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/admin/orders">
                <ClipboardList className="mr-2 size-4" />
                View Orders
              </Link>
            </Button>
          </>
        }
      />

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(stats.todayRevenue)}
          icon={DollarSign}
          accent="emerald"
          trend="+12.5%"
          trendUp
          subtitle="vs. yesterday"
        />
        <StatCard
          label="Total Orders"
          value={stats.todayOrders.toString()}
          icon={ShoppingBag}
          accent="blue"
          trend={`+${openOrders} open`}
          trendUp
          subtitle="last 24h"
        />
        <StatCard
          label="Tables Occupied"
          value={`${stats.occupiedTables}/${stats.totalTables}`}
          icon={Grid3x3}
          accent="amber"
          subtitle={`${tableUtilization}% utilization`}
        />
        <StatCard
          label="Avg. Order Value"
          value={formatCurrency(stats.avgOrderValue)}
          icon={TrendingUp}
          accent="purple"
          trend="+3.2%"
          trendUp
          subtitle="vs. last week"
        />
      </div>

      {/* Operations strip */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-sm font-medium">Operations live</span>
              <span className="text-xs text-muted-foreground">All systems normal</span>
            </div>
            <div className="hidden h-6 w-px bg-border md:block" />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <PillStat icon={ClipboardList} label="Open" value={openOrders} tone="amber" />
              <PillStat icon={Clock} label="Preparing" value={preparingOrders} tone="blue" />
              <PillStat icon={CheckCircle2} label="Ready" value={readyOrders} tone="emerald" />
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/orders">
              Go to order queue
              <ArrowUpRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Operational alerts */}
      {(stats.pendingOrders > 0 || tableUtilization > 80) && (
        <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">Operations Alert</p>
              <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {stats.pendingOrders > 0 && (
                  <li>• {stats.pendingOrders} order{stats.pendingOrders > 1 ? "s" : ""} pending kitchen confirmation</li>
                )}
                {tableUtilization > 80 && (
                  <li>• High table occupancy ({tableUtilization}%) — consider expediting seating</li>
                )}
              </ul>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/orders">Review</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Order Feed — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Live Order Feed</CardTitle>
              <CardDescription>Real-time updates across all roles</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/orders">
                View all
                <ArrowUpRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="size-8" />}
                title="No orders yet today"
                description="Orders will appear here as customers place them"
              />
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 8).map((order) => {
                  const status = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending
                  const pay = PAYMENT_STYLES[order.payment_status as PaymentStatus] ?? PAYMENT_STYLES.unpaid
                  return (
                    <Link
                      key={order.id}
                      href={`/admin/orders`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                          #{order.order_number.toString().slice(-4)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                              {order.tables?.label ?? "Takeout"}
                            </span>
                            <Badge variant={pay.variant} className="text-xs">
                              {pay.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">• {relativeTime(order.created_at)}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {order.order_items?.length ?? 0} items • {formatTime(order.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(Number(order.total))}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                        >
                          <span className={`size-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Top Performers</CardTitle>
              <CardDescription>Best sellers today</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="size-8" />}
                title="No sales yet"
                description="Start selling to see your top items"
              />
            ) : (
              <ul className="space-y-3">
                {topItems.map((item, idx) => (
                  <li key={item.name} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                        idx === 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.qty} sold</div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">
                      {formatCurrency(item.revenue)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
            >
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-md ${q.iconClass}`}>
                <q.icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{q.title}</h4>
                  <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{q.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function PillStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ClipboardList
  label: string
  value: number
  tone: "amber" | "blue" | "emerald"
}) {
  const toneClass = {
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  }[tone]
  return (
    <div className="flex items-center gap-2">
      <span className={`flex size-7 items-center justify-center rounded-md ${toneClass}`}>
        <Icon className="size-3.5" />
      </span>
      <div className="leading-tight">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 text-muted-foreground">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
