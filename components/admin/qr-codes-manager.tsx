"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Download,
  Printer,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { RestaurantTable } from "@/lib/types"
import { generateTableQRAction } from "@/app/actions/admin"
import { RESTAURANT_NAME, RESTAURANT_TAGLINE } from "@/lib/constants"

type TableWithWaiter = RestaurantTable & { assigned_waiter_profile: { full_name: string | null; email: string | null } | null }

export function QRCodesManager({ tables }: { tables: TableWithWaiter[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const filtered = useMemo(() => {
    if (!search) return tables
    const q = search.toLowerCase()
    return tables.filter(
      (t) => t.label.toLowerCase().includes(q) || (t.zone ?? "").toLowerCase().includes(q),
    )
  }, [tables, search])

  const onPrint = () => {
    window.print()
  }

  const onRegenerateAll = () => {
    if (!confirm("Regenerate QR for ALL tables? Old codes will stop working.")) return
    startTransition(async () => {
      for (const t of tables) {
        await generateTableQRAction(t.id)
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR Codes"
        description="Print-ready QR codes for every table. Customers scan to open the menu and place orders."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "QR Codes" }]}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={onRegenerateAll} disabled={pending}>
              <RefreshCw className={`mr-2 size-4 ${pending ? "animate-spin" : ""}`} />
              Regenerate All
            </Button>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="mr-2 size-4" />
              Print All
            </Button>
          </>
        }
      />

      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              className="h-9 pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filtered.length} of {tables.length} tables
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="print:hidden">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <QrCode className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium">No tables to show</p>
            <p className="mt-1 text-xs text-muted-foreground">Create tables first to generate QR codes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-3">
          {filtered.map((table) => (
            <QRCard
              key={table.id}
              table={table}
              origin={origin}
              onRegenerate={() => {
                startTransition(async () => {
                  await generateTableQRAction(table.id)
                  router.refresh()
                })
              }}
              pending={pending}
            />
          ))}
        </div>
      )}

    </div>
  )
}

// ============================================================
// QR Card (also serves as the printable label)
// ============================================================
function QRCard({
  table,
  origin,
  onRegenerate,
  pending,
}: {
  table: TableWithWaiter
  origin: string
  onRegenerate: () => void
  pending: boolean
}) {
  const [qrUrl, setQrUrl] = useState<string>("")
  const [token, setToken] = useState<string>("")

  useEffect(() => {
    // Fetch the active QR for this table
    let cancelled = false
    async function load() {
      const res = await fetch(`/api/admin/table-qr?table_id=${table.id}`)
      if (!res.ok) return
      const data = await res.json()
      if (cancelled) return
      if (data.qr?.token) {
        setToken(data.qr.token)
        const target = `${origin}/order?t=${data.qr.token}`
        // Use a free QR generator (no key needed)
        const qr = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(target)}`
        setQrUrl(qr)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [table.id, origin])

  return (
    <Card className="overflow-hidden print:break-inside-avoid print:shadow-none print:border-2">
      <CardContent className="space-y-3 p-5 text-center">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {RESTAURANT_NAME}
          </div>
          <div className="text-[0.65rem] text-muted-foreground">{RESTAURANT_TAGLINE}</div>
        </div>

        <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-lg border bg-white p-2 print:border-2">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt={`QR for ${table.label}`} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ScanLine className="size-12 opacity-40" />
            </div>
          )}
        </div>

        <div>
          <div className="text-2xl font-bold tracking-tight">{table.label}</div>
          <div className="text-xs text-muted-foreground">
            {table.seats} {table.seats === 1 ? "seat" : "seats"}
            {table.zone ? ` • ${table.zone}` : ""}
          </div>
        </div>

        {/* Table Code */}
        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-2">
          <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Table Code</p>
          <p className="text-2xl font-black tracking-widest text-primary">{(table as any).table_code || "----"}</p>
        </div>

        <div className="flex flex-col gap-1 text-[0.65rem] text-muted-foreground print:hidden">
          <span>Scan to view menu & order</span>
          {token && (
            <code className="mx-auto max-w-[180px] truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6rem]">
              {token}
            </code>
          )}
        </div>

        <div className="flex gap-1.5 pt-1 print:hidden">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => {
              if (qrUrl) {
                const a = document.createElement("a")
                a.href = qrUrl
                a.download = `qr-${table.label}.png`
                a.target = "_blank"
                a.click()
              }
            }}
            disabled={!qrUrl}
          >
            <Download className="mr-1 size-3" />
            PNG
          </Button>
          <Button size="sm" variant="outline" onClick={onRegenerate} disabled={pending}>
            <RefreshCw className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
