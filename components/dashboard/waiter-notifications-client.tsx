"use client"

import { useEffect, useRef } from "react"
import {
  Bell,
  BellRing,
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock,
  RefreshCw,
  UtensilsCrossed,
  Info,
  History,
} from "lucide-react"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatTime, formatDateTime } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import type { Profile, OrderStatus } from "@/lib/types"

const NAV_ITEMS: NavItem[] = [
  { href: "/waiter", label: "My Tables", icon: "LayoutDashboard" },
  { href: "/waiter/orders", label: "Orders", icon: "ClipboardList" },
  { href: "/waiter/notifications", label: "Alerts", icon: "Bell" },
]

interface PendingOrder {
  id: string
  order_number: number
  status: OrderStatus
  created_at: string
  tables: { label: string | null } | null
}

interface ActivityNotification {
  id: string
  action: string
  entity: string | null
  detail: string | null
  created_at: string
  actor_name: string | null
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  "order.created":   <Bell className="size-4 text-blue-500" />,
  "order.confirmed": <CheckCircle2 className="size-4 text-cyan-500" />,
  "order.preparing": <ChefHat className="size-4 text-amber-500" />,
  "order.ready":     <CheckCircle2 className="size-4 text-emerald-500" />,
  "order.served":    <UtensilsCrossed className="size-4 text-purple-500" />,
  "order.completed": <CheckCircle2 className="size-4 text-green-500" />,
  "order.cancelled": <AlertCircle className="size-4 text-red-500" />,
}

const ACTION_LABELS: Record<string, string> = {
  "order.created":   "New Order",
  "order.confirmed": "Order Confirmed",
  "order.preparing": "Preparing",
  "order.ready":     "Order Ready",
  "order.served":    "Order Served",
  "order.completed": "Completed",
  "order.cancelled": "Cancelled",
}

const STATUS_ORDER = ["pending", "confirmed", "preparing", "ready", "served"]

export function WaiterNotificationsClient({
  profile,
  notifications,
  pendingOrders,
}: {
  profile: Profile
  notifications: ActivityNotification[]
  pendingOrders: PendingOrder[]
}) {
  const supabase = createClient()
  const prevPendingCount = useRef(pendingOrders.length)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Play notification sound when new orders come in
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio(
        "data:audio/wav;base64,UklGRl9vAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vAAA="
      )
    }
  }, [])

  // Real-time subscription for new orders
  useEffect(() => {
    const channel = supabase
      .channel("waiter-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as PendingOrder
          if (newOrder.status === "pending") {
            // Play sound if supported
            try {
              audioRef.current?.play().catch(() => {})
            } catch {}
            // Force refresh to get fresh data
            window.location.reload()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Group pending orders by status for display
  const ordersByStatus = pendingOrders.reduce(
    (acc, o) => {
      if (!acc[o.status]) acc[o.status] = []
      acc[o.status].push(o)
      return acc
    },
    {} as Record<string, PendingOrder[]>
  )

  const totalPending = pendingOrders.length

  return (
    <StaffShell profile={profile} items={NAV_ITEMS} title="Alerts">
      {/* Alert Banner */}
      {totalPending > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <BellRing className="size-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-300">
                {totalPending} Active Order{totalPending > 1 ? "s" : ""} Needing Attention
              </h3>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Review and update order statuses promptly.
              </p>
            </div>
            <Button asChild>
              <a href="/waiter/orders">
                View Orders
                <Bell className="ml-1.5 size-3.5" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Orders by Status */}
      {pendingOrders.length > 0 ? (
        <div className="mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Active Orders
          </h2>
          {STATUS_ORDER.map((status) => {
            const orders = ordersByStatus[status]
            if (!orders?.length) return null
            return (
              <div key={status}>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <StatusDot status={status as OrderStatus} />
                  {STATUS_LABELS[status] ?? status}
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{orders.length}</span>
                </h3>
                <div className="space-y-2">
                  {orders.map((order) => (
                    <Card key={order.id} className="cursor-pointer hover:bg-muted/30 transition-colors">
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className={`size-2 rounded-full ${STATUS_DOT_COLOR[status] ?? "bg-gray-400"}`} />
                          <div>
                            <span className="font-semibold">#{order.order_number}</span>
                            <span className="ml-2 text-sm text-muted-foreground">
                              {order.tables?.label ?? "—"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {formatTime(new Date(order.created_at))}
                          </div>
                          <Button size="sm" variant="ghost" asChild className="h-7 mt-1">
                            <a href="/waiter/orders">View</a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground mb-6">
          <CheckCircle2 className="mx-auto mb-3 size-8 text-emerald-400" />
          <p className="font-medium text-foreground">All caught up!</p>
          <p className="text-sm mt-1">No active orders right now.</p>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <History className="size-4" />
          Recent Activity
        </h2>
        {notifications.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-muted-foreground">
            <Info className="mx-auto mb-2 size-5 opacity-40" />
            <p className="text-sm">No recent activity.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const icon = ACTION_ICONS[notif.action] ?? <Info className="size-4 text-gray-400" />
              const label = ACTION_LABELS[notif.action] ?? notif.action
              const detail = notif.detail ? parseDetail(notif.detail) : null

              return (
                <Card key={notif.id}>
                  <CardContent className="flex items-start gap-3 p-3">
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{label}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTime(new Date(notif.created_at))}
                        </span>
                      </div>
                      {detail && (
                        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
                      )}
                      {notif.actor_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          by {notif.actor_name}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </StaffShell>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_DOT_COLOR: Record<string, string> = {
  pending:   "bg-red-500",
  confirmed: "bg-blue-500",
  preparing: "bg-amber-500",
  ready:     "bg-emerald-500",
  served:    "bg-purple-500",
}

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  confirmed:  "Confirmed",
  preparing:  "Preparing",
  ready:      "Ready",
  served:     "Served",
}

function StatusDot({ status }: { status: OrderStatus }) {
  const color = STATUS_DOT_COLOR[status] ?? "bg-gray-400"
  return <span className={`size-2 rounded-full ${color}`} />
}

function parseDetail(detail: string): string {
  try {
    const obj = JSON.parse(detail)
    if (obj.order_number) return `Order #${obj.order_number}`
    if (obj.total) return `₱${Number(obj.total).toFixed(2)}`
    if (obj.note) return obj.note
    return Object.values(obj).join(", ")
  } catch {
    return detail
  }
}