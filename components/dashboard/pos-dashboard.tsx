"use client"

import { useState, useEffect, useTransition } from "react"
import {
  CreditCard,
  RotateCcw,
  Search,
  Plus,
  Minus,
  X,
  ShoppingCart,
  Loader2,
  Check,
  Banknote,
  Smartphone,
  AlertCircle,
} from "lucide-react"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
import { formatCurrency, TAX_RATE } from "@/lib/constants"
import type { Profile, Category, MenuItem, RestaurantTable } from "@/lib/types"
import { createPosOrder, processPosPayment, getPosData } from "@/app/actions/pos"

const NAV_ITEMS: NavItem[] = [
  { href: "/pos", label: "POS Terminal", icon: "LayoutDashboard" },
  { href: "/pos/orders", label: "Orders", icon: "ShoppingCart" },
  { href: "/pos/receipts", label: "Receipts", icon: "Receipt" },
]

interface CartItem {
  id: string
  menu_item_id: string | null
  name: string
  price: number
  qty: number
}

type PayMethod = "cash" | "card" | "gcash" | "maya"

interface PaymentDialog {
  open: boolean
  method: PayMethod
  amountTendered: string
}

export function PosDashboard({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition()

  // Menu data from Supabase
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [tableId, setTableId] = useState<string>("")
  const [customerName, setCustomerName] = useState("")
  const [orderNotes, setOrderNotes] = useState("")

  // Payment dialog
  const [payDialog, setPayDialog] = useState<PaymentDialog>({
    open: false,
    method: "cash",
    amountTendered: "",
  })

  // Success toast
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Load menu + tables on mount
  useEffect(() => {
    getPosData().then((data) => {
      setCategories(data.categories)
      setMenuItems(data.menuItems)
      setTables(data.tables)
      setLoadingData(false)
    })
  }, [])

  const filteredMenu = menuItems.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(search.toLowerCase())
    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "uncategorized" && !item.category_id) ||
      item.category_id === categoryFilter
    return matchesSearch && matchesCategory
  })

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
      }
      return [
        ...prev,
        { id: item.id, menu_item_id: item.id, name: item.name, price: item.price, qty: 1 },
      ]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    )
  }

  const removeItem = (id: string) => setCart((prev) => prev.filter((item) => item.id !== id))

  const clearCart = () => {
    setCart([])
    setTableId("")
    setCustomerName("")
    setOrderNotes("")
  }

  // Hold Order → create order without payment
  const handleHoldOrder = () => {
    if (!cart.length) return
    startTransition(async () => {
      const result = await createPosOrder({
        table_id: tableId || null,
        customer_name: customerName || null,
        items: cart.map((c) => ({
          menu_item_id: c.menu_item_id ?? "",
          name: c.name,
          price: c.price,
          quantity: c.qty,
        })),
        notes: orderNotes || null,
      })
      if (result?.error) {
        alert(result.error)
        return
      }
      showSuccess("Order sent to kitchen!")
      clearCart()
    })
  }

  // Pay Now → open payment dialog
  const handlePayNow = () => {
    if (!cart.length) return
    setPayDialog({ open: true, method: "cash", amountTendered: "" })
  }

  const confirmPayment = () => {
    if (!cart.length) return
    startTransition(async () => {
      // First create the order
      const orderResult = await createPosOrder({
        table_id: tableId || null,
        customer_name: customerName || null,
        items: cart.map((c) => ({
          menu_item_id: c.menu_item_id ?? "",
          name: c.name,
          price: c.price,
          quantity: c.qty,
        })),
        notes: orderNotes || null,
      })
      if (orderResult?.error) {
        alert(orderResult.error)
        return
      }

      const orderId = orderResult.order_id!
      const method = payDialog.method as "cash" | "card" | "gcash" | "maya"
      const amountTendered =
        payDialog.method === "cash"
          ? parseFloat(payDialog.amountTendered) || undefined
          : undefined

      const payResult = await processPosPayment({
        order_id: orderId,
        method,
        amount_tendered: amountTendered,
      })

      if (payResult?.error) {
        alert(payResult.error)
        return
      }

      setPayDialog((d) => ({ ...d, open: false }))
      if (payResult?.change_due && payResult.change_due > 0) {
        showSuccess(`Payment complete! Change: ${formatCurrency(payResult.change_due)}`)
      } else {
        showSuccess("Payment complete!")
      }
      clearCart()
    })
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const changeDue =
    payDialog.method === "cash" && payDialog.amountTendered
      ? Math.max(0, parseFloat(payDialog.amountTendered) - total)
      : null

  if (loadingData) {
    return (
      <StaffShell profile={profile} items={NAV_ITEMS} title="POS Terminal">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </StaffShell>
    )
  }

  return (
    <StaffShell profile={profile} items={NAV_ITEMS} title="POS Terminal">
      {/* Success toast */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg dark:bg-emerald-950/30 dark:text-emerald-400">
          <Check className="size-4" />
          {successMsg}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: Menu */}
        <div className="flex-1 space-y-4">
          {/* Search */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Table #" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No table</SelectItem>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label} {t.status === "occupied" ? "(occupied)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer name */}
          <Input
            placeholder="Customer name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="max-w-xs"
          />

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={categoryFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("all")}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={categoryFilter === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Menu Grid */}
          {filteredMenu.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              No menu items found. Add items in Admin &rarr; Menu first.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMenu.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => addToCart(item)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 font-semibold text-primary">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="w-full lg:w-96">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Current Order</CardTitle>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart}>
                    Clear
                  </Button>
                )}
              </div>
              {tableId && (
                <Badge variant="outline" className="w-fit">
                  {tables.find((t) => t.id === tableId)?.label ?? "Table"}
                </Badge>
              )}
              {customerName && (
                <p className="text-sm text-muted-foreground">{customerName}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cart Items */}
              {cart.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <ShoppingCart className="mx-auto mb-2 size-8" />
                  <p>No items in cart</p>
                  <p className="text-sm">Click menu items to add</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg bg-muted/50 p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(item.price)} each
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => updateQty(item.id, -1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center font-medium">{item.qty}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => updateQty(item.id, 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              {cart.length > 0 && (
                <>
                  <div className="border-t pt-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg pt-1">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {/* Payment Buttons */}
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handlePayNow}
                      disabled={pending}
                    >
                      {pending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                      <span className="ml-2">Pay Now</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleHoldOrder}
                      disabled={pending}
                    >
                      {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                      <span className="ml-2">Hold Order</span>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog
        open={payDialog.open}
        onOpenChange={(o) => setPayDialog((d) => ({ ...d, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Total */}
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>

            {/* Method */}
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select
                value={payDialog.method}
                onValueChange={(v) => setPayDialog((d) => ({ ...d, method: v as PayMethod }))}
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
                      <CreditCard className="size-4" /> Card
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

            {/* Cash: amount tendered */}
            {payDialog.method === "cash" && (
              <div className="space-y-1.5">
                <Label>Amount Tendered</Label>
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
                    <span>
                      Insufficient amount. Need{" "}
                      <strong>{formatCurrency(total)}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPayDialog((d) => ({ ...d, open: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPayment}
              disabled={
                pending ||
                (payDialog.method === "cash" &&
                  (!payDialog.amountTendered || parseFloat(payDialog.amountTendered) < total))
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {payDialog.method === "cash" ? "Complete Payment" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffShell>
  )
}