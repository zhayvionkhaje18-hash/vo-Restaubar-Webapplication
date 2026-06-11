"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  ChefHat,
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

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category_id: string | null
  is_available: boolean
}

interface MenuCategory {
  id: string
  name: string
  sort_order: number
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending:   { label: "Pending Review",  color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  confirmed: { label: "Confirmed",      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  preparing: { label: "Preparing",      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ready:     { label: "Ready",           color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  served:    { label: "Served",          color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  completed: { label: "Completed",       color: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400" },
  cancelled: { label: "Cancelled",       color: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500" },
}

// ─── Menu Browser Modal (fully responsive) ───────────────────────────────────

function MenuBrowserModal({
  open,
  onClose,
  orderId,
  onItemAdded,
}: {
  open: boolean
  onClose: () => void
  orderId: string
  onItemAdded: (item: MenuItem) => void
}) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [addingItem, setAddingItem] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getWaiterMenu().then((result) => {
      if (!result.error) {
        setCategories(result.categories as MenuCategory[])
        setMenuItems(result.menuItems as MenuItem[])
      }
      setLoading(false)
    })
  }, [open])

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category_id === activeCategory
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch && item.is_available
  })

  const handleAddItem = useCallback(
    async (item: MenuItem) => {
      if (addingItem === item.id) return // Prevent double-click
      setAddingItem(item.id)
      try {
        const result = await addWaiterOrderItem({
          order_id: orderId,
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        })
        if (result?.error) {
          alert(result.error)
          return
        }
        onItemAdded(item)
      } finally {
        setAddingItem(null)
      }
    },
    [orderId, onItemAdded, addingItem]
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="w-full sm:w-[90vw] md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[95vh] sm:max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col"
        style={{ height: "min(90vh, 800px)" }}
      >
        {/* Header — fixed, never overlaps */}
        <div className="flex items-center justify-between gap-3 border-b px-4 sm:px-6 py-3 sm:py-4 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold truncate">Select Menu Items</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Tap an item to add it to the order
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 size-9"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Search — fixed */}
        <div className="px-4 sm:px-6 py-3 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 w-full"
            />
          </div>
        </div>

        {/* Category Tabs — fixed, horizontally scrollable */}
        <div className="flex gap-2 px-4 sm:px-6 py-3 overflow-x-auto shrink-0 border-b scrollbar-none">
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

        {/* Menu Grid — scrollable, responsive columns */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border p-4 animate-pulse h-28 bg-muted/30"
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
              <UtensilsCrossed className="size-10 opacity-30 mb-3" />
              <p className="text-base font-medium">No items found</p>
            </div>
          ) : (
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  disabled={addingItem === item.id}
                  className="group rounded-lg border bg-card p-3 sm:p-4 flex flex-col text-left transition-all hover:border-primary hover:shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed min-h-[100px]"
                >
                  <div className="flex-1 mb-2">
                    <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden sm:block">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-auto">
                    <span className="text-sm sm:text-base font-bold text-primary">
                      {formatCurrency(item.price)}
                    </span>
                    <div
                      className={`size-8 rounded-full flex items-center justify-center transition-colors ${
                        addingItem === item.id
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                      }`}
                    >
                      {addingItem === item.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Assist Modal — order summary + "Add Items" button ──────────────────

export function AssistModal({
  open,
  onClose,
  order,
  profile,
  onConfirmed,
  onOrderUpdated,
}: AssistModalProps) {
  const [updatingItem, setUpdatingItem] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [localOrder, setLocalOrder] = useState(order)
  const [showMenuModal, setShowMenuModal] = useState(false)

  useEffect(() => {
    setLocalOrder(order)
  }, [order])

  const handleUpdateQty = useCallback(
    async (itemId: string, newQty: number) => {
      const item = localOrder.order_items?.find((i) => i.id === itemId)
      if (!item) return

      if (newQty < 1) {
        await handleDeleteItem(itemId)
        return
      }

      setUpdatingItem(itemId)
      try {
        await updateWaiterOrderItem({ item_id: itemId, quantity: newQty })
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
          await deleteWaiterOrderItem(itemId)
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

  const handleItemAdded = useCallback(
    (addedItem: MenuItem) => {
      const newItem = {
        id: `temp-${Date.now()}`,
        name: addedItem.name,
        unit_price: addedItem.price,
        quantity: 1,
        notes: null as string | null,
        status: "pending",
      }
      const newSubtotal = (localOrder.subtotal || 0) + addedItem.price
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
    },
    [localOrder, onOrderUpdated]
  )

  const statusCfg = STATUS_CONFIG[localOrder.status as OrderStatus]
  const itemCount = (localOrder.order_items ?? []).reduce((s, i) => s + i.quantity, 0)

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="w-full sm:w-[90vw] md:max-w-xl max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col">
          {/* Header — fixed */}
          <div className="flex items-center justify-between gap-3 border-b px-4 sm:px-6 py-3 sm:py-4 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold truncate">
                  Order #{localOrder.order_number}
                </h2>
                <Badge className={`${statusCfg?.color ?? "bg-gray-100"} text-xs`}>
                  {statusCfg?.label}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                {localOrder.tables?.label
                  ? `${localOrder.tables.label}${localOrder.tables.zone ? ` (${localOrder.tables.zone})` : ""}`
                  : "No table"}
                {localOrder.customer_name ? ` · ${localOrder.customer_name}` : ""}
                {" · "}
                {itemCount} item{itemCount !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 size-9"
              aria-label="Close"
            >
              <X className="size-5" />
            </Button>
          </div>

          {/* Add Order Button — fixed */}
          <div className="px-4 sm:px-6 py-3 border-b shrink-0">
            <Button
              onClick={() => setShowMenuModal(true)}
              className="w-full h-11 sm:h-12 text-sm sm:text-base gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="size-5" />
              Add Menu Items
            </Button>
          </div>

          {/* Order Items — scrollable, takes available space */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
              {(localOrder.order_items ?? []).length === 0 ? (
                <div className="text-center py-12 sm:py-16 text-muted-foreground">
                  <UtensilsCrossed className="size-10 sm:size-12 opacity-30 mx-auto mb-3" />
                  <p className="text-sm sm:text-base font-medium">No items in this order</p>
                  <p className="text-xs sm:text-sm mt-1">
                    Click "Add Menu Items" above to add items
                  </p>
                </div>
              ) : (
                localOrder.order_items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/30 border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base leading-tight truncate">
                        {item.name}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.notes}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        {formatCurrency(item.unit_price)} each
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8 sm:size-9"
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                        disabled={updatingItem === item.id}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-3.5 sm:size-4" />
                      </Button>
                      <span className="text-sm sm:text-base font-semibold w-7 sm:w-8 text-center">
                        {updatingItem === item.id ? (
                          <Loader2 className="size-3.5 sm:size-4 animate-spin mx-auto" />
                        ) : (
                          item.quantity
                        )}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8 sm:size-9"
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                        disabled={updatingItem === item.id}
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-3.5 sm:size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 sm:size-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={updatingItem === item.id}
                        aria-label="Delete item"
                      >
                        <Trash2 className="size-3.5 sm:size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals — fixed */}
          <div className="border-t px-4 sm:px-6 py-3 sm:py-4 shrink-0 space-y-1.5 sm:space-y-2 bg-muted/20">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(localOrder.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Tax (12%)</span>
              <span className="font-medium">{formatCurrency(localOrder.tax || 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-base sm:text-lg border-t pt-2">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(localOrder.total || 0)}</span>
            </div>
          </div>

          {/* Footer Actions — fixed */}
          <div className="flex items-center justify-between gap-2 border-t px-4 sm:px-6 py-3 sm:py-4 shrink-0 bg-muted/20">
            <div className="text-xs sm:text-sm text-muted-foreground truncate min-w-0 flex-1">
              {localOrder.tables?.label ? (
                <span>
                  Table:{" "}
                  <strong className="text-foreground">{localOrder.tables.label}</strong>
                </span>
              ) : null}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={onClose} size="sm" className="h-9 sm:h-10">
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirming || (localOrder.order_items ?? []).length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 h-9 sm:h-10 text-xs sm:text-sm"
              >
                {confirming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ChefHat className="size-4" />
                )}
                <span className="ml-1.5 sm:ml-2 hidden sm:inline">
                  Confirm & Send to Kitchen
                </span>
                <span className="ml-1.5 sm:hidden">Confirm</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Menu Browser Modal */}
      <MenuBrowserModal
        open={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        orderId={localOrder.id}
        onItemAdded={handleItemAdded}
      />
    </>
  )
}