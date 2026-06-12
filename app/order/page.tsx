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

function OrderStatusTracker({ token }: { token: string | null }) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>("pending")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    async function fetchOrder() {
      const supabase = createClient()
      const { data } = await supabase
        .from("orders")
        .select("status")
        .eq("session_token", token)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setCurrentStatus(data.status)
      }
      setLoading(false)
    }

    fetchOrder()

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [token])

  function getStepState(stepStatus: OrderStatus): "completed" | "active" | "pending" {
    const statusOrder: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served"]
    const currentIndex = statusOrder.indexOf(currentStatus)
    const stepIndex = statusOrder.indexOf(stepStatus)

    if (stepIndex < currentIndex) return "completed"
    if (stepIndex === currentIndex) return "active"
    return "pending"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4 text-center">Order Status</h3>
        <div className="space-y-0">
          {STATUS_STEPS.map((step, index) => {
            const state = getStepState(step.status)
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
                    <Icon className="size-5" />
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
  )
}

// ============================================================
// WELCOME MODAL
// ============================================================
function WelcomeModal({
  table,
  tableCode,
  onSubmit,
}: {
  table: RestaurantTable | null
  tableCode: string | null
  onSubmit: (name: string) => void
}) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState("")
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    
    // Verify table code
    if (!tableCode) {
      setCodeError("Table code not available. Please contact staff.")
      return
    }
    
    if (code.trim() !== tableCode) {
      setCodeError("Invalid table code. Please check the code on your table.")
      return
    }
    
    setCodeError("")
    setLoading(true)
    onSubmit(name.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <Card className="border-0 shadow-2xl shadow-black/40">
          <CardContent className="p-8 text-center">
            {/* Restaurant Logo/Icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <UtensilsCrossed className="size-10 text-white" />
            </div>

            {/* Welcome Text */}
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
              Welcome to
            </h1>
            <p className="mb-1 text-3xl font-extrabold tracking-tight text-primary">
              {RESTAURANT_NAME}
            </p>
            <p className="mb-6 text-sm text-muted-foreground">
              Fine dining, delivered to your table
            </p>

            {/* Table Info */}
            {table && (
              <div className="mb-6 rounded-xl bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Your Table
                </p>
                <p className="text-3xl font-black text-primary">{table.label}</p>
                {table.zone && (
                  <p className="text-sm text-muted-foreground">{table.zone}</p>
                )}
              </div>
            )}

            {/* Code + Name Input */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Table Code Input */}
              <div className="text-left">
                <Label htmlFor="tableCode" className="text-sm font-medium">
                  Table Code *
                </Label>
                <Input
                  id="tableCode"
                  placeholder="Enter 4-digit code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 4))
                    setCodeError("")
                  }}
                  className="mt-1.5 h-12 text-center text-2xl font-black tracking-widest"
                  maxLength={4}
                  required
                />
                {codeError && (
                  <p className="mt-1 text-xs text-destructive">{codeError}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Find the code on your table&apos;s QR card
                </p>
              </div>

              {/* Name Input */}
              <div className="text-left">
                <Label htmlFor="customerName" className="text-sm font-medium">
                  Your Name *
                </Label>
                <Input
                  id="customerName"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 h-12 text-base"
                  autoComplete="name"
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-semibold"
                disabled={!name.trim() || code.length !== 4 || loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Please wait...
                  </span>
                ) : (
                  <>
                    <UtensilsCrossed className="mr-2 size-5" />
                    View Menu & Order
                  </>
                )}
              </Button>
            </form>

            <p className="mt-4 text-xs text-muted-foreground">
              Your order will be sent directly to our kitchen
            </p>
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
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/30 flex flex-col">
      {item.image_url && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-base leading-tight flex-1 min-w-0">
            {item.name}
          </h3>
          <p className="text-lg font-bold text-primary whitespace-nowrap tabular-nums shrink-0">
            ₱{item.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </p>
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
            {item.description}
          </p>
        )}
        <div className="mt-auto pt-2">
          <Button
            className="w-full h-10 font-medium"
            onClick={() => onAdd(item)}
            disabled={!item.is_available}
          >
            <Plus className="mr-1.5 size-4" />
            {item.is_available ? "Add to Order" : "Unavailable"}
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
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [orderTotal, setOrderTotal] = useState<number>(0)
  const [orderItems, setOrderItems] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [taxRate, setTaxRate] = useState<number>(0.12) // default fallback

  // Load table, categories, menu, and settings
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

      // Get tax rate from settings
      const { data: settingsData } = await supabase
        .from("restaurant_settings")
        .select("tax_rate")
        .limit(1)
        .maybeSingle()

      if (settingsData?.tax_rate != null) {
        setTaxRate(settingsData.tax_rate / 100) // stored as 12, convert to 0.12
      }

      setLoading(false)
    }

    load()
  }, [token, supabase])

  function handleWelcomeSubmit(name: string) {
    setCustomerName(name)
    setShowWelcome(false)
  }

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
    if (!token || !table || !customerName || cart.length === 0) return

    setSubmitting(true)

    // Compute totals fresh from current state to avoid stale closures
    const currentCartTotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0)
    const currentTax = Math.round(currentCartTotal * taxRate * 100) / 100
    const currentTotal = Math.round((currentCartTotal + currentTax) * 100) / 100

    // Create order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        table_id: table.id,
        session_token: token,
        customer_name: customerName,
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

    // Capture values before async gap
    const finalOrderNumber = orderData.order_number
    const finalTotal = currentTotal
    const finalCart = [...cart]

    // Show confirmation FIRST — this triggers the re-render immediately
    setOrderPlaced(true)
    setOrderNumber(finalOrderNumber)
    setOrderTotal(finalTotal)
    setOrderItems(finalCart)

    // Then clear the cart/drawer — happens in same batch after confirmation renders
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
              Your order has been sent to our kitchen
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
            <CardContent className="p-5 sm:p-6 space-y-5">
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
                  <p className="font-bold text-lg sm:text-xl truncate">{customerName}</p>
                </div>
              </div>
              <div className="border-t pt-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Total Amount
                </p>
                <p className="text-3xl sm:text-4xl font-black text-primary tabular-nums">
                  ₱{orderTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Status Tracker */}
          <OrderStatusTracker token={token} />

          {/* Order Items */}
          {orderItems.length > 0 && (
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-base">Your Order Items</h3>
                  <span className="text-xs text-muted-foreground">
                    {orderItems.length} item{orderItems.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1 rounded-lg border overflow-hidden">
                  {orderItems.map(({ item, quantity }, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        idx > 0 ? "border-t" : ""
                      }`}
                    >
                      <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                        {quantity}×
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                          ₱
                          {item.price.toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          each
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums shrink-0">
                        ₱
                        {(item.price * quantity).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    )
  }

  // Welcome modal
  if (showWelcome) {
    return <WelcomeModal table={table} tableCode={(table as any).table_code} onSubmit={handleWelcomeSubmit} />
  }

  // Filtered menu
  const filteredItems =
    activeCategory === "all"
      ? menuItems
      : menuItems.filter((m) => m.category_id === activeCategory))

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
                Table {table.label} · {customerName}
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
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
        customerName={customerName ?? ""}
        submitting={submitting}
        onIncrease={(id) => updateQuantity(id, 1)}
        onDecrease={(id) => updateQuantity(id, -1)}
        onRemove={removeFromCart}
      />
    </div>
  )
}