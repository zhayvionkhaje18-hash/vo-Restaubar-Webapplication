"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  CreditCard,
  XCircle,
  Receipt,
  Clock,
  Lock,
  Unlock,
  ChevronRight,
  Search,
  Banknote,
  CreditCard as CardIcon,
  Smartphone,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import type { Profile } from "@/lib/types"
import { processTableSessionPayment, cancelTableSession } from "@/app/actions/table-sessions"

const NAV_ITEMS: NavItem[] = [
  { href: "/pos", label: "POS Terminal", icon: "LayoutDashboard" },
  { href: "/pos/orders", label: "Orders", icon: "ShoppingCart" },
  { href: "/pos/tables", label: "Tables", icon: "Utensils" },
  { href: "/pos/receipts", label: "Receipts", icon: "Receipt" },
]

interface TableRow {
  id: string
  label: string
  table_code: string
  seats: number
  zone: string | null
  status: "available" | "occupied" | "reserved" | "unavailable"
}

interface ActiveSession {
  id: string
  table_id: string
  customer_name: string
  created_at: string
  status: string
}

interface OrderRow {
  id: string
  order_number: number
  table_id: string
  session_id: string | null
  customer_name: string | null
  status: string
  payment_status: string
  subtotal: number
  tax: number
  total: number
  created_at: string
  order_items?: {
    id: string
    name: string
    unit_price: number
    quantity: number
  }[]
}

export function PosTablesClient({
  profile,
  tables,
  sessions,
}: {
  profile: Profile
  tables: TableRow[]
  sessions: ActiveSession[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [tableOrders, setTableOrders] = useState<OrderRow[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "gcash" | "maya">("cash")
  const [payAmountTendered, setPayAmountTendered] = useState("")
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  // Index sessions by table_id for quick lookup
  const sessionByTable = useMemo(() => {
    const map: Record<string, ActiveSession> = {}
    for (const s of sessions) map[s.table_id] = s
    return map
  }, [sessions])

  const filtered = tables.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.label.toLowerCase().includes(q) ||
      t.table_code.toLowerCase().includes(q) ||
      (t.zone ?? "").toLowerCase().includes(q)
    )
  })

  const counts = useMemo(() => {
    let occupied = 0
    let available = 0
    for (const t of tables) {
      if (sessionByTable[t.id]) occupied++
      else if (t.status === "available") available++
    }
    return { occupied, available, total: tables.length }
  }, [tables, sessionByTable])

  // When a table is selected, load its orders
  async function openTableAccount(tableId: string) {
    setSelectedTableId(tableId)
    setLoadingOrders(true)
    try {
      const res = await fetch(`/api/pos/table-orders?table_id=${tableId}`)
      const data = await res.json()
      setTableOrders(data.orders ?? [])
    } catch (err) {
      console.error("Failed to load table orders", err)
    } finally {
      setLoadingOrders(false)
    }
  }

  function closeTableAccount() {
    setSelectedTableId(null)
    setTableOrders([])
    setShowPayDialog(false)
    setPayAmountTendered("")
  }

  const selectedTable = tables.find((t) => t.id === selectedTableId)
  const selectedSession = selectedTableId ? sessionByTable[selectedTableId] : null
  const unpaidOrders = tableOrders.filter((o) => o.payment_status !== "paid")
  const grandTotal = unpaidOrders.reduce((s, o) => s + Number(o.total), 0)
  const grandSubtotal = unpaidOrders.reduce((s, o) => s + Number(o.subtotal), 0)
  const grandTax = unpaidOrders.reduce((s, o) => s + Number(o.tax), 0)
  const grandItemCount = unpaidOrders.reduce(
    (s, o) => s + (o.order_items?.reduce((c, i) => c + i.quantity, 0) ?? 0),
    0
  )

  const changeDue =
    payMethod === "cash" && payAmountTendered
      ? Math.max(0, parseFloat(payAmountTendered) - grandTotal)
      : null
  const insufficient =
    payMethod === "cash" && payAmountTendered
      ? parseFloat(payAmountTendered) < grandTotal
      : false

  async function handleConfirmPayment() {
    if (!selectedSession) return
    startTransition(async () => {
      const result = await processTableSessionPayment({
        session_id: selectedSession.id,
        method: payMethod,
        amount_tendered: payMethod === "cash" ? parseFloat(payAmountTendered) : null,
      })
      if (result?.error) {
        alert(result.error)
        return
      }
      // Refresh
      closeTableAccount()
      router.refresh()
    })
  }

  async function handleConfirmCancel() {
    if (!selectedSession) return
    startTransition(async () => {
      const result = await cancelTableSession({
        session_id: selectedSession.id,
        reason: "Cancelled by staff",
      })
      if (result?.error) {
        alert(result.error)
        return
      }
      setShowCancelDialog(false)
      closeTableAccount()
      router.refresh()
    })
  }

  return (
    <StaffShell profile={profile} items={NAV_ITEMS} title="Tables">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by table label, code, or zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4 text-muted-foreground" /> Total Tables
          </span>
          <span className="text-xl font-black tabular-nums">{counts.total}</span>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Lock className="size-4 text-amber-500" /> Occupied
          </span>
          <span className="text-xl font-black tabular-nums text-amber-600">{counts.occupied}</span>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Unlock className="size-4 text-emerald-500" /> Available
          </span>
          <span className="text-xl font-black tabular-nums text-emerald-600">
            {counts.available}
          </span>
        </div>
      </div>

      {/* Tables grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          No tables match your search.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((table) => {
            const session = sessionByTable[table.id]
            const isOccupied = !!session
            return (
              <button
                key={table.id}
                onClick={() => isOccupied && openTableAccount(table.id)}
                disabled={!isOccupied}
                className={`text-left rounded-xl border bg-card p-4 transition-all ${
                  isOccupied
                    ? "hover:border-primary hover:shadow-md cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {table.zone ?? "Restaurant"}
                    </p>
                    <p className="text-2xl font-black text-primary mt-0.5">
                      {table.label}
                    </p>
                  </div>
                  {isOccupied ? (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      <Lock className="size-3 mr-1" /> Occupied
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <Unlock className="size-3 mr-1" /> Available
                    </Badge>
                  )}
                </div>

                {session ? (
                  <>
                    <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2.5 mb-2">
                      <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        Host
                      </p>
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-300 truncate">
                        {session.customer_name}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {formatDateTime(session.created_at)}
                      </span>
                      <ChevronRight className="size-4" />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Tap to view when occupied
                  </p>
                )}

                <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>{table.seats} seats</span>
                  <span className="font-mono">#{table.table_code}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Table Account Dashboard Dialog */}
      <Dialog
        open={!!selectedTableId}
        onOpenChange={(o) => !o && closeTableAccount()}
      >
        <DialogContent className="w-full sm:max-w-lg md:max-w-xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
          {selectedTable && (
            <>
              {/* Header band */}
              <div className="px-6 py-4 border-b bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Table Account
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-primary mt-0.5">
                      {selectedTable.label}
                    </p>
                    {selectedTable.zone && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedTable.zone} · {selectedTable.seats} seats
                      </p>
                    )}
                  </div>
                  {selectedSession && (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      <Lock className="size-3 mr-1" /> Active
                    </Badge>
                  )}
                </div>
                {selectedSession && (
                  <div className="mt-3 rounded-lg bg-white/60 dark:bg-black/20 p-2.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Session Host
                    </p>
                    <p className="text-sm font-bold truncate">
                      {selectedSession.customer_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Started {formatDateTime(selectedSession.created_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-6 py-5 space-y-5">
                  {loadingOrders ? (
                    <div className="py-12 flex flex-col items-center text-muted-foreground">
                      <Loader2 className="size-6 animate-spin mb-2" />
                      <p className="text-sm">Loading orders...</p>
                    </div>
                  ) : unpaidOrders.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
                      <Receipt className="size-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">No unpaid orders</p>
                      <p className="text-xs mt-1">All orders for this table are paid.</p>
                    </div>
                  ) : (
                    <>
                      {/* Orders list */}
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Open Orders
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {unpaidOrders.length} order
                            {unpaidOrders.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {unpaidOrders.map((order) => (
                            <div
                              key={order.id}
                              className="rounded-lg border bg-card p-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-bold tabular-nums">
                                  #{order.order_number}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {order.status}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                {(order.order_items ?? []).map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-muted-foreground">
                                      {item.quantity}× {item.name}
                                    </span>
                                    <span className="tabular-nums">
                                      {formatCurrency(
                                        Number(item.unit_price) * item.quantity
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="border-t mt-2 pt-2 flex justify-between text-xs">
                                <span className="text-muted-foreground">Order Total</span>
                                <span className="font-bold tabular-nums">
                                  {formatCurrency(Number(order.total))}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Grand totals */}
                      <section className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {unpaidOrders.length} order{unpaidOrders.length !== 1 ? "s" : ""} ·{" "}
                            {grandItemCount} item{grandItemCount !== 1 ? "s" : ""}
                          </span>
                          <span className="font-semibold tabular-nums">
                            {formatCurrency(grandSubtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="tabular-nums font-medium">
                            {formatCurrency(grandTax)}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline border-t pt-2 mt-1">
                          <span className="text-sm font-semibold">Amount Due</span>
                          <span className="text-2xl font-black text-primary tabular-nums">
                            {formatCurrency(grandTotal)}
                          </span>
                        </div>
                      </section>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t px-6 py-4 shrink-0 bg-muted/10">
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelDialog(true)}
                      disabled={pending}
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="size-3.5" />
                      <span className="ml-1.5">Cancel Session</span>
                    </Button>
                  </div>
                  <div className="flex gap-2 sm:ml-auto">
                    <Button variant="ghost" onClick={closeTableAccount} size="sm">
                      Close
                    </Button>
                    {unpaidOrders.length > 0 && (
                      <Button
                        onClick={() => setShowPayDialog(true)}
                        disabled={pending}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CreditCard className="size-3.5" />
                        <span className="ml-1.5">Process Payment</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Payment Dialog */}
      <Dialog
        open={showPayDialog}
        onOpenChange={(o) => setShowPayDialog(o)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-4" />
              Process Payment
            </DialogTitle>
            <DialogDescription>
              {selectedTable?.label} ·{" "}
              {selectedSession && (
                <span className="font-medium text-foreground">
                  {selectedSession.customer_name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount due */}
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800/40 p-4 text-center">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Amount Due
              </p>
              <p className="text-4xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
                {formatCurrency(grandTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {unpaidOrders.length} order{unpaidOrders.length !== 1 ? "s" : ""} ·{" "}
                {grandItemCount} item{grandItemCount !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Method */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as typeof payMethod)}>
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
                      <CardIcon className="size-4" /> Card
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

            {/* Cash tendered */}
            {payMethod === "cash" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount Tendered</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={payAmountTendered}
                  onChange={(e) => setPayAmountTendered(e.target.value)}
                  className="text-lg tabular-nums"
                  autoFocus
                />
                {changeDue !== null && changeDue > 0 && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/20">
                    <span className="font-medium">Change:</span>{" "}
                    <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(changeDue)}
                    </span>
                  </div>
                )}
                {insufficient && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/20">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>
                      Insufficient amount. Need {formatCurrency(grandTotal)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* What will happen on confirm */}
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1.5 text-muted-foreground">
              <p className="font-semibold text-foreground text-sm">After confirmation:</p>
              <ul className="space-y-0.5 pl-4 list-disc">
                <li>All open orders will be marked as paid</li>
                <li>Table session will be archived and closed</li>
                <li>Table will return to Available for new customers</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowPayDialog(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={
                pending ||
                (payMethod === "cash" && (!payAmountTendered || insufficient))
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              <span className="ml-1.5">Confirm Payment</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Session Dialog */}
      <Dialog
        open={showCancelDialog}
        onOpenChange={(o) => setShowCancelDialog(o)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <XCircle className="size-5" />
              Cancel Table Session
            </DialogTitle>
            <DialogDescription>
              {selectedTable?.label} ·{" "}
              {selectedSession && (
                <span className="font-medium text-foreground">
                  {selectedSession.customer_name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border-2 border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-800/40 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    This will cancel the active session
                  </p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">
                    The session will be archived and the table will return to Available.
                    All open orders will be marked as cancelled.
                  </p>
                </div>
              </div>
            </div>

            {unpaidOrders.length > 0 && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1.5 text-muted-foreground">
                <p className="font-semibold text-foreground text-sm">
                  {unpaidOrders.length} open order{unpaidOrders.length !== 1 ? "s" : ""} will be cancelled:
                </p>
                <ul className="space-y-0.5 pl-4 list-disc">
                  {unpaidOrders.map((o) => (
                    <li key={o.id}>
                      Order #{o.order_number} · {formatCurrency(Number(o.total))}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-md border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 p-3 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-semibold">No payment will be recorded.</p>
              <p className="mt-1 text-amber-700/80 dark:text-amber-400/70">
                Use this only for walk-outs, system errors, or staff-initiated closures. For
                paid bills, use <strong>Process Payment</strong> instead.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={pending}
            >
              Keep Session Active
            </Button>
            <Button
              onClick={handleConfirmCancel}
              disabled={pending}
              variant="destructive"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              <span className="ml-1.5">Cancel Session</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffShell>
  )
}
