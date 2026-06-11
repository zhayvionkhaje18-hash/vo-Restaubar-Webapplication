"use client"

import { useState, useEffect, useCallback } from "react"
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
  Plus,
  Minus,
  Pencil,
  Trash2,
  Search,
  X,
  ShoppingCart,
  AlertCircle,
} from "lucide-react"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { formatCurrency, formatTime } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import type { Profile, RestaurantTable, Category, MenuItem, OrderStatus } from "@/lib/types"
import {
  updateWaiterOrderStatus,
  addWaiterOrderItem,
  updateWaiterOrderItem,
  deleteWaiterOrderItem,
} from "@/app/actions/waiter"

const NAV_ITEMS: NavItem[] = [
  { href: "/waiter", label: "My Tables", icon: "LayoutDashboard" },
  { href: "/waiter/orders", label: "Orders", icon: "ClipboardList" },
  { href: "/waiter/notifications", label: "Alerts", icon: "Bell" },
]

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending:    { label: "Pending",    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  confirmed:  { label: "Confirmed",  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  preparing:  { label: "Preparing",  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ready:      { label: "Ready",      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  served:     { label: "Served",     color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  completed:  { label: "Completed", color: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400" },
  cancelled:  { label: "Cancelled", color: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500" },
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

// ─── Types ─────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string
  name: string
  quantity: number
  unit_price: number
  notes: string | null
  menu_item_id: string | null
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
  order_items: OrderItem[]
}

interface OrderItemsEditorProps {
  order: TableOrder
  categories: Category[]
  menuItems: MenuItem[]
  onClose: () => void
  onSaved: (updatedOrder: TableOrder) => void
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface WaiterTableDetailClientProps {
  profile: Profile
  table: RestaurantTable
  initialOrders: TableOrder[]
  categories: Category[]
  menuItems: MenuItem[]
}

// ─── Main Component ───────────────────────────────────────────────────────

export function WaiterTableDetailClient({
  profile,
  table,
  initialOrders,
  categories,
  menuItems,
}: WaiterTableDetailClientProps) {
  const supabase = createClient()
  const [orders, setOrders] = useState(initialOrders)
  const [pending, setPending] = useState<string | null>(null)
  const [editingOrder, setEditingOrder] = useState<TableOrder | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  // Real-time subscriptions
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
          if (payload.eventType === "INSERT") {
            setOrders((prev) => {
              if (prev.find((o) => o.id === payload.new.id)) return prev
              return [{ ...payload.new, order_items: [] } as TableOrder, ...prev]
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table.id])

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setPending(orderId)
    try {
      const result = await updateWaiterOrderStatus(orderId, newStatus)
      if (result?.error) { alert(result.error); return }
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
    } finally {
      setPending(null)
    }
  }

  const openEditor = (order: TableOrder) => {
    setEditingOrder({ ...order, order_items: [...order.order_items] })
    setEditorOpen(true)
  }

  const handleSaved = (updatedOrder: TableOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    )
    setEditorOpen(false)
    setEditingOrder(null)
  }

  const tableStatusColor =
    table.status === "available"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : table.status === "occupied"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-gray-100 text-gray-600"

  return (
    <>
      <StaffShell profile={profile} items={NAV_ITEMS} title={`Table ${table.label}`}>
        {/* Header */}
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
                <Badge className={tableStatusColor}>
                  {table.status === "available" ? "Available"
                    : table.status === "occupied" ? "Occupied"
                    : table.status === "reserved" ? "Reserved"
                    : "Unavailable"}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />{table.seats} seats
                </span>
                {table.zone && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />{table.zone}
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

        {/* Orders */}
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
            <UtensilsCrossed className="mx-auto mb-3 size-8 opacity-40" />
            <p className="font-medium">No active orders for this table.</p>
            <p className="text-sm mt-1">Orders appear here when customers place them.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status as OrderStatus]
              const nextStatus = NEXT_STATUS[order.status as OrderStatus]
              const canEdit = order.status !== "completed" && order.status !== "cancelled" && order.payment_status !== "paid"
              const isUpdating = pending === order.id

              return (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          #{order.order_number}
                          {order.customer_name && (
                            <span className="text-sm font-normal text-muted-foreground">
                              — {order.customer_name}
                            </span>
                          )}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatTime(new Date(order.created_at))}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditor(order)}
                          >
                            <Pencil className="size-3.5" />
                            <span className="ml-1.5">Edit Items</span>
                          </Button>
                        )}
                        <Badge className={cfg?.color ?? "bg-gray-100"}>{cfg?.label}</Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Items */}
                    <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                      {order.order_items.length > 0 ? (
                        order.order_items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-primary min-w-6 text-right">
                                {item.quantity}x
                              </span>
                              <div>
                                <span>{item.name}</span>
                                {item.notes && (
                                  <span className="ml-1.5 text-xs text-muted-foreground">
                                    ({item.notes})
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-muted-foreground">
                              {formatCurrency(Number(item.unit_price) * item.quantity)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No items
                        </p>
                      )}
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
                        <span className="text-muted-foreground">Tax (12%)</span>
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

                    {/* Actions */}
                    {nextStatus && (
                      <Button
                        className="w-full"
                        onClick={() => handleUpdateStatus(order.id, nextStatus)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <NextStatusIcon status={nextStatus} />
                        )}
                        <span className="ml-2">
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
      </StaffShell>

      {/* Order Items Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={(o) => { if (!o) { setEditorOpen(false); setEditingOrder(null) } }}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Order #{editingOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          {editingOrder && (
            <OrderItemsEditor
              order={editingOrder}
              categories={categories}
              menuItems={menuItems}
              onClose={() => { setEditorOpen(false); setEditingOrder(null) }}
              onSaved={handleSaved}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Order Items Editor ───────────────────────────────────────────────────

function OrderItemsEditor({ order, categories, menuItems, onClose, onSaved }: OrderItemsEditorProps) {
  const [items, setItems] = useState<OrderItem[]>(order.order_items)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<"current" | "add">("current")

  // Add item from menu
  const handleAddItem = async (menuItem: MenuItem) => {
    setSaving(true)
    try {
      const result = await addWaiterOrderItem({
        order_id: order.id,
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: Number(menuItem.price),
        quantity: 1,
      })
      if (result?.error) { alert(result.error); return }

      // Optimistically add item to local state
      const newItem: OrderItem = {
        id: crypto.randomUUID(),
        name: menuItem.name,
        quantity: 1,
        unit_price: Number(menuItem.price),
        notes: null,
        menu_item_id: menuItem.id,
      }
      setItems((prev) => [...prev, newItem])
    } finally {
      setSaving(false)
    }
  }

  // Update item quantity
  const handleUpdateQty = async (itemId: string, newQty: number) => {
    if (newQty < 1) return
    setSaving(true)
    try {
      const result = await updateWaiterOrderItem({ item_id: itemId, quantity: newQty })
      if (result?.error) { alert(result.error); return }
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i))
      )
    } finally {
      setSaving(false)
    }
  }

  // Update item notes
  const handleUpdateNotes = async (itemId: string, notes: string) => {
    setSaving(true)
    try {
      const item = items.find((i) => i.id === itemId)
      if (!item) return
      const result = await updateWaiterOrderItem({
        item_id: itemId,
        quantity: item.quantity,
        notes: notes || undefined,
      })
      if (result?.error) { alert(result.error); return }
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, notes: notes || null } : i))
      )
    } finally {
      setSaving(false)
    }
  }

  // Delete item
  const handleDelete = async (itemId: string) => {
    if (!confirm("Remove this item from the order?")) return
    setSaving(true)
    try {
      const result = await deleteWaiterOrderItem(itemId)
      if (result?.error) { alert(result.error); return }
      setItems((prev) => prev.filter((i) => i.id !== itemId))
    } finally {
      setSaving(false)
    }
  }

  // Save and close
  const handleSave = () => {
    // Recalculate totals for the updated order
    const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0)
    const tax = Math.round(subtotal * 0.12 * 100) / 100
    const total = Math.round((subtotal + tax) * 100) / 100
    onSaved({ ...order, order_items: items, subtotal, tax, total })
  }

  // Computed totals
  const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0)
  const tax = Math.round(subtotal * 0.12 * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100

  // Filter menu items
  const filteredMenu = menuItems.filter((item) => {
    if (categoryFilter !== "all" && item.category_id !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return item.name.toLowerCase().includes(q) || (item.description ?? "").toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "current" | "add")}>
        <TabsList className="w-full">
          <TabsTrigger value="current" className="flex-1">
            Current Items ({items.length})
          </TabsTrigger>
          <TabsTrigger value="add" className="flex-1">
            <span className="flex items-center gap-1">
              <Plus className="size-3.5" />
              Add Items
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Current Items Tab */}
        <TabsContent value="current" className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-muted-foreground">
              <p className="text-sm">No items yet. Switch to "Add Items" to add menu items.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(Number(item.unit_price))} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7"
                      onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                      disabled={saving || item.quantity <= 1}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7"
                      onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                      disabled={saving}
                    >
                      <Plus className="size-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(item.id)}
                      disabled={saving}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Input
                    placeholder="Add notes (e.g. no ice, extra spicy)"
                    defaultValue={item.notes ?? ""}
                    className="h-7 text-xs"
                    onBlur={(e) => {
                      if (e.target.value !== (item.notes ?? "")) {
                        handleUpdateNotes(item.id, e.target.value)
                      }
                    }}
                  />
                </div>
              </div>
            ))
          )}

          {/* Running totals */}
          {items.length > 0 && (
            <div className="rounded-lg bg-muted/30 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (12%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1.5">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Add Items Tab */}
        <TabsContent value="add" className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Category filters */}
          <div className="flex gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant={categoryFilter === "all" ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setCategoryFilter("all")}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={categoryFilter === cat.id ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Menu items grid */}
          {filteredMenu.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-muted-foreground">
              <p className="text-sm">No menu items found.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {filteredMenu.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleAddItem(item)}
                  disabled={saving}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(Number(item.price))}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-primary hover:bg-primary/10"
                      onClick={(e) => { e.stopPropagation(); handleAddItem(item) }}
                      disabled={saving}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          <span className="ml-1.5">Save & Update Order</span>
        </Button>
      </DialogFooter>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

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