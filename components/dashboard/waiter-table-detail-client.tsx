"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock,
  RefreshCw,
  UtensilsCrossed,
  Loader2,
  Users,
  MapPin,
} from "lucide-react"
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

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
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
  served:    "completed",
}

const NEXT_LABELS: Record<string, string> = {
  pending:   "Confirm Order",
  confirmed: "Start Preparing",
  preparing: "Mark Ready",
  ready:     "Mark Served",
  served:    "Complete",
}

interface TableOrder {
  id: string
  order_number: number
  status: OrderStatus
  payment_status: string
  subtotal: number
  tax: number
  total: number
  customer_name: string | null
  notes: string | null
  created_at: string
  order_items: {
    id: string
    name: string
    quantity: number
    unit_price: number
    notes: string | null
  }[]
}

interface WaiterTableDetailClientProps {
  profile: Profile
  table: RestaurantTable
  initialOrders: TableOrder[]
}

export function WaiterTableDetailClient({ profile, table, initialOrders }: WaiterTableDetailClientProps) {
  const supabase = createClient()
  const [orders, setOrders] = useState(initialOrders)
  const [pending, setPending] = useState<string | null>(null)

  // Real-time
  useEffect(() => {
    const channel = supabase
      .channel(`waiter-table-${table.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `table_id=eq.${table.id}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table.id])

  const handleUpdate = async (orderId: string, newStatus: OrderStatus) => {
    setPending(orderId)
    try {
      const result = await updateWaiterOrderStatus(orderId, newStatus)
      if (result?.error) {
        alert(result.error)
        return
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
    } finally {
      setPending(null)
    }
  }

  const tableStatusLabel =
    table.status === "available"
      ? "Available"
      : table.status === "occupied"
      ? "Occupied"
      : table.status === "reserved"
      ? "Reserved"
      : "Unavailable"

  const tableStatusColor =
    table.status === "available"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : table.status === "occupied"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-gray-100 text-gray-600"

  return (
    <StaffShell profile={profile} items={NAV_ITEMS} title={`Table ${table.label}`}>
      {/* Back + Table Info */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/waiter">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Table {table.label}</h1>
              <Badge className={tableStatusColor}>{tableStatusLabel}</Badge>
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {table.seats} seats
              </span>
              {table.zone && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {table.zone}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="size-3.5" />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {/* Active Orders */}
      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <UtensilsCrossed className="mx-auto mb-3 size-8 opacity-40" />
          <p className="font-medium">No active orders for this table.</p>
          <p className="text-sm mt-1">Orders will appear here when customers place them.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const config = STATUS_CONFIG[order.status as OrderStatus]
            const nextStatus = NEXT_STATUS[order.status as OrderStatus]

            return (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">#{order.order_number}</CardTitle>
                      {order.customer_name && (
                        <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge className={config?.color ?? "bg-gray-100"}>
                        {config?.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                        <Clock className="size-3" />
                        {formatTime(new Date(order.created_at))}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Items */}
                  <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">{item.quantity}x</span>
                          <span>{item.name}</span>
                          {item.notes && (
                            <span className="text-xs text-muted-foreground">({item.notes})</span>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {formatCurrency(Number(item.unit_price) * item.quantity)}
                        </span>
                      </div>
                    ))}
                    {order.notes && (
                      <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
                        Note: {order.notes}
                      </p>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(Number(order.subtotal))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(Number(order.tax))}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1.5">
                      <span>Total</span>
                      <span className="text-primary text-base">
                        {formatCurrency(Number(order.total))}
                      </span>
                    </div>
                    {order.payment_status === "paid" && (
                      <div className="flex justify-end">
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                          Payment Received
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  {nextStatus && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpdate(order.id, nextStatus)}
                      disabled={pending === order.id}
                    >
                      {pending === order.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <NextStatusIcon status={nextStatus} />
                      )}
                      <span className="ml-2">
                        {pending === order.id ? "Updating..." : NEXT_LABELS[nextStatus]}
                      </span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </StaffShell>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function NextStatusIcon({ status }: { status: OrderStatus }) {
  switch (status) {
    case "confirmed":  return <CheckCircle2 className="size-4" />
    case "preparing":  return <ChefHat className="size-4" />
    case "ready":      return <CheckCircle2 className="size-4" />
    case "served":     return <UtensilsCrossed className="size-4" />
    case "completed":  return <CheckCircle2 className="size-4" />
    default:           return <CheckCircle2 className="size-4" />
  }
}