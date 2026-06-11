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
        className="w-[95vw] max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">Order #{localOrder.order_number}</h2>
                <Badge className={statusCfg?.color ?? "bg-gray-100"}>{statusCfg?.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
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
        <div className="flex flex-1 overflow-hidden" style={{ height: "calc(90vh - 140px)" }}>
          {/* Left: Menu Browser — takes MOST of the space */}
          <div className="flex-1 border-r flex flex-col overflow-hidden">
            {/* Search */}
            <div className="px-5 py-4 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search menu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 px-5 pt-4 pb-3 overflow-x-auto shrink-0 border-b">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${
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
                  className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${
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
                <div className="p-5 grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="rounded-xl border p-5 animate-pulse h-28 bg-muted/30" />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <UtensilsCrossed className="size-10 opacity-30 mb-3" />
                  <p className="text-base font-medium">No items found</p>
                </div>
              ) : (
                <div className="p-5 grid grid-cols-3 gap-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border bg-card px-5 py-4 flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleAddItem(item)}
                    >
                      <div className="flex-1">
                        <p className="font-bold text-base leading-snug">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-base font-bold text-primary">
                          {formatCurrency(item.price)}
                        </span>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddItem(item)
                          }}
                          disabled={addingItem === item.id}
                          className="h-8 px-4 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {addingItem === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Plus className="size-3.5" />
                          )}
                          <span className="text-xs font-medium">Add</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Order Summary — sidebar panel */}
          <div className="w-96 flex flex-col shrink-0">
            <div className="px-5 py-4 border-b shrink-0">
              <h3 className="font-semibold text-base">Customer Order</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review with customer · add more items if needed
              </p>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {(localOrder.order_items ?? []).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UtensilsCrossed className="size-10 opacity-30 mx-auto mb-3" />
                    <p className="text-sm font-medium">No items yet</p>
                    <p className="text-xs mt-1">Tap menu items to add</p>
                  </div>
                ) : (
                  localOrder.order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight">{item.name}</p>
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
                          className="size-8 p-0"
                          onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                          disabled={updatingItem === item.id}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="text-sm font-semibold w-8 text-center">
                          {updatingItem === item.id ? (
                            <Loader2 className="size-3.5 animate-spin mx-auto" />
                          ) : (
                            item.quantity
                          )}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="size-8 p-0"
                          onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                          disabled={updatingItem === item.id}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={updatingItem === item.id}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Totals */}
            <div className="border-t px-5 py-4 shrink-0 space-y-2 bg-muted/20">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(localOrder.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (12%)</span>
                <span className="font-medium">{formatCurrency(localOrder.tax || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
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
