"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { RESTAURANT_NAME } from "@/lib/constants"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  ShoppingCart,
  Plus,
  Minus,
  UtensilsCrossed,
  ArrowLeft,
  Check,
  X,
  Clock,
  ChefHat,
  Truck,
  PartyPopper,
  Bell,
  Users,
  Lock,
  KeyRound,
  Receipt,
  Gamepad2,
  ChevronRight,
} from "lucide-react"
import type { Category, MenuItem, RestaurantTable, OrderStatus } from "@/lib/types"

// ============================================================
// ORDER STATUS TRACKER
// ============================================================
const STATUS_STEPS: { status: OrderStatus; label: string; icon: typeof Clock }[] = [
  { status: "pending", label: "Order Sent", icon: Clock },
  { status: "confirmed", label: "Confirmed", icon: Check },
  { status: "preparing", label: "Preparing", icon: ChefHat },
  { status: "ready", label: "Ready to Serve", icon: Truck },
  { status: "served", label: "Served", icon: PartyPopper },
]

interface TrackedOrder {
  id: string
  status: OrderStatus
  subtotal: number
  tax: number
  total: number
  order_items?: {
    id: string
    name: string
    unit_price: number
    quantity: number
  }[]
}

function OrderStatusTracker({ sessionId }: { sessionId: string | null }) {
  const [orders, setOrders] = useState<TrackedOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return

    async function fetchOrders() {
      const supabase = createClient()
      const { data } = await supabase
        .from("orders")
        .select("id, status, subtotal, tax, total, created_at, order_items(id, name, unit_price, quantity)")
        .eq("session_id", sessionId)
        .neq("status", "cancelled") // hide cancelled orders
        .order("created_at", { ascending: true })

      setOrders((data as TrackedOrder[]) ?? [])
      setLoading(false)
    }

    fetchOrders()

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [sessionId])

  // Aggregate across all orders in the session
  const allItems = orders.flatMap((o) => o.order_items ?? [])
  const totalSubtotal = orders.reduce((s, o) => s + Number(o.subtotal), 0)
  const totalTax = orders.reduce((s, o) => s + Number(o.tax), 0)
  const totalAmount = orders.reduce((s, o) => s + Number(o.total), 0)

  // The "active" status = the earliest order that's still in-progress
  // (not yet served/cancelled). All later orders follow the same status path.
  const statusOrder: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served"]
  const activeOrder = orders.find((o) => statusOrder.includes(o.status as OrderStatus))
  const allServed = orders.length > 0 && orders.every((o) => o.status === "served")
  const currentStatus: OrderStatus = allServed
    ? "served"
    : (activeOrder?.status as OrderStatus) ?? "pending"

  // For the itemized list, show all items from all orders, grouped by order
  const aggregatedOrderData: TrackedOrder = {
    id: activeOrder?.id ?? "agg",
    status: currentStatus,
    subtotal: totalSubtotal,
    tax: totalTax,
    total: totalAmount,
    order_items: allItems,
  }
  const orderData = orders.length > 0 ? aggregatedOrderData : null

  function getStepState(stepStatus: OrderStatus): "completed" | "active" | "pending" {
    const statusOrder: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served"]
    const currentIndex = statusOrder.indexOf(currentStatus)
    const stepIndex = statusOrder.indexOf(stepStatus)

    if (stepIndex < currentIndex) return "completed"
    if (stepIndex === currentIndex) return "active"
    return "pending"
  }

  const isFinalServed = currentStatus === "served"
  const resolvedStepState = (s: "completed" | "active" | "pending") =>
    isFinalServed && s === "active" ? "completed" : s

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const items = orderData?.order_items ?? []
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  const isServed = currentStatus === "served" && orderData && orders.length > 0
  const hasNoOrders = orders.length === 0

  // Reusable itemized list with totals — shown in both states
  const ItemizedOrderCard = hasNoOrders ? (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Receipt className="size-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium">No orders yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Orders placed at this table will appear here in real-time.
        </p>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Your Order</h3>
          <span className="text-xs text-muted-foreground">
            {orders.length} order{orders.length !== 1 ? "s" : ""} · {itemCount} item
            {itemCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="space-y-1 rounded-lg border overflow-hidden">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? "border-t" : ""}`}
            >
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold shrink-0 ${
                  isServed
                    ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {item.quantity}×
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  ₱{Number(item.unit_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })} each
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums shrink-0">
                ₱{(Number(item.unit_price) * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
        {/* Totals */}
        <div className="mt-4 space-y-1.5 rounded-lg border bg-muted/30 p-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums font-medium">
              ₱{Number(orderData?.subtotal ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums font-medium">
              ₱{Number(orderData?.tax ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between border-t pt-1.5">
            <span className="text-sm font-semibold">Total</span>
            <span
              className={`text-lg font-black tabular-nums ${
                isServed ? "text-green-700 dark:text-green-400" : "text-primary"
              }`}
            >
              ₱{Number(orderData?.total ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // ── SERVED: show completion dashboard on top, then itemized list ────────
  if (isServed) {
    return (
      <div className="space-y-4">
        {/* Hero completion card */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 overflow-hidden">
          {/* Top stripe */}
          <div className="h-1.5 w-full bg-gradient-to-r from-green-400 to-emerald-500" />
          <CardContent className="p-6 sm:p-8 text-center">
            {/* Confetti burst */}
            <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30">
                <Check className="size-10 text-white" strokeWidth={2.5} />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-green-700 dark:text-green-400">
              Thank You! 🎉
            </h2>
            <p className="mt-2 text-sm sm:text-base text-green-600/80 dark:text-green-400/70 font-medium">
              Your order has been delivered.
            </p>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Thank you for your patience and for dining with us.
            </p>

            <div className="mt-6 rounded-xl border border-green-200 bg-white/70 dark:bg-green-900/20 p-4 space-y-2 max-w-sm mx-auto">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {items.length} item{items.length !== 1 ? "s" : ""} · {itemCount} serving{itemCount !== 1 ? "s" : ""}
                </span>
                <span className="font-semibold tabular-nums text-green-700 dark:text-green-400">
                  ₱{Number(orderData!.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t border-green-200 pt-2 flex items-center justify-between">
                <span className="font-semibold text-sm">Amount Due</span>
                <span className="text-xl font-black text-green-700 dark:text-green-400 tabular-nums">
                  ₱{Number(orderData!.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next steps */}
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Bell className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-200">
                  Ready for Payment
                </h4>
                <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/70 leading-relaxed">
                  Please proceed to the counter to settle your bill. If you need any assistance, feel free to call our staff — we'll be happy to help!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {ItemizedOrderCard}
      </div>
    )
  }

  // ── IN PROGRESS: step tracker + itemized list ──────────────────────────
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 text-center">Order Status</h3>
          <div className="space-y-0">
            {STATUS_STEPS.map((step, index) => {
              const state = resolvedStepState(getStepState(step.status))
              const Icon = step.icon
              const isLast = index === STATUS_STEPS.length - 1

              return (
                <div key={step.status} className="flex items-start gap-4">
                  {/* Icon & Line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                        state === "completed"
                          ? "bg-green-500 border-green-500 text-white"
                          : state === "active"
                          ? "bg-primary border-primary text-primary-foreground animate-pulse"
                          : "bg-muted border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {state === "completed" ? (
                        <Check className="size-5" />
                      ) : (
                        <Icon className="size-5" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`h-8 w-0.5 ${
                          state === "completed" ? "bg-green-500" : "bg-muted-foreground/20"
                        }`}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 pb-6">
                    <p className={`font-medium ${state === "active" ? "text-primary" : ""}`}>
                      {step.label}
                    </p>
                    {state === "completed" && (
                      <p className="text-xs text-green-600">Done</p>
                    )}
                    {state === "active" && (
                      <p className="text-xs text-muted-foreground">In progress...</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-sm text-muted-foreground">
              Status updates automatically as our staff prepares your order
            </p>
          </div>
        </CardContent>
      </Card>

      {ItemizedOrderCard}
    </div>
  )
}

// ============================================================
// WELCOME MODAL
// ============================================================
function CreateSessionModal({
  table,
  onSubmit,
}: {
  table: RestaurantTable | null
  onSubmit: (name: string, accessCode: string) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [confirmCode, setConfirmCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) return
    if (!/^\d{4}$/.test(accessCode)) {
      setError("Access code must be exactly 4 digits")
      return
    }
    if (accessCode !== confirmCode) {
      setError("Access codes do not match")
      return
    }
    setLoading(true)
    try {
      await onSubmit(name.trim(), accessCode)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start session"
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <Card className="border-0 shadow-2xl shadow-black/40">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <UtensilsCrossed className="size-10 text-white" />
            </div>

            <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
              Welcome to
            </h1>
            <p className="mb-1 text-3xl font-extrabold tracking-tight text-primary">
              {RESTAURANT_NAME}
            </p>
            <p className="mb-6 text-sm text-muted-foreground">
              Start a shared table session
            </p>

            {table && (
              <div className="mb-6 rounded-xl border bg-muted/40 px-4 py-3">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Your Table
                </p>
                <p className="text-2xl sm:text-3xl font-black text-primary">{table.label}</p>
                {table.zone && (
                  <p className="text-xs sm:text-sm text-muted-foreground">{table.zone}</p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-left space-y-1.5">
                <Label htmlFor="customerName" className="text-sm font-semibold">
                  Your Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerName"
                  placeholder="e.g. Maria"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError("")
                  }}
                  className="h-12 text-base"
                  autoComplete="name"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  You&apos;ll be the host of this table&apos;s shared session
                </p>
              </div>

              <div className="text-left space-y-1.5">
                <Label htmlFor="accessCode" className="text-sm font-semibold">
                  Set Access Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="accessCode"
                  inputMode="numeric"
                  placeholder="4-digit PIN"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                    setError("")
                  }}
                  className="h-12 text-center text-xl sm:text-2xl font-black tracking-[0.4em]"
                  maxLength={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Share this code with friends at your table so they can join
                </p>
              </div>

              <div className="text-left space-y-1.5">
                <Label htmlFor="confirmCode" className="text-sm font-semibold">
                  Confirm Access Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmCode"
                  inputMode="numeric"
                  placeholder="Re-enter PIN"
                  value={confirmCode}
                  onChange={(e) => {
                    setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                    setError("")
                  }}
                  className="h-12 text-center text-xl sm:text-2xl font-black tracking-[0.4em]"
                  maxLength={4}
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-3 py-2 text-xs text-destructive text-left">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-semibold mt-2"
                disabled={
                  !name.trim() ||
                  accessCode.length !== 4 ||
                  confirmCode.length !== 4 ||
                  loading
                }
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Starting session...
                  </span>
                ) : (
                  <>
                    <Users className="mr-2 size-5" />
                    Start Shared Session
                  </>
                )}
              </Button>
            </form>

            <p className="mt-5 text-xs text-muted-foreground">
              All guests at your table will share the same cart and orders
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function JoinSessionModal({
  table,
  hostName,
  onSubmit,
  onCancel,
}: {
  table: RestaurantTable | null
  hostName: string
  onSubmit: (accessCode: string) => Promise<void>
  onCancel: () => void
}) {
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!/^\d{4}$/.test(accessCode)) {
      setError("Please enter the 4-digit access code")
      return
    }
    setLoading(true)
    try {
      await onSubmit(accessCode)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Incorrect access code"
      setError(msg)
      setAttempts((a) => a + 1)
      setAccessCode("")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <Card className="border-0 shadow-2xl shadow-black/40">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <Lock className="size-8 text-amber-600 dark:text-amber-400" />
            </div>

            <h1 className="mb-1 text-xl font-bold tracking-tight text-foreground">
              Table Session Active
            </h1>
            <p className="text-sm text-muted-foreground">
              This table is already hosting a session
            </p>

            {table && (
              <div className="mt-5 mb-5 rounded-xl border bg-muted/40 px-4 py-3">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Table
                </p>
                <p className="text-2xl sm:text-3xl font-black text-primary">{table.label}</p>
                {table.zone && (
                  <p className="text-xs sm:text-sm text-muted-foreground">{table.zone}</p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/50 p-4 mb-5">
              <p className="text-xs text-amber-700 dark:text-amber-400/80 uppercase tracking-wider font-semibold">
                Session Host
              </p>
              <p className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                {hostName}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-left space-y-1.5">
                <Label htmlFor="joinCode" className="text-sm font-semibold">
                  Enter Access Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="joinCode"
                  inputMode="numeric"
                  placeholder="4-digit PIN from the host"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                    setError("")
                  }}
                  className="h-12 text-center text-xl sm:text-2xl font-black tracking-[0.4em]"
                  maxLength={4}
                  autoFocus
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ask the host for the 4-digit PIN
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-3 py-2 text-xs text-destructive text-left">
                  {error}
                </div>
              )}

              {attempts >= 2 && (
                <p className="text-xs text-muted-foreground">
                  Need help? Please ask the host to share the access code.
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-semibold"
                disabled={accessCode.length !== 4 || loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Verifying...
                  </span>
                ) : (
                  <>
                    <KeyRound className="mr-2 size-5" />
                    Join Session
                  </>
                )}
              </Button>
            </form>

            <p className="mt-4 text-xs text-muted-foreground">
              Only people with the access code can join this table&apos;s session.
            </p>

            <button
              onClick={onCancel}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Not your table? Go back
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// MENU ITEM CARD
// ============================================================
function MenuItemCard({
  item,
  onAdd,
}: {
  item: MenuItem
  onAdd: (item: MenuItem) => void
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/30 flex flex-row min-h-[140px]">
      {/* Left — image */}
      {item.image_url && (
        <div className="w-36 sm:w-44 shrink-0 overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      {/* No image placeholder */}
      {!item.image_url && (
        <div className="w-20 sm:w-28 shrink-0 flex items-center justify-center bg-muted">
          <UtensilsCrossed className="size-8 text-muted-foreground/40" />
        </div>
      )}

      {/* Right — text content */}
      <CardContent className="p-3 sm:p-4 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm sm:text-base leading-tight flex-1 min-w-0 truncate">
              {item.name}
            </h3>
            <p className="text-base sm:text-lg font-bold text-primary whitespace-nowrap tabular-nums shrink-0">
              ₱{item.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </p>
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
        <div className="mt-2">
          <Button
            size="sm"
            className="h-8 w-full sm:w-auto font-medium text-xs"
            onClick={() => onAdd(item)}
            disabled={!item.is_available}
          >
            <Plus className="mr-1 size-3.5" />
            {item.is_available ? "Add" : "Unavailable"}
          </Button>
        </div>
      </CardContent>
    </div>
  )
}

// ============================================================
// CART ITEM ROW
// ============================================================
function CartItemRow({
  item,
  quantity,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: MenuItem
  quantity: number
  onIncrease: () => void
  onDecrease: () => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{item.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
            ₱{item.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })} each
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 -mt-1 -mr-1 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove item"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="size-8"
            onClick={onDecrease}
            aria-label="Decrease quantity"
          >
            <Minus className="size-3.5" />
          </Button>
          <span className="w-9 text-center font-semibold text-sm tabular-nums">
            {quantity}
          </span>
          <Button
            size="icon"
            variant="outline"
            className="size-8"
            onClick={onIncrease}
            aria-label="Increase quantity"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
        <p className="font-bold text-base tabular-nums">
          ₱{(item.price * quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// CART DRAWER
// ============================================================
function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  cartTotal,
  taxRate,
  onSubmit,
  customerName,
  submitting,
}: {
  isOpen: boolean
  onClose: () => void
  cartItems: { item: MenuItem; quantity: number }[]
  cartTotal: number
  taxRate: number
  onSubmit: () => void
  customerName: string
  submitting: boolean
}) {
  // Tax and total calculated
  const tax = Math.round(cartTotal * taxRate * 100) / 100
  const grandTotal = Math.round((cartTotal + tax) * 100) / 100
  const itemCount = cartItems.reduce((sum, c) => sum + c.quantity, 0)

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed bottom-0 right-0 top-0 z-50 w-full sm:max-w-md bg-background shadow-2xl transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header band */}
        <div className="flex items-center justify-between border-b bg-muted/30 px-5 sm:px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold">Your Order</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {itemCount > 0
                ? `${itemCount} item${itemCount !== 1 ? "s" : ""} · ${customerName}`
                : customerName}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close cart">
            <X className="size-5" />
          </Button>
        </div>

        {/* Items */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ShoppingCart className="size-8 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-foreground">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Browse the menu and tap "Add to Order" on items you'd like to enjoy
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cartItems.map(({ item, quantity }) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  quantity={quantity}
                  onIncrease={() => onIncrease(item.id)}
                  onDecrease={() => onDecrease(item.id)}
                  onRemove={() => onRemove(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with totals + submit */}
        {cartItems.length > 0 && (
          <div className="border-t bg-muted/10 px-5 sm:px-6 py-4 space-y-4 shrink-0">
            {/* Totals breakdown */}
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums font-medium">
                  ₱{cartTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({Math.round(taxRate * 100)}%)</span>
                <span className="tabular-nums font-medium">
                  ₱{tax.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-baseline border-t pt-2 mt-1">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-xl font-bold text-primary tabular-nums">
                  ₱{grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-12 text-base font-semibold"
              onClick={onSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="size-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="mr-2 size-5" />
                  Submit Order
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Your order will be sent directly to the kitchen
            </p>
          </div>
        )}
      </div>
    </>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
interface CartItem {
  item: MenuItem
  quantity: number
}

export default function CustomerOrderPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <CustomerOrderContent />
    </Suspense>
  )
}

function CustomerOrderContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const token = searchParams.get("t")

  const [table, setTable] = useState<RestaurantTable | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [taxRate, setTaxRate] = useState<number>(0.12) // default fallback
  const [orderPlaced, setOrderPlacedState] = useState(false)
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  // Sync orderPlaced with localStorage (keyed by session id) so /play → back returns to Order Placed view
  const setOrderPlaced = (v: boolean) => {
    setOrderPlacedState(v)
    if (typeof window === "undefined") return
    const sid = sessionState.kind === "active" ? sessionState.sessionId : "default"
    if (v) localStorage.setItem(`order_placed_${sid}`, "1")
    else localStorage.removeItem(`order_placed_${sid}`)
  }

  // Session state
  type SessionState =
    | { kind: "loading" }
    | { kind: "create" }
    | { kind: "join"; hostName: string }
    | { kind: "active"; sessionId: string; hostName: string; myName: string }
  const [sessionState, setSessionState] = useState<SessionState>({ kind: "loading" })
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Load table, categories, menu, and settings + check active session
  useEffect(() => {
    if (!token) return

    async function load() {
      setLoading(true)

      // Find table by QR token
      const { data: qrData } = await supabase
        .from("table_qr_codes")
        .select("table_id, is_active")
        .eq("token", token)
        .eq("is_active", true)
        .single()

      if (!qrData) {
        setLoading(false)
        return
      }

      // Get table info
      const { data: tableData } = await supabase
        .from("tables")
        .select("*")
        .eq("id", qrData.table_id)
        .single()

      setTable(tableData)

      // Check for active session on this table
      const { data: activeSession } = await supabase
        .from("table_sessions")
        .select("id, customer_name, status")
        .eq("table_id", tableData.id)
        .eq("status", "active")
        .maybeSingle()

      // Check if this device already has a session token in localStorage
      const storedSessionId = typeof window !== "undefined" ? localStorage.getItem(`session_${tableData.id}`) : null
      if (storedSessionId) {
        // Verify stored session is still valid + matches active session
        const { data: storedSession } = await supabase
          .from("table_sessions")
          .select("id, customer_name, status")
          .eq("id", storedSessionId)
          .eq("status", "active")
          .maybeSingle()
        if (storedSession) {
          setSessionState({
            kind: "active",
            sessionId: storedSession.id,
            hostName: storedSession.customer_name,
            myName: storedSession.customer_name,
          })
          await loadMenu()
          return
        }
        // Stored session is dead — clear it
        localStorage.removeItem(`session_${tableData.id}`)
      }

      // No valid session yet
      if (activeSession) {
        setSessionState({ kind: "join", hostName: activeSession.customer_name })
      } else {
        setSessionState({ kind: "create" })
      }

      await loadMenu()

      async function loadMenu() {
        // Get categories
        const { data: catData } = await supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order")
        setCategories(catData ?? [])

        // Get menu items
        const { data: menuData } = await supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("name")
        setMenuItems(menuData ?? [])

        // Get tax rate
        const { data: settingsData } = await supabase
          .from("restaurant_settings")
          .select("tax_rate")
          .limit(1)
          .maybeSingle()
        if (settingsData?.tax_rate != null) {
          setTaxRate(settingsData.tax_rate / 100)
        }

        setLoading(false)
      }
    }

    load()
  }, [token, supabase])

  // Create new session (first customer)
  async function handleCreateSession(name: string, accessCode: string) {
    if (!table) return
    setSessionError(null)
    const res = await fetch("/api/table-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", table_id: table.id, customer_name: name, access_code: accessCode }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to start session")
    // Persist session id
    localStorage.setItem(`session_${table.id}`, data.session.id)
    setSessionState({
      kind: "active",
      sessionId: data.session.id,
      hostName: data.session.customer_name,
      myName: data.session.customer_name,
    })
  }

  // Join existing session
  async function handleJoinSession(accessCode: string) {
    if (!table) return
    setSessionError(null)
    const res = await fetch("/api/table-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", table_id: table.id, access_code: accessCode }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Incorrect access code")
    localStorage.setItem(`session_${table.id}`, data.session.id)
    setSessionState({
      kind: "active",
      sessionId: data.session.id,
      hostName: data.session.customer_name,
      myName: data.session.customer_name, // joiners don't set their own name in this flow
    })
  }

  // Hydrate orderPlaced from localStorage when the active session changes
  useEffect(() => {
    if (typeof window === "undefined") return
    if (sessionState.kind !== "active") return
    const stored = localStorage.getItem(`order_placed_${sessionState.sessionId}`)
    if (stored === "1" && !orderPlaced) {
      setOrderPlacedState(true)
    }
  }, [sessionState.kind === "active" ? sessionState.sessionId : null, orderPlaced])

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id)
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      }
      return [...prev, { item, quantity: 1 }]
    })
  }

  function updateQuantity(itemId: string, delta: number) {
    setCart((prev) => {
      return prev
        .map((c) =>
          c.item.id === itemId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c
        )
        .filter((c) => c.quantity > 0)
    })
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId))
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)

  async function handleSubmitOrder() {
    if (!table || cart.length === 0) return
    if (sessionState.kind !== "active") return

    setSubmitting(true)

    // Compute totals fresh from current state to avoid stale closures
    const currentCartTotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0)
    const currentTax = Math.round(currentCartTotal * taxRate * 100) / 100
    const currentTotal = Math.round((currentCartTotal + currentTax) * 100) / 100

    // Create order linked to the active table session
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        table_id: table.id,
        session_id: sessionState.sessionId,
        session_token: sessionState.sessionId, // legacy field, keep populated
        customer_name: sessionState.myName,
        status: "pending",
        payment_status: "unpaid",
        subtotal: currentCartTotal,
        tax: currentTax,
        total: currentTotal,
        notes: null,
      })
      .select()
      .single()

    if (orderError || !orderData) {
      alert("Failed to create order: " + (orderError?.message || "Unknown error"))
      setSubmitting(false)
      return
    }

    // Insert order items
    const orderItems = cart.map((c) => ({
      order_id: orderData.id,
      menu_item_id: c.item.id,
      name: c.item.name,
      unit_price: c.item.price,
      quantity: c.quantity,
      status: "pending",
    }))

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

    if (itemsError) {
      alert("Failed to add items: " + (itemsError.message || "Unknown error"))
      setSubmitting(false)
      return
    }

    // Show confirmation FIRST
    setOrderPlaced(true)
    setOrderNumber(orderData.order_number)

    // Clear cart + drawer
    setCart([])
    setShowCart(false)
    setSubmitting(false)
  }

  // No token
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-sm text-center">
          <CardContent className="p-8">
            <X className="mx-auto mb-4 size-12 text-destructive" />
            <h1 className="text-xl font-bold">Invalid QR Code</h1>
            <p className="mt-2 text-muted-foreground">
              This QR code is not recognized. Please scan the QR on your table.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    )
  }

  // Table not found
  if (!table) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-sm text-center">
          <CardContent className="p-8">
            <X className="mx-auto mb-4 size-12 text-destructive" />
            <h1 className="text-xl font-bold">Table Not Found</h1>
            <p className="mt-2 text-muted-foreground">
              This QR code is no longer active. Please contact our staff.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Order placed success - show tracking page
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header band */}
        <header className="border-b bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <Check className="size-9" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Order Placed!</h1>
            <p className="mt-2 text-sm sm:text-base text-primary-foreground/90">
              Your order has been sent to our Staff
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8 space-y-5 sm:space-y-6">
          {/* Order Details Card */}
          <Card className="overflow-hidden">
            <div className="bg-muted/40 border-b px-5 sm:px-6 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Order Number
              </p>
              <p className="text-3xl sm:text-4xl font-black text-primary mt-0.5 tabular-nums">
                #{orderNumber}
              </p>
            </div>
            <CardContent className="p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Table
                  </p>
                  <p className="font-bold text-xl sm:text-2xl">{table.label}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Name
                  </p>
                  <p className="font-bold text-lg sm:text-xl truncate">
                    {sessionState.kind === "active" ? sessionState.myName : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Tracker — shows step tracker or completion dashboard if served */}
          <OrderStatusTracker
            sessionId={sessionState.kind === "active" ? sessionState.sessionId : null}
          />

          {/* Play While Waiting — game link */}
          {sessionState.kind === "active" && sessionState.sessionId && (
            <Button
              onClick={() => {
                setOrderPlaced(false)
                setShowCart(false)
              }}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Plus className="mr-2 size-5" />
              Add more items to your order
            </Button>

            <a
              href={`/play?session_id=${sessionState.sessionId}&table_id=${table?.id ?? ""}&name=${encodeURIComponent(sessionState.myName)}&token=${token ?? ""}`}
              className="group flex items-center justify-between gap-3 rounded-2xl border-2 border-purple-200 dark:border-purple-800/50 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 dark:from-purple-950/40 dark:via-pink-950/30 dark:to-amber-950/30 p-4 sm:p-5 transition-all hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-md shadow-purple-500/30 group-hover:scale-110 transition-transform">
                  <Gamepad2 className="size-5 sm:size-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm sm:text-base text-purple-900 dark:text-purple-200">
                    Want to play some games while waiting? 🎮
                  </p>
                  <p className="text-xs text-purple-700/70 dark:text-purple-300/70 mt-0.5">
                    Tap here for Flappy Bird and other mini games
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-purple-600 dark:text-purple-300 group-hover:translate-x-1 transition-transform">
                <ChevronRight className="size-5" />
              </div>
            </a>
          )}
        </main>
      </div>
    )
  }

  // Create session (first customer) modal
  if (sessionState.kind === "create") {
    return (
      <CreateSessionModal
        table={table}
        onSubmit={async (name, code) => {
          await handleCreateSession(name, code)
        }}
      />
    )
  }

  // Join session (subsequent customers) modal
  if (sessionState.kind === "join") {
    return (
      <JoinSessionModal
        table={table}
        hostName={sessionState.hostName}
        onSubmit={async (code) => {
          await handleJoinSession(code)
        }}
        onCancel={() => {
          // Allow them to back out — reload to scan a different QR
          window.location.href = "/"
        }}
      />
    )
  }

  // Filtered menu
  const filteredItems =
    activeCategory === "all"
      ? menuItems
      : menuItems.filter((m) => m.category_id === activeCategory)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary shrink-0">
              <UtensilsCrossed className="size-4 sm:size-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-base truncate">
                {RESTAURANT_NAME}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Table {table.label} · {sessionState.kind === "active" ? sessionState.myName : ""}
              </p>
            </div>
          </div>
          <Button
            size="default"
            className="relative shrink-0"
            onClick={() => setShowCart(true)}
            aria-label={`View cart with ${cartCount} item${cartCount !== 1 ? "s" : ""}`}
          >
            <ShoppingCart className="size-4 sm:size-5" />
            <span className="ml-1.5 hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-bold">
                {cartCount}
              </span>
            )}
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="mx-auto max-w-5xl overflow-x-auto px-4 pb-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeCategory === "all" ? "default" : "outline"}
              onClick={() => setActiveCategory("all")}
              className="shrink-0"
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={activeCategory === cat.id ? "default" : "outline"}
                onClick={() => setActiveCategory(cat.id)}
                className="shrink-0"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Grid */}
      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-6">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <UtensilsCrossed className="size-8 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-foreground">No items available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back soon or try another category
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {filteredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} onAdd={addToCart} />
            ))}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cartItems={cart}
        cartTotal={cartTotal}
        taxRate={taxRate}
        onSubmit={handleSubmitOrder}
        customerName={sessionState.kind === "active" ? sessionState.myName : ""}
        submitting={submitting}
        onIncrease={(id) => updateQuantity(id, 1)}
        onDecrease={(id) => updateQuantity(id, -1)}
        onRemove={removeFromCart}
      />
    </div>
  )
}