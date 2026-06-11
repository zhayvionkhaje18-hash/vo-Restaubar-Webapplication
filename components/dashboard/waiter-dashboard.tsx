"use client"

import { useState, useEffect, useCallback } from "react"
import {
  LayoutDashboard,
  ClipboardList,
  Bell,
  RefreshCw,
  CheckCircle2,
  Clock,
  Users,
  MapPin,
  UtensilsCrossed,
  AlertCircle,
  ChevronRight,
  Loader2,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatTime, formatDateTime } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import type { Profile, RestaurantTable, OrderStatus } from "@/lib/types"
import { updateWaiterOrderStatus } from "@/app/actions/waiter"

const NAV_ITEMS: NavItem[] = [
  { href: "/waiter", label: "My Tables", icon: "LayoutDashboard" },
  { href: "/waiter/orders", label: "Orders", icon: "ClipboardList" },
  { href: "/waiter/notifications", label: "Alerts", icon: "Bell" },
]

interface WaiterTable extends RestaurantTable {
  orders?: {
    id: string
    order_number: number
    status: OrderStatus
    total: number
    created_at: string
    order_items?: { count: number }[]
  }[]
}

interface WaiterOrder {
  id: string
  order_number: number
  status: OrderStatus
  total: number
  subtotal: number
  tax: number
  customer_name: string | null
  created_at: string
  tables: { label: string | null; zone: string | null } | null
}

const TABLE_STATUS_CONFIG = {
  available:   { label: "Available",   color: "bg-emerald-500" },
  occupied:    { label: "Occupied",    color: "bg-amber-500" },
  reserved:    { label: "Reserved",    color: "bg-blue-500" },
  unavailable: { label: "Unavailable", color: "bg-gray-400" },
}

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending:   { label: "Pending",    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  confirmed: { label: "Confirmed",  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  preparing: { label: "Preparing",  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ready:     { label: "Ready",       color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  served:    { label: "Served",     color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  completed: { label: "Completed",  color: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400" },
  cancelled: { label: "Cancelled",  color: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500" },
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:   "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready:     "served",
}

const NEXT_LABELS: Record<string, string> = {
  pending:   "Confirm",
  confirmed: "Prepare",
  preparing: "Ready",
  ready:     "Served",
}

export function WaiterDashboard({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [tables, setTables] = useState<WaiterTable[]>([])
  const [pendingOrders, setPendingOrders] = useState<WaiterOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const profileId = profile.id

    // Fetch assigned tables
    const { data: tablesData } = await supabase
      .from("tables")
      .select("*")
      .or(`assigned_waiter.eq.${profileId},assigned_waiter.is.null`)
      .order("label")

    // Fetch active orders for assigned/unassigned tables
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, order_number, status, total, subtotal, tax, customer_name, created_at, tables(label, zone)")
      .in("status", ["pending", "confirmed", "preparing", "ready", "served"])
      .order("created_at", { ascending: true })
      .limit(20)

    setTables(tablesData ?? [])
    setPendingOrders((ordersData ?? []) as WaiterOrder[])
    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    loadData()

    // Real-time subscription
    const channel = supabase
      .channel("waiter-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadData()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleQuickUpdate = async (orderId: string, newStatus: OrderStatus) => {
    setUpdating(orderId)
    try {
      const result = await updateWaiterOrderStatus(orderId, newStatus)
      if (result?.error) {
        alert(result.error)
        return
      }
      setPendingOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
    } finally {
      setUpdating(null)
    }
  }

  // Stats
  const activeCount = pendingOrders.length
  const pendingCount = pendingOrders.filter((o) => o.status === "pending").length
  const preparingCount = pendingOrders.filter((o) => o.status === "confirmed" || o.status === "preparing").length
  const readyCount = pendingOrders.filter((o) => o.status === "ready").length

  const todayRevenue = pendingOrders
    .filter((o) => {
      const d = new Date(o.created_at)
      const today = new Date()
      return d.toDateString() === today.toDateString()
    })
    .reduce((sum, o) => sum + Number(o.total), 0)

  const today = new Date()
  const dateStr = today.toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <StaffShell profile={profile} items={NAV_ITEMS} title="Waiter Console">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Good {getGreeting()}, {profile.full_name?.split(" ")[0] ?? "Staff"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="ml-1.5">Refresh</span>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<ClipboardList className="size-5 text-blue-500" />}
            label="Active Orders"
            value={String(activeCount)}
            sub={pendingCount > 0 ? `${pendingCount} pending` : "All caught up"}
            highlight={pendingCount > 0}
          />
          <StatCard
            icon={<Clock className="size-5 text-amber-500" />}
            label="In Progress"
            value={String(preparingCount)}
            sub="Orders being prepared"
          />
          <StatCard
            icon={<CheckCircle2 className="size-5 text-emerald-500" />}
            label="Ready to Serve"
            value={String(readyCount)}
            sub={readyCount > 0 ? "Deliver to tables" : "No orders ready"}
            highlight={readyCount > 0}
          />
          <StatCard
            icon={<BarChart3 className="size-5 text-purple-500" />}
            label="Today's Revenue"
            value={formatCurrency(todayRevenue)}
            sub="From your tables"
          />
        </div>

        {/* Pending Attention Banner */}
        {pendingCount > 0 && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-11 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                <AlertCircle className="size-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-300">
                  {pendingCount} Order{pendingCount > 1 ? "s" : ""} Waiting for Confirmation
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Go to table and confirm customer orders immediately.
                </p>
              </div>
              <Button asChild size="sm" className="shrink-0">
                <Link href="/waiter/orders">View Orders</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Grid: Tables + Orders */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Tables Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                My Tables
              </h2>
              <span className="text-xs text-muted-foreground">{tables.length} tables</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-24 bg-muted/30" />
                  </Card>
                ))}
              </div>
            ) : tables.length === 0 ? (
              <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
                <Users className="mx-auto mb-2 size-6 opacity-40" />
                <p className="text-sm">No tables assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tables.map((table) => {
                  const statusConfig = TABLE_STATUS_CONFIG[table.status as keyof typeof TABLE_STATUS_CONFIG]
                  const tableOrders = pendingOrders.filter(
                    (o) => o.tables?.label === table.label
                  )
                  return (
                    <Card key={table.id} className="overflow-hidden transition-colors hover:bg-muted/30">
                      <div className={`h-1 ${statusConfig?.color}`} />
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-bold">{table.label}</h3>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <Users className="size-3" />
                              {table.seats} seats
                              {table.zone && (
                                <>
                                  <span>•</span>
                                  <MapPin className="size-3" />
                                  {table.zone}
                                </>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {statusConfig?.label}
                          </Badge>
                        </div>

                        {/* Table orders summary */}
                        {tableOrders.length > 0 && (
                          <div className="mt-3 pt-3 border-t space-y-1.5">
                            {tableOrders.slice(0, 2).map((o) => {
                              const cfg = ORDER_STATUS_CONFIG[o.status as OrderStatus]
                              return (
                                <div key={o.id} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold">#{o.order_number}</span>
                                    <Badge className={cfg?.color ?? "bg-gray-100"}>{cfg?.label}</Badge>
                                  </div>
                                  <span className="text-muted-foreground">{formatCurrency(o.total)}</span>
                                </div>
                              )
                            })}
                            {tableOrders.length > 2 && (
                              <p className="text-xs text-muted-foreground text-center">
                                +{tableOrders.length - 2} more orders
                              </p>
                            )}
                          </div>
                        )}

                        <Button size="sm" className="w-full mt-3" asChild>
                          <Link href={`/waiter/tables/${table.id}`}>
                            Manage Table
                            <ChevronRight className="size-3.5 ml-1" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Orders Column */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Orders Requiring Action
              </h2>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/waiter/orders">View All</Link>
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-28 bg-muted/30" />
                  </Card>
                ))}
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-3 size-8 text-emerald-400" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm mt-1">No orders need your attention right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrders.map((order) => {
                  const cfg = ORDER_STATUS_CONFIG[order.status as OrderStatus]
                  const nextStatus = NEXT_STATUS[order.status as OrderStatus]
                  const isUpdating = updating === order.id

                  return (
                    <Card key={order.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold">#{order.order_number}</span>
                              <Badge className={cfg?.color ?? "bg-gray-100"}>
                                {cfg?.label}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                              {order.tables?.label && (
                                <span className="font-medium text-foreground">
                                  {order.tables.label}
                                </span>
                              )}
                              {order.tables?.zone && <span>{order.tables.zone}</span>}
                              {order.customer_name && (
                                <>
                                  <span>•</span>
                                  <span>{order.customer_name}</span>
                                </>
                              )}
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatTime(new Date(order.created_at))}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-lg font-bold text-primary">
                              {formatCurrency(order.total)}
                            </div>
                          </div>
                        </div>

                        {/* Action */}
                        {nextStatus && (
                          <Button
                            size="sm"
                            className="w-full mt-3"
                            onClick={() => handleQuickUpdate(order.id, nextStatus)}
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <NextStatusIcon status={nextStatus} />
                            )}
                            <span className="ml-1.5">
                              {isUpdating ? "Updating..." : NEXT_LABELS[nextStatus]}
                            </span>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </StaffShell>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/10" : ""}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-11 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-xl font-bold ${highlight ? "text-amber-600" : ""}`}>{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}

function NextStatusIcon({ status }: { status: OrderStatus }) {
  switch (status) {
    case "confirmed": return <CheckCircle2 className="size-3.5" />
    case "preparing": return <UtensilsCrossed className="size-3.5" />
    case "ready":     return <CheckCircle2 className="size-3.5" />
    case "served":    return <CheckCircle2 className="size-3.5" />
    default:          return <CheckCircle2 className="size-3.5" />
  }
}