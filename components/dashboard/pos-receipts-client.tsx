"use client"

import { useState } from "react"
import {
  Download,
  ExternalLink,
  Receipt,
  RefreshCw,
  Search,
} from "lucide-react"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import type { Profile, Receipt } from "@/lib/types"

const NAV_ITEMS: NavItem[] = [
  { href: "/pos", label: "POS Terminal", icon: "LayoutDashboard" },
  { href: "/pos/orders", label: "Orders", icon: "ShoppingCart" },
  { href: "/pos/receipts", label: "Receipts", icon: "Receipt" },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReceiptWithOrder = Receipt & { orders: any }

interface ReceiptDetail extends ReceiptWithOrder {
  order_items?: { name: string; quantity: number; unit_price: number }[]
}

export function PosReceiptsClient({
  profile,
  initialReceipts,
}: {
  profile: Profile
  initialReceipts: ReceiptWithOrder[]
}) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<ReceiptDetail | null>(null)

  const filtered = initialReceipts.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.receipt_number.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.orders?.tables?.label ?? "").toLowerCase().includes(q)
    )
  })

  const stats = {
    total: filtered.length,
    todayTotal: filtered
      .filter((r) => new Date(r.created_at).toDateString() === new Date().toDateString())
      .reduce((sum, r) => sum + Number(r.total), 0),
    revenue: filtered.reduce((sum, r) => sum + Number(r.total), 0),
  }

  return (
    <StaffShell profile={profile} items={NAV_ITEMS} title="Receipts">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Receipts</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Today's Revenue</div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.todayTotal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">All-Time Revenue</div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.revenue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by receipt #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-3.5" />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {/* Receipt list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <Receipt className="mx-auto mb-3 size-8 opacity-40" />
          <p>No receipts found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((receipt) => (
            <Card
              key={receipt.id}
              className="cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => setSelected(receipt)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <Receipt className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{receipt.receipt_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {receipt.orders?.tables?.label
                        ? `Table ${receipt.orders.tables.label}`
                        : "No table"}
                      {" • "}
                      {formatDateTime(receipt.created_at)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-primary">
                    {formatCurrency(Number(receipt.total))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Subtotal: {formatCurrency(Number(receipt.subtotal))} • Tax:{" "}
                    {formatCurrency(Number(receipt.tax))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Receipt Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receipt #{selected?.receipt_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.orders?.tables && (
                <div className="rounded-lg bg-muted/30 p-3">
                  <div className="text-sm text-muted-foreground">Table</div>
                  <div className="font-medium">{selected.orders.tables.label}</div>
                </div>
              )}

              <div className="space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(Number(selected.subtotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(Number(selected.tax))}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(Number(selected.total))}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Issued: {formatDateTime(selected.created_at)}
              </div>

              {selected.pdf_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  asChild
                >
                  <a href={selected.pdf_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                    <span className="ml-1.5">View PDF</span>
                  </a>
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected?.pdf_url && (
              <Button asChild>
                <a href={selected.pdf_url} download>
                  <Download className="size-3.5" />
                  <span className="ml-1.5">Download</span>
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffShell>
  )
}