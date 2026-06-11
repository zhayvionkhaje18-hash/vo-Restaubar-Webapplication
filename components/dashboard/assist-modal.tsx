"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  CheckCircle2,
  Loader2,
  UtensilsCrossed,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency } from "@/lib/constants"
import {
  getWaiterMenu,
  addWaiterOrderItem,
  updateWaiterOrderItem,
  deleteWaiterOrderItem,
  confirmWaiterOrder,
} from "@/app/actions/waiter"
import type { Profile, OrderStatus } from "@/lib/types"

interface AssistModalProps {
  open: boolean
  onClose: () => void
  order: WaiterOrderForModal
  profile: Profile
  onConfirmed: (orderId: string) => void
  onOrderUpdated: (order: WaiterOrderForModal) => void
}

export interface WaiterOrderForModal {
  id: string
  order_number: number
  status: OrderStatus
  subtotal: number
  tax: number
  total: number
  customer_name: string | null
  created_at: string
  tables?: { label: string | null; zone: string | null; assigned_waiter: string | null } | null
  order_items?: {
    id: string
    name: string
    unit_price: number
    quantity: number
    notes: string | null
    status: string
  }[]
}

interface MenuCategory {
  id: string
  name: string
  sort_order: number
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category_id: string | null
  is_available: boolean
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending:   { label: "Pending Review",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  confirmed: { label: "Confirmed",         color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  preparing: { label: "Preparing",         color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ready:     { label: "Ready",              color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  served:    { label: "Served",             color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  completed: { label: "Completed",           color: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400" },
  cancelled: { label: "Cancelled",          color: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500" },
}

export function AssistModal({
  open,
  onClose,
  order,
  profile,
  onConfirmed,
  onOrderUpdated,
}: AssistModalProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [updatingItem, setUpdatingItem] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [localOrder, setLocalOrder] = useState(order)

  // Keep local order in sync when prop changes
  useEffect(() => {
    setLocalOrder(order)
  }, [order])

  // Fetch menu
  useEffect(() => {
    if (!open) return
    setLoadingMenu(true)
    getWaiterMenu().then((result) => {
      if (!result.error) {
        setCategories(result.categories as MenuCategory[])
        setMenuItems(result.menuItems as MenuItem[])
      }
      setLoadingMenu(false)
    })
  }, [open])

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category_id === activeCategory
    const matchesSearch =
      !search || item.name.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch && item.is_available
  })

  const handleAddItem = useCallback(
    async (item: MenuItem) => {
      setAddingItem(item.id)
      try {
        const result = await addWaiterOrderItem({
          order_id: localOrder.id,
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        })
        if (result?.error) {
          alert(result.error)
          return
        }
        // Refresh order items locally
        const newItem = {
          id: `temp-${Date.now()}`,
          name: item.name,
          unit_price: item.price,
          quantity: 1,
          notes: null,
          status: "pending",
        }
        const newSubtotal = (localOrder.subtotal || 0) + item.price
        const tax = Math.round(newSubtotal * 0.12 * 100) / 100
        const newTotal = Math.round((newSubtotal + tax) * 100) / 100
        const updated = {
          ...localOrder,
          order_items: [...(localOrder.order_items ?? []), newItem],
          subtotal: newSubtotal,
          tax,
          total: newTotal,
        }
        setLocalOrder(updated)
        onOrderUpdated(updated)
      } finally {
        setAddingItem(null)
      }
    },
    [localOrder, onOrderUpdated]
  )

  const handleUpdateQty = useCallback(
    async (itemId: string, newQty: number) => {
      if (newQty < 1) {
        await handleDeleteItem(itemId)
        return
      }
      setUpdatingItem(itemId)
      try {
        const item = localOrder.order_items?.find((i) => i.id === itemId)
        if (!item) return
        const result = await updateWaiterOrderItem({ item_id: itemId, quantity: newQty })
        if (result?.error) {
          alert(result.error)
          return
        }
        const priceDiff = (newQty - item.quantity) * item.unit_price
        const newSubtotal = (localOrder.subtotal || 0) + priceDiff
        const tax = Math.round(newSubtotal * 0.12 * 100) / 100
        const newTotal = Math.round((newSubtotal + tax) * 100) / 100
        const updated = {
          ...localOrder,
          order_items: localOrder.order_items?.map((i) =>
            i.id === itemId ? { ...i, quantity: newQty } : i
          ),
          subtotal: newSubtotal,
          tax,
          total: newTotal,
        }
        setLocalOrder(updated)
        onOrderUpdated(updated)
      } finally {
        setUpdatingItem(null)
      }
    },
    [localOrder, onOrderUpdated]
  )

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      const item = localOrder.order_items?.find((i) => i.id === itemId)
      if (!item) return
      setUpdatingItem(itemId)
      try {
        if (!itemId.startsWith("temp-")) {
          const result = await deleteWaiterOrderItem(itemId)
          if (result?.error) {
            alert(result.error)
            return
          }
        }
        const newSubtotal = (localOrder.subtotal || 0) - item.unit_price * item.quantity
        const tax = Math.round(Math.max(0, newSubtotal) * 0.12 * 100) / 100
        const newTotal = Math.round((Math.max(0, newSubtotal) + tax) * 100) / 100
        const updated = {
          ...localOrder,
          order_items: localOrder.order_items?.filter((i) => i.id !== itemId),
          subtotal: newSubtotal,
          tax,
          total: newTotal,
        }
        setLocalOrder(updated)
        onOrderUpdated(updated)
      } finally {
        setUpdatingItem(null)
      }
    },
    [localOrder, onOrderUpdated]
  )

  const handleConfirm = useCallback(async () => {
    if (!confirm("Send this order to the kitchen?")) return
    setConfirming(true)
    try {
      const result = await confirmWaiterOrder(localOrder.id)
      if (result?.error) {
        alert(result.error)
        setConfirming(false)
        return
      }
      onConfirmed(localOrder.id)
      onClose()
    } finally {
      setConfirming(false)
    }
  }, [localOrder.id, onConfirmed, onClose])

  const statusCfg = STATUS_CONFIG[localOrder.status as OrderStatus]
  const itemCount = (localOrder.order_items ?? []).reduce((s, i) => s + i.quantity, 0)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-5xl p-0 gap-0 overflow-hidden"
        style={{ maxHeight: "90vh", height: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Order #{localOrder.order_number}</h2>
                <Badge className={statusCfg?.color ?? "bg-gray-100"}>{statusCfg?.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {localOrder.tables?.label
                  ? `${localOrder.tables.label}${localOrder.tables.zone ? ` (${localOrder.tables.zone})` : ""}`
                  : "No table"}
                {localOrder.customer_name ? ` · ${localOrder.customer_name}` : ""}
                {" · "}
                {itemCount} item{itemCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Body: Menu + Order Summary side by side */}
        <div className="flex flex-1 overflow-hidden" style={{ height: "calc(90vh - 130px)" }}>
          {/* Left: Menu Browser */}
          <div className="flex-1 border-r flex flex-col overflow-hidden">
            {/* Search */}
            <div className="px-4 py-3 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search menu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto shrink-0 border-b">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            <ScrollArea className="flex-1">
              {loadingMenu ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-lg border p-4 animate-pulse h-20 bg-muted/30" />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <UtensilsCrossed className="size-8 opacity-30 mb-2" />
                  <p className="text-sm">No items found</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-3 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base leading-tight">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-primary whitespace-nowrap">
                          {formatCurrency(item.price)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleAddItem(item)}
                          disabled={addingItem === item.id}
                          className="h-8 px-3 gap-1.5"
                        >
                          {addingItem === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Plus className="size-3.5" />
                          )}
                          <span className="text-xs">Add</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Order Summary */}
          <div className="w-80 flex flex-col shrink-0">
            <div className="px-4 py-3 border-b shrink-0">
              <h3 className="font-semibold text-sm">Customer Order</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review with customer · add more items if needed
              </p>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {(localOrder.order_items ?? []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UtensilsCrossed className="size-8 opacity-30 mx-auto mb-2" />
                    <p className="text-sm">No items yet</p>
                    <p className="text-xs">Add items from the menu</p>
                  </div>
                ) : (
                  localOrder.order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{item.name}</p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatCurrency(item.unit_price)} each
                        </p>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="size-7 p-0"
                          onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                          disabled={updatingItem === item.id}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center">
                          {updatingItem === item.id ? (
                            <Loader2 className="size-3 animate-spin mx-auto" />
                          ) : (
                            item.quantity
                          )}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="size-7 p-0"
                          onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                          disabled={updatingItem === item.id}
                        >
                          <Plus className="size-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={updatingItem === item.id}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Totals */}
            <div className="border-t px-4 py-3 shrink-0 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(localOrder.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (12%)</span>
                <span>{formatCurrency(localOrder.tax || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-1.5">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(localOrder.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Actions */}
        <div className="flex items-center justify-between border-t px-5 py-3 shrink-0 bg-muted/20">
          <div className="text-xs text-muted-foreground">
            {localOrder.tables?.label ? (
              <span>
                Table: <strong>{localOrder.tables.label}</strong>
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirming || (localOrder.order_items ?? []).length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {confirming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ChefHat className="size-4" />
              )}
              <span className="ml-2">Confirm & Send to Kitchen</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
