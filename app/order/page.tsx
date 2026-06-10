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
} from "lucide-react"
import type { Category, MenuItem, RestaurantTable } from "@/lib/types"

// ============================================================
// WELCOME MODAL
// ============================================================
function WelcomeModal({
  table,
  onSubmit,
}: {
  table: RestaurantTable | null
  onSubmit: (name: string) => void
}) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
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

            {/* Name Input */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-left">
                <Label htmlFor="customerName" className="text-sm font-medium">
                  Your Name
                </Label>
                <Input
                  id="customerName"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 h-12 text-base"
                  autoComplete="name"
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-semibold"
                disabled={!name.trim() || loading}
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
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/20">
      {item.image_url && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold leading-tight">{item.name}</h3>
            {item.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-primary">
              ₱{item.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="mt-3 w-full"
          onClick={() => onAdd(item)}
          disabled={!item.is_available}
        >
          <Plus className="mr-1 size-4" />
          {item.is_available ? "Add to Order" : "Unavailable"}
        </Button>
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
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-tight">{item.name}</p>
        <p className="text-sm text-primary font-semibold">
          ₱{item.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="outline" className="size-8" onClick={onDecrease}>
          <Minus className="size-3" />
        </Button>
        <span className="w-8 text-center font-semibold">{quantity}</span>
        <Button size="icon" variant="outline" className="size-8" onClick={onIncrease}>
          <Plus className="size-3" />
        </Button>
      </div>
      <p className="w-20 text-right font-semibold">
        ₱{(item.price * quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
      </p>
      <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={onRemove}>
        <X className="size-4" />
      </Button>
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
  onSubmit,
  customerName,
}: {
  isOpen: boolean
  onClose: () => void
  cartItems: { item: MenuItem; quantity: number }[]
  cartTotal: number
  onSubmit: () => void
  customerName: string
}) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed bottom-0 right-0 top-0 z-50 w-full max-w-md bg-background shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-4">
            <div>
              <h2 className="text-lg font-bold">Your Order</h2>
              <p className="text-sm text-muted-foreground">{customerName}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="size-5" />
            </Button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-auto p-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="mb-3 size-12 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">Your cart is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add items from the menu to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map(({ item, quantity }) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    quantity={quantity}
                    onIncrease={() => {}}
                    onDecrease={() => {}}
                    onRemove={() => {}}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="border-t p-4 space-y-4">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">
                  ₱{cartTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={onSubmit}
              >
                <Check className="mr-2 size-5" />
                Submit Order
              </Button>
            </div>
          )}
        </div>
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
  const [activeCategory, setActiveCategory] = useState<string>("all")

  // Load table, categories, and menu
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

    // Create order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        table_id: table.id,
        session_token: token,
        customer_name: customerName,
        status: "pending",
        payment_status: "unpaid",
        subtotal: cartTotal,
        tax: 0,
        total: cartTotal,
        notes: null,
      })
      .select()
      .single()

    if (orderError || !orderData) {
      alert("Failed to create order. Please try again.")
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
      alert("Failed to add items. Please try again.")
      setSubmitting(false)
      return
    }

    // Update table status
    await supabase
      .from("tables")
      .update({ status: "occupied", current_order_id: orderData.id })
      .eq("id", table.id)

    setOrderNumber(orderData.order_number)
    setOrderPlaced(true)
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

  // Order placed success
  if (orderPlaced) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md text-center shadow-2xl">
          <CardContent className="p-8">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500 shadow-lg">
              <Check className="size-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-green-600">Order Placed!</h1>
            <p className="mt-2 text-muted-foreground">
              Your order has been sent to our kitchen.
            </p>
            <div className="mt-6 rounded-xl bg-muted/50 px-6 py-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Order Number
              </p>
              <p className="text-4xl font-black text-primary">#{orderNumber}</p>
            </div>
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              <p>Table: <strong>{table.label}</strong></p>
              <p>Name: <strong>{customerName}</strong></p>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Our staff will bring your order to you shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Welcome modal
  if (showWelcome) {
    return <WelcomeModal table={table} onSubmit={handleWelcomeSubmit} />
  }

  // Filtered menu
  const filteredItems =
    activeCategory === "all"
      ? menuItems
      : menuItems.filter((m) => m.category_id === activeCategory)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <UtensilsCrossed className="size-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold">{RESTAURANT_NAME}</p>
              <p className="text-xs text-muted-foreground">
                Table {table.label} • {customerName}
              </p>
            </div>
          </div>
          <Button
            size="lg"
            className="relative"
            onClick={() => setShowCart(true)}
          >
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
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
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={activeCategory === cat.id ? "default" : "outline"}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Grid */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center">
            <UtensilsCrossed className="mx-auto mb-4 size-12 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No items available</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        onSubmit={handleSubmitOrder}
        customerName={customerName ?? ""}
      />
    </div>
  )
}