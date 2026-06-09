"use client"

import { useState } from "react"
import { CreditCard, RotateCcw, Search, Plus, Minus, X, ShoppingCart } from "lucide-react"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/constants"
import type { Profile } from "@/lib/types"

const NAV_ITEMS: NavItem[] = [
  { href: "/pos", label: "POS Terminal", icon: "LayoutDashboard" },
  { href: "/pos/orders", label: "Orders", icon: "ShoppingCart" },
  { href: "/pos/receipts", label: "Receipts", icon: "Receipt" },
]

// Mock menu items for POS
const MOCK_MENU = [
  { id: "1", name: "Grilled Salmon", price: 600, category: "Main Course" },
  { id: "2", name: "Beef Steak", price: 700, category: "Main Course" },
  { id: "3", name: "Caesar Salad", price: 200, category: "Salads" },
  { id: "4", name: "Margarita", price: 200, category: "Drinks" },
  { id: "5", name: "Tiramisu", price: 250, category: "Desserts" },
  { id: "6", name: "Iced Tea", price: 80, category: "Drinks" },
  { id: "7", name: "Chicken Wings", price: 350, category: "Appetizers" },
  { id: "8", name: "Pasta Carbonara", price: 450, category: "Main Course" },
]

const MOCK_CATEGORIES = ["All", "Appetizers", "Salads", "Main Course", "Drinks", "Desserts"]

interface CartItem {
  id: string
  name: string
  price: number
  qty: number
}

export function PosDashboard({ profile }: { profile: Profile }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [tableNumber, setTableNumber] = useState("")

  const filteredMenu = MOCK_MENU.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === "All" || item.category === category
    return matchesSearch && matchesCategory
  })

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const tax = subtotal * 0.12
  const total = subtotal + tax

  const addToCart = (item: typeof MOCK_MENU[0]) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    })
  }

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const clearCart = () => setCart([])

  const handlePayment = () => {
    if (cart.length === 0) return
    alert(`Payment processing for ${formatCurrency(total)}\nTable: ${tableNumber || "N/A"}`)
    clearCart()
    setTableNumber("")
  }

  return (
    <StaffShell profile={profile} items={NAV_ITEMS} title="POS Terminal">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Menu Section */}
        <div className="flex-1 space-y-4">
          {/* Search and Table */}
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
            <Input
              placeholder="Table #"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-32"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {MOCK_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Menu Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMenu.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => addToCart(item)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {item.category}
                      </Badge>
                    </div>
                    <span className="font-semibold text-primary">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart Section */}
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
              {tableNumber && (
                <Badge variant="outline" className="w-fit">
                  Table {tableNumber}
                </Badge>
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
                    <div key={item.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name}</div>
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
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax (12%)</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {/* Payment Buttons */}
                  <div className="space-y-2">
                    <Button className="w-full" size="lg" onClick={handlePayment}>
                      <CreditCard className="mr-2 size-4" />
                      Pay Now
                    </Button>
                    <Button variant="outline" className="w-full">
                      <RotateCcw className="mr-2 size-4" />
                      Hold Order
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </StaffShell>
  )
}