"use client"

import { useState, useTransition, useCallback } from "react"
import {
  ChefHat,
  Check,
  Clock,
  CreditCard,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  X,
  UtensilsCrossed,
  AlertCircle,
  Plus,
} from "lucide-react"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CreditCard as CreditCardIcon,
  Banknote,
  Smartphone,
} from "lucide-react"
import { formatCurrency, formatDateTime, TAX_RATE } from "@/lib/constants"
import type { Profile, OrderWithItems, OrderStatus } from "@/lib/types"
import {
  updatePosOrderStatus,
  cancelPosOrder,
  processPosPayment,
  getPosMenu,
  addPosOrderItem,
} from "@/app/actions/pos"
import { MenuBrowserModal } from "@/components/dashboard/assist-modal"
import { CancelOrderModal } from "@/components/pos/cancel-order-modal"

const NAV_ITEMS: NavItem[] = [
  { href: "/pos", label: "POS Terminal", icon: "LayoutDashboard" },
  { href: "/pos/orders", label: "Orders", icon: "ShoppingCart" },
  { href: "/pos/tables", label: "Tables", icon: "Utensils" },
  { href: "/pos/receipts", label: "Receipts", icon: "Receipt" },
]

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  preparing: { label: "Preparing", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  ready: { label: "Ready", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  served: { label: "Served", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "served",
}

const STATUS_ACTION: Record<OrderStatus, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "Confirm", icon: <Check className="size-3.5" />, variant: "default" },
  confirmed: { label: "Start Preparing", icon: <ChefHat className="size-3.5" />, variant: "default" },
  preparing: { label: "Mark Ready", icon: <Check className="size-3.5" />, variant: "default" },
  ready: { label: "Mark Served", icon: <UtensilsCrossed className="size-3.5" />, variant: "default" },
  served: { label: "Complete", icon: <Check className="size-3.5" />, variant: "default" },
  completed: { label: "Complete", icon: <Check className="size-3.5" />, variant: "secondary" },
  cancelled: { label: "Cancelled", icon: <X className="size-3.5" />, variant: "secondary" },
}

interface PayDialog {
  open: boolean
  method: "cash" | "card" | "gcash" | "maya"
  amountTendered: string
}

export function PosOrdersClient({
  profile,
  initialOrders,
}: {
  profile: Profile
  initialOrders: OrderWithItems[]
}) {
  const [pending, startTransition] = useTransition()
  const [orders, setOrders] = useState(initialOrders)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<OrderStatus | "all">("all")
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)
  const [payDialog, setPayDialog] = useState<PayDialog>({
    open: false,
    method: "cash",
    amountTendered: "",
  })
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<OrderWithItems | null>(null)

  const filtered = orders.filter((o) => {
    if (!o.status) return false
    if (tab !== "all" && o.status !== tab) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      o.id.toLowerCase().includes(q) ||
      (o.tables?.label ?? "").toLowerCase().includes(q) ||
      (o.customer_name ?? "").toLowerCase().includes(q) ||
      String(o.order_number).includes(q)
    )
  })

  const counts = orders.reduce(
    (acc, o) => {
      if (!o.status) return acc
      acc[o.status] = (acc[o.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const handleStatusUpdate = (order: OrderWithItems, newStatus: OrderStatus) => {
    startTransition(async () => {
      const result = await updatePosOrderStatus(order.id, newStatus)
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
    })
  }

  const handleCancelSuccess = (orderId: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)))
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(null)
    }
    setOrderToCancel(null)
  }

  const openPayDialog = (order: OrderWithItems) => {
    setSelectedOrder(order)
    setPayDialog({ open: true, method: "cash", amountTendered: "" })
  }

  const handleMenuItemAdded = useCallback(
    async (addedItem: { name: string; price: number; id: string }) => {
      if (!selectedOrder) return
      // Optimistically update the local order list
      const newItem = {
        id: `temp-${Date.now()}`,
        name: addedItem.name,
        unit_price: addedItem.price,
        quantity: 1,
        notes: null,
        status: "pending",
      }
      const newSubtotal = (selectedOrder.subtotal || 0) + addedItem.price
      const tax = Math.round(newSubtotal * TAX_RATE * 100) / 100
      const newTotal = Math.round((newSubtotal + tax) * 100) / 100
      const updated = {
        ...selectedOrder,
        order_items: [...(selectedOrder.order_items ?? []), newItem],
        subtotal: newSubtotal,
        tax,
        total: newTotal,
      }
      setSelectedOrder(updated)
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? updated : o))
      )
    },
    [selectedOrder]
  )

  const confirmPayment = () => {
    if (!selectedOrder) return
    startTransition(async () => {
      const method = payDialog.method as "cash" | "card" | "gcash" | "maya"
      const amountTendered =
        payDialog.method === "cash" ? parseFloat(payDialog.amountTendered) || undefined : undefined

      const payResult = await processPosPayment({
        order_id: selectedOrder.id,
        method,
        amount_tendered: amountTendered,
      })
      if (payResult?.error) {
        alert(payResult.error)
        return
      }
      setPayDialog((d) => ({ ...d, open: false }))
      // Update order status to completed and mark as paid
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id
            ? { ...o, status: "completed", payment_status: "paid" }
            : o
        )
      )
      setSelectedOrder(null)
    })
  }

  const changeDue =
    selectedOrder && payDialog.method === "cash" && payDialog.amountTendered
      ? Math.max(0, parseFloat(payDialog.amountTendered) - Number(selectedOrder.total))
      : null

  return (
    <StaffShell profile={profile} items={NAV_ITEMS} title="Orders">
      {/* Search + tabs */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by table, customer, order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Refresh
            window.location.reload()
          }}
        >
          <RefreshCw className="size-3.5" />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as OrderStatus | "all")}>
        {/* Status summary cards — click to filter */}
        <div className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {(
            [
              "pending",
              "confirmed",
              "preparing",
              "ready",
              "served",
              "completed",
              "cancelled",
            ] as OrderStatus[]
          ).map((status) => {
            const s = STATUS_CONFIG[status]
            const active = tab === status
            return (
              <button
                key={status}
                onClick={() => setTab(active ? "all" : status)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/40"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={`size-1.5 rounded-full shrink-0 ${
                      status === "pending"
                        ? "bg-amber-500"
                        : status === "confirmed"
                        ? "bg-cyan-500"
                        : status === "preparing"
                        ? "bg-blue-500"
                        : status === "ready"
                        ? "bg-emerald-500"
                        : status === "served"
                        ? "bg-purple-500"
                        : status === "completed"
                        ? "bg-zinc-500"
                        : "bg-rose-500"
                    }`}
                  />
                  <span className="font-medium truncate">{s.label}</span>
                </span>
                <span className="font-semibold tabular-nums text-muted-foreground shrink-0 ml-2">
                  {counts[status] ?? 0}
                </span>
              </button>
            )
          })}
        </div>

        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
              No orders in this stage.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onView={() => setSelectedOrder(order)}
                  onStatusUpdate={(s) => handleStatusUpdate(order, s)}
                  onPay={() => openPayDialog(order)}
                  pending={pending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog
        open={!!selectedOrder && !payDialog.open}
        onOpenChange={(o) => !o && setSelectedOrder(null)}
      >
        <DialogContent className="w-full sm:max-w-lg md:max-w-xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
          {selectedOrder && (
            <>
              {/* Header band */}
              <div className="px-6 py-4 border-b bg-muted/30 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold">
                        Order #{selectedOrder.order_number}
                      </h2>
                      <Badge
                        className={
                          STATUS_CONFIG[selectedOrder?.status as OrderStatus]?.color ?? "bg-gray-100"
                        }
                      >
                        {STATUS_CONFIG[selectedOrder?.status as OrderStatus]?.label ??
                          selectedOrder?.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs sm:text-sm text-muted-foreground flex-wrap">
                      {selectedOrder.tables?.label && (
                        <span className="font-medium text-foreground">
                          {selectedOrder.tables.label}
                          {selectedOrder.tables.zone ? ` (${selectedOrder.tables.zone})` : ""}
                        </span>
                      )}
                      {selectedOrder.customer_name && (
                        <span>· {selectedOrder.customer_name}</span>
                      )}
                      <span>· {formatDateTime(selectedOrder.created_at)}</span>
                    </div>
                  </div>
                  {selectedOrder.payment_status === "paid" && (
                    <Badge variant="outline" className="shrink-0">
                      <CreditCard className="size-3 mr-1" /> Paid
                    </Badge>
                  )}
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-6 py-5 space-y-5">
                  {/* Items list */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Order Items
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {selectedOrder.order_items?.length ?? 0} item
                        {(selectedOrder.order_items?.length ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-1.5 rounded-lg border bg-card overflow-hidden">
                      {selectedOrder.order_items?.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-4 py-3 ${
                            idx > 0 ? "border-t" : ""
                          }`}
                        >
                          <div className="flex items-center justify-center size-7 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                            {item.quantity}×
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">
                              {item.name}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {item.notes}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatCurrency(Number(item.unit_price))} each
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold tabular-nums">
                              {formatCurrency(Number(item.unit_price) * item.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Totals */}
                  <section className="rounded-lg border bg-muted/20 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums font-medium">
                        {formatCurrency(Number(selectedOrder.subtotal))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (12%)</span>
                      <span className="tabular-nums font-medium">
                        {formatCurrency(Number(selectedOrder.tax))}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline border-t pt-2 mt-2">
                      <span className="text-sm font-semibold">Total</span>
                      <span className="text-xl font-bold text-primary tabular-nums">
                        {formatCurrency(Number(selectedOrder.total))}
                      </span>
                    </div>
                  </section>
                </div>
              </div>

              {/* Footer actions — proper corporate layout */}
              <div className="border-t px-6 py-4 shrink-0 bg-muted/10">
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
                  {/* Left side: secondary actions */}
                  <div className="flex gap-2 flex-wrap">
                    {selectedOrder.payment_status !== "paid" &&
                      selectedOrder?.status !== "cancelled" && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => setShowMenuModal(true)}
                            disabled={pending}
                            size="sm"
                          >
                            <Plus className="size-3.5" />
                            <span className="ml-1.5">Add Items</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setOrderToCancel(selectedOrder)
                              setShowCancelModal(true)
                            }}
                            disabled={pending}
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="size-3.5" />
                            <span className="ml-1.5">Cancel Order</span>
                          </Button>
                        </>
                      )}
                  </div>

                  {/* Right side: primary action + close */}
                  <div className="flex gap-2 sm:ml-auto">
                    <Button variant="ghost" onClick={() => setSelectedOrder(null)} size="sm">
                      Close
                    </Button>
                    {selectedOrder.payment_status !== "paid" &&
                      selectedOrder?.status !== "cancelled" && (
                        <>
                          {selectedOrder?.status &&
                            NEXT_STATUS[selectedOrder.status as OrderStatus] &&
                            selectedOrder.status !== "served" && (
                              <Button
                                onClick={() =>
                                  handleStatusUpdate(
                                    selectedOrder,
                                    NEXT_STATUS[selectedOrder.status as OrderStatus]!
                                  )
                                }
                                disabled={pending}
                                size="sm"
                              >
                                {STATUS_ACTION[selectedOrder.status as OrderStatus]?.icon}
                                <span className="ml-1.5">
                                  {STATUS_ACTION[selectedOrder.status as OrderStatus]?.label}
                                </span>
                              </Button>
                            )}
                          {selectedOrder?.status === "served" && (
                            <Button
                              onClick={() => openPayDialog(selectedOrder)}
                              disabled={pending}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CreditCard className="size-3.5" />
                              <span className="ml-1.5">Process Payment</span>
                            </Button>
                          )}
                          {selectedOrder?.status === "completed" && (
                            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400">
                              <Check className="size-3 mr-1" /> Completed
                            </Badge>
                          )}
                        </>
                      )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={payDialog.open}
        onOpenChange={(o) => setPayDialog((d) => ({ ...d, open: o }))}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(Number(selectedOrder.total))}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payment Method</label>
                <Select
                  value={payDialog.method}
                  onValueChange={(v) =>
                    setPayDialog((d) => ({ ...d, method: v as "cash" | "card" | "gcash" | "maya" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="size-4" /> Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCardIcon className="size-4" /> Card
                      </div>
                    </SelectItem>
                    <SelectItem value="gcash">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-4" /> GCash
                      </div>
                    </SelectItem>
                    <SelectItem value="maya">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-4" /> Maya
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {payDialog.method === "cash" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Amount Tendered</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={payDialog.amountTendered}
                    onChange={(e) =>
                      setPayDialog((d) => ({ ...d, amountTendered: e.target.value }))
                    }
                    className="text-lg"
                  />
                  {changeDue !== null && changeDue > 0 && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/20">
                      <span className="font-medium">Change:</span>{" "}
                      <span className="text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(changeDue)}
                      </span>
                    </div>
                  )}
                  {changeDue !== null && changeDue < 0 && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/20">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>Insufficient amount. Need {formatCurrency(Number(selectedOrder.total))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPayDialog((d) => ({ ...d, open: false }))}>
              Cancel
            </Button>
            <Button
              onClick={confirmPayment}
              disabled={
                pending ||
                (payDialog.method === "cash" &&
                  (!payDialog.amountTendered ||
                    parseFloat(payDialog.amountTendered) < Number(selectedOrder?.total ?? 0)))
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Complete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Browser Modal */}
      {selectedOrder && (
        <MenuBrowserModal
          open={showMenuModal}
          onClose={() => setShowMenuModal(false)}
          orderId={selectedOrder.id}
          onItemAdded={handleMenuItemAdded}
          getMenu={getPosMenu}
          addItem={addPosOrderItem}
        />
      )}

      {/* Cancel Order Modal */}
      <CancelOrderModal
        order={orderToCancel}
        open={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setOrderToCancel(null)
        }}
        onSuccess={handleCancelSuccess}
      />
    </StaffShell>
  )
}

function OrderCard({
  order,
  onView,
  onStatusUpdate,
  onPay,
  pending,
}: {
  order: OrderWithItems
  onView: () => void
  onStatusUpdate: (s: OrderStatus) => void
  onPay: () => void
  pending: boolean
}) {
  const next = order.status ? NEXT_STATUS[order.status as OrderStatus] : undefined

  return (
    <Card>
      <CardHeader className="pb-3">
        {/* Header: Order # + Status Badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Order</p>
            <CardTitle className="text-base font-bold tracking-tight">
              #{order.order_number}
            </CardTitle>
          </div>
          <Badge className={STATUS_CONFIG[order.status as OrderStatus]?.color ?? "bg-gray-100"}>
            {STATUS_CONFIG[order.status as OrderStatus]?.label ?? order.status}
          </Badge>
        </div>
      </CardHeader>

      {/* Center: Table Number (Hero) */}
      <CardContent className="py-8 space-y-1">
        <div className="text-center">
          {order.tables && (
            <>
              <p className="text-4xl font-bold tracking-tight">
                {order.tables.label}
              </p>
              {order.tables.zone && (
                <p className="text-sm text-muted-foreground mt-2">
                  {order.tables.zone}
                </p>
              )}
            </>
          )}
          {!order.tables && order.customer_name && (
            <p className="text-3xl font-bold tracking-tight">
              {order.customer_name}
            </p>
          )}
        </div>
      </CardContent>

      {/* Bottom: Action Buttons */}
      <CardContent className="pt-0 pb-4">
        {/* Payment badge */}
        {order.payment_status === "paid" && (
          <div className="mb-3">
            <Badge variant="outline" className="w-full justify-center text-green-700 border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400">
              <CreditCard className="size-3 mr-1" /> Paid
            </Badge>
          </div>
        )}
        {order.payment_status === "pending" && (
          <div className="mb-3">
            <Badge variant="secondary" className="w-full justify-center">
              Payment Pending
            </Badge>
          </div>
        )}

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
              {STATUS_ACTION[order.status as OrderStatus]?.icon}
              <span className="ml-1.5">{STATUS_ACTION[order.status as OrderStatus]?.label}</span>
            </Button>
          )}
          {order.status === "served" && order.payment_status !== "paid" && (
            <Button size="sm" onClick={onPay} disabled={pending} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              <CreditCard className="size-3.5" />
              <span className="ml-1.5">Pay</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}