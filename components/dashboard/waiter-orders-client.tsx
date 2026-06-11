"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  RefreshCw,
  Search,
  UtensilsCrossed,
  Eye,
  X,
  AlertCircle,
  Bell,
  Loader2,
} from "lucide-react"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatCurrency, formatTime, formatDateTime } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import type { Profile, OrderWithItems, OrderStatus } from "@/lib/types"
import { updateWaiterOrderStatus } from "@/app/actions/waiter"

const NAV_ITEMS: NavItem[] = [
  { href: "/waiter", label: "My Tables", icon: "LayoutDashboard" },
  { href: "/waiter/orders", label: "Orders", icon: "ClipboardList" },
  { href: "/waiter/notifications", label: "Alerts", icon: "Bell" },
]

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: "Pending",    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",  icon: <AlertCircle className="size-3.5" /> },
  confirmed:  { label: "Confirmed",  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <CheckCircle2 className="size-3.5" /> },
  preparing:  { label: "Preparing",  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: <ChefHat className="size-3.5" /> },
  ready:      { label: "Ready",       color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: <CheckCircle2 className="size-3.5" /> },
  served:     { label: "Served",     color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <UtensilsCrossed className="size-3.5" /> },
  completed:  { label: "Completed",  color: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400", icon: <CheckCircle2 className="size-3.5" /> },
  cancelled:  { label: "Cancelled",  color: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500", icon: <X className="size-3.5" /> },
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:   "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready:     "served",
  served:    "completed",
}

const STATUS_ACTION: Record<OrderStatus, { label: string; icon: React.ReactNode }> = {
  pending:   { label: "Confirm",        icon: <CheckCircle2 className="size-3.5" /> },
  confirmed: { label: "Start Preparing", icon: <ChefHat className="size-3.5" /> },
  preparing: { label: "Mark Ready",      icon: <CheckCircle2 className="size-3.5" /> },
  ready:     { label: "Mark Served",     icon: <UtensilsCrossed className="size-3.5" /> },
  served:    { label: "Complete",        icon: <CheckCircle2 className="size-3.5" /> },
  completed: { label: "Completed",        icon: <CheckCircle2 className="size-3.5" /> },
  cancelled: { label: "Cancelled",       icon: <X className="size-3.5" /> },
}

interface WaiterOrder extends OrderWithItems {
  tables?: { label: string | null; zone: string | null; assigned_waiter: string | null } | null
}

export function WaiterOrdersClient({
  profile,
  initialOrders,
}: {
  profile: Profile
  initialOrders: WaiterOrder[]
}) {
  const supabase = createClient()
  const [orders, setOrders] = useState(initialOrders)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<OrderStatus | "all">("all")
  const [selectedOrder, setSelectedOrder] = useState<WaiterOrder | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  // Real-time subscription for orders
  useEffect(() => {
    const channel = supabase
      .channel("waiter-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "UPDATE" && payload.new) {
            setOrders((prev) => {
              const idx = prev.findIndex((o) => o.id === payload.new.id)
              if (idx >= 0) {
                const updated = [...prev]
                updated[idx] = { ...updated[idx], ...payload.new }
                return updated
              }
              // New order — add it
              return [{ ...payload.new, tables: prev[idx]?.tables }, ...prev]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleStatusUpdate = useCallback(
    async (order: WaiterOrder, newStatus: OrderStatus) => {
      setPending(order.id)
      try {
        const result = await updateWaiterOrderStatus(order.id, newStatus)
        if (result?.error) {
          alert(result.error)
          return
        }
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
        )
        if (selectedOrder?.id === order.id) {
          setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null))
        }
      } finally {
        setPending(null)
      }
    },
    [selectedOrder]
  )

  const filtered = orders.filter((o) => {
    if (o.status === "cancelled" || o.status === "completed") return false
    if (tab !== "all" && o.status !== tab) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      String(o.order_number).includes(q) ||
      (o.tables?.label ?? "").toLowerCase().includes(q) ||
      (o.customer_name ?? "").toLowerCase().includes(q)
    )
  })

  const counts = orders.reduce(
    (acc, o) => {
      if (o.status === "cancelled" || o.status === "completed") return acc
      acc[o.status] = (acc[o.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const activeTabCount = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <StaffShell profile={profile} items={NAV_ITEMS} title="Orders">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order #, table, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-3.5" />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as OrderStatus | "all")}>
        <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">
            All ({activeTabCount})
          </TabsTrigger>
          {(["pending", "confirmed", "preparing", "ready", "served"] as OrderStatus[]).map(
            (s) =>
              counts[s] ? (
                <TabsTrigger key={s} value={s}>
                  {STATUS_CONFIG[s].label} ({counts[s]})
                </TabsTrigger>
              ) : null
          )}
        </TabsList>

        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
              <ClipboardList className="mx-auto mb-3 size-8 opacity-40" />
              <p>No orders in this stage.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((order) => (
                <WaiterOrderCard
                  key={order.id}
                  order={order}
                  onView={() => setSelectedOrder(order)}
                  onStatusUpdate={(s) => handleStatusUpdate(order, s)}
                  pending={pending === order.id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(o) => !o && setSelectedOrder(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Order #{selectedOrder?.order_number}
              {selectedOrder && (
                <Badge className={STATUS_CONFIG[selectedOrder.status as OrderStatus]?.color}>
                  {STATUS_CONFIG[selectedOrder.status as OrderStatus]?.label}
                </Badge>
              )}
            </DialogTitle>
            {selectedOrder?.tables && (
              <p className="text-sm text-muted-foreground">
                {selectedOrder.tables.label}
                {selectedOrder.tables.zone ? ` (${selectedOrder.tables.zone})` : ""}
              </p>
            )}
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Items */}
              <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                {selectedOrder.order_items?.length > 0 ? (
                  selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.quantity}x</span>
                        <span>{item.name}</span>
                        {item.notes && (
                          <span className="text-xs text-muted-foreground">({item.notes})</span>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {formatCurrency(Number(item.unit_price) * item.quantity)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No items</p>
                )}
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(Number(selectedOrder.subtotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(Number(selectedOrder.tax))}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1.5">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(Number(selectedOrder.total))}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {formatDateTime(selectedOrder.created_at)}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Close
            </Button>
            {selectedOrder && NEXT_STATUS[selectedOrder.status as OrderStatus] && (
              <Button
                onClick={() =>
                  handleStatusUpdate(selectedOrder, NEXT_STATUS[selectedOrder.status as OrderStatus]!)
                }
                disabled={pending === selectedOrder.id}
              >
                {pending === selectedOrder.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  STATUS_ACTION[selectedOrder.status as OrderStatus]?.icon
                )}
                <span className="ml-1.5">
                  {STATUS_ACTION[selectedOrder.status as OrderStatus]?.label}
                </span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffShell>
  )
}

// ─── Order Card ─────────────────────────────────────────────────────────────

function WaiterOrderCard({
  order,
  onView,
  onStatusUpdate,
  pending,
}: {
  order: WaiterOrder
  onView: () => void
  onStatusUpdate: (s: OrderStatus) => void
  pending: boolean
}) {
  const next = NEXT_STATUS[order.status as OrderStatus]
  const config = STATUS_CONFIG[order.status as OrderStatus]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              #{order.order_number}
              {order.tables && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {order.tables.label}
                </span>
              )}
            </CardTitle>
            {order.customer_name && (
              <p className="text-sm text-muted-foreground">{order.customer_name}</p>
            )}
          </div>
          <Badge className={config?.color ?? "bg-gray-100"}>
            <span className="mr-1">{config?.icon}</span>
            {config?.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" />
          {formatTime(new Date(order.created_at))}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Items preview */}
        <div className="space-y-1 text-sm max-h-24 overflow-hidden">
          {order.order_items?.slice(0, 3).map((item) => (
            <div key={item.id} className="flex justify-between text-muted-foreground">
              <span>{item.quantity}x {item.name}</span>
              <span>{formatCurrency(Number(item.unit_price) * item.quantity)}</span>
            </div>
          ))}
          {order.order_items && order.order_items.length > 3 && (
            <p className="text-xs text-muted-foreground">+{order.order_items.length - 3} more items</p>
          )}
        </div>

        {/* Total */}
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(Number(order.total))}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onView} className="flex-1">
            <Eye className="size-3.5" />
            <span className="ml-1.5">View</span>
          </Button>
          {next && (
            <Button
              size="sm"
              onClick={() => onStatusUpdate(next)}
              disabled={pending}
              className="flex-1"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                STATUS_ACTION[order.status as OrderStatus]?.icon
              )}
              <span className="ml-1.5">
                {pending ? "Updating..." : STATUS_ACTION[order.status as OrderStatus]?.label}
              </span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}