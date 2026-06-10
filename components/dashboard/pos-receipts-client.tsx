"use client"

import { useState, useTransition, useRef } from "react"
import html2canvas from "html2canvas"
import {
  Download,
  ExternalLink,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Loader2,
  FileImage,
} from "lucide-react"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import type { Profile } from "@/lib/types"
import { getReceiptDetails } from "@/app/actions/pos"
import { ReceiptPrint, type ReceiptDetails } from "@/components/receipt/receipt-print"

const NAV_ITEMS: NavItem[] = [
  { href: "/pos", label: "POS Terminal", icon: "LayoutDashboard" },
  { href: "/pos/orders", label: "Orders", icon: "ShoppingCart" },
  { href: "/pos/receipts", label: "Receipts", icon: "Receipt" },
]

type ReceiptWithOrder = {
  id: string
  receipt_number: string
  pdf_url: string | null
  image_url: string | null
  total: number
  subtotal: number
  tax: number
  created_at: string
  orders: {
    order_number: number
    total: number
    subtotal: number
    tax: number
    created_at: string
    tables?: { label: string | null; zone: string | null } | null
  } | null
}

export function PosReceiptsClient({
  profile,
  initialReceipts,
}: {
  profile: Profile
  initialReceipts: ReceiptWithOrder[]
}) {
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<ReceiptWithOrder | null>(null)
  const [fullReceipt, setFullReceipt] = useState<ReceiptDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [downloading, setDownloading] = useState(false)
  // Ref points directly to the ReceiptPrint div so html2canvas captures the exact content
  const receiptPrintRef = useRef<HTMLDivElement>(null)

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

  const handleViewReceipt = (receipt: ReceiptWithOrder) => {
    setSelected(receipt)
    setFullReceipt(null)
    setLoadingDetails(true)

    startTransition(async () => {
      const result = await getReceiptDetails(receipt.id)
      setLoadingDetails(false)
      if (result?.error) {
        alert("Failed to load receipt: " + result.error)
        return
      }
      if (result?.receipt) {
        setFullReceipt(result.receipt as ReceiptDetails)
      }
    })
  }

  const handlePrint = () => {
    if (!receiptPrintRef.current) return
    // Temporarily remove background for print-friendly output
    const el = receiptPrintRef.current
    const origBg = el.style.backgroundColor
    el.style.backgroundColor = "#ffffff"
    window.print()
    // Restore after print dialog closes
    el.style.backgroundColor = origBg
  }

  const handleDownloadImage = async () => {
    if (!receiptPrintRef.current) {
      alert("Receipt not ready yet. Please wait for it to load.")
      return
    }
    setDownloading(true)
    try {
      const canvas = await html2canvas(receiptPrintRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        // Ensure the full receipt height is captured
        height: receiptPrintRef.current.scrollHeight + 4,
        width: receiptPrintRef.current.scrollWidth + 4,
      })
      const link = document.createElement("a")
      link.download = `${fullReceipt?.receipt_number ?? "receipt"}-${Date.now()}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (err) {
      console.error("Failed to generate image:", err)
      alert("Failed to generate image. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      {/* Print stylesheet: when printing, show only the receipt content, strip all UI */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #receipt-print-root { display: block !important; }
          #receipt-print-root * { visibility: visible; }
          #receipt-print-root {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
          }
          @page {
            margin: 0;
            size: 80mm 200mm; /* width x height — height auto-adjusts per content */
          }
        }
      `}</style>

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
              <div className="text-sm text-muted-foreground">Today&apos;s Revenue</div>
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
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
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
                onClick={() => handleViewReceipt(receipt)}
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
      </StaffShell>

      {/* Receipt Preview Dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null)
            setFullReceipt(null)
          }
        }}
      >
        <DialogContent className="max-w-lg w-full overflow-y-auto max-h-[90vh]">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base">
              Receipt #{selected?.receipt_number}
            </DialogTitle>
            {selected && (
              <div className="text-sm text-muted-foreground">
                {selected.orders?.tables?.label
                  ? `Table ${selected.orders.tables.label}`
                  : "Walk-in"}
                {" • "}
                {formatDateTime(selected.created_at)}
              </div>
            )}
          </DialogHeader>

          {/* Receipt Preview — ref goes on the actual ReceiptPrint div */}
          <div
            id="receipt-print-root"
            className="flex justify-center bg-muted/20 rounded-lg p-4 overflow-x-auto"
          >
            {loadingDetails ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-sm">Loading receipt...</span>
              </div>
            ) : fullReceipt ? (
              <div ref={receiptPrintRef}>
                <ReceiptPrint receipt={fullReceipt} />
              </div>
            ) : (
              <div className="py-8 text-sm text-muted-foreground">
                Unable to load receipt details.
              </div>
            )}
          </div>

          {/* Summary */}
          {selected && (
            <div className="border rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(Number(selected.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(Number(selected.tax))}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1.5">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(Number(selected.total))}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:gap-0">
            {/* Print */}
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!fullReceipt}
            >
              <Printer className="size-3.5" />
              <span className="ml-1.5">Print</span>
            </Button>

            {/* Download Image */}
            <Button
              variant="outline"
              onClick={handleDownloadImage}
              disabled={!fullReceipt || downloading}
            >
              {downloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileImage className="size-3.5" />
              )}
              <span className="ml-1.5">{downloading ? "Generating..." : "Download Image"}</span>
            </Button>

            {/* View PDF */}
            {selected?.pdf_url && (
              <Button variant="outline" asChild>
                <a href={selected.pdf_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  <span className="ml-1.5">View PDF</span>
                </a>
              </Button>
            )}

            {/* Download PDF */}
            {selected?.pdf_url && (
              <Button asChild>
                <a href={selected.pdf_url} download>
                  <Download className="size-3.5" />
                  <span className="ml-1.5">Download PDF</span>
                </a>
              </Button>
            )}

            {/* Close */}
            <Button variant="ghost" onClick={() => { setSelected(null); setFullReceipt(null) }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}