"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Armchair,
  Edit3,
  Filter,
  Grid3x3,
  MoreVertical,
  Plus,
  QrCode,
  Search,
  Trash2,
  Users,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Profile, RestaurantTable, TableStatus } from "@/lib/types"
import {
  createTableAction,
  updateTableAction,
  deleteTableAction,
  updateTableStatusAction,
  assignTableToWaiterAction,
  generateTableQRAction,
} from "@/app/actions/admin"

type TableWithWaiter = RestaurantTable & { assigned_waiter_profile: Profile | null }

const STATUS_STYLES: Record<TableStatus, { label: string; className: string; dot: string; border: string }> = {
  available: {
    label: "Available",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    border: "border-emerald-500/30",
  },
  occupied: {
    label: "Occupied",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
    border: "border-rose-500/30",
  },
  reserved: {
    label: "Reserved",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    border: "border-amber-500/30",
  },
  cleaning: {
    label: "Cleaning",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
    border: "border-blue-500/30",
  },
}

export function TablesManager({
  tables,
  waiters,
}: {
  tables: TableWithWaiter[]
  waiters: Profile[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [zoneFilter, setZoneFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<TableStatus | "all">("all")
  const [editDialog, setEditDialog] = useState<{ open: boolean; table: TableWithWaiter | null }>({
    open: false,
    table: null,
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const zones = useMemo(() => {
    const set = new Set<string>()
    for (const t of tables) if (t.zone) set.add(t.zone)
    return Array.from(set).sort()
  }, [tables])

  const filtered = useMemo(() => {
    return tables.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (zoneFilter !== "all" && t.zone !== zoneFilter) return false
      if (!search) return true
      const q = search.toLowerCase()
      return t.label.toLowerCase().includes(q) || (t.zone ?? "").toLowerCase().includes(q)
    })
  }, [tables, search, statusFilter, zoneFilter])

  const stats = useMemo(() => {
    const total = tables.length
    const occupied = tables.filter((t) => t.status === "occupied").length
    const available = tables.filter((t) => t.status === "available").length
    const reserved = tables.filter((t) => t.status === "reserved").length
    const cleaning = tables.filter((t) => t.status === "cleaning").length
    const utilization = total > 0 ? Math.round((occupied / total) * 100) : 0
    return { total, occupied, available, reserved, cleaning, utilization }
  }, [tables])

  const onStatusChange = (id: string, status: TableStatus) => {
    startTransition(async () => {
      await updateTableStatusAction(id, status)
      router.refresh()
    })
  }

  const onAssignWaiter = (tableId: string, waiterId: string | null) => {
    startTransition(async () => {
      await assignTableToWaiterAction(tableId, waiterId)
      router.refresh()
    })
  }

  const onRegenerateQR = (tableId: string) => {
    startTransition(async () => {
      await generateTableQRAction(tableId)
      router.refresh()
    })
  }

  const onDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      await deleteTableAction(deleteId)
      setDeleteId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tables & Floor Plan"
        description={`${stats.total} tables • ${stats.occupied} occupied • ${stats.utilization}% utilization`}
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Tables" }]}
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/qr-codes">
                <QrCode className="mr-2 size-4" />
                All QR Codes
              </Link>
            </Button>
            <Button size="sm" onClick={() => setEditDialog({ open: true, table: null })}>
              <Plus className="mr-2 size-4" />
              New Table
            </Button>
          </>
        }
      />

      {/* Status summary */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(["available", "occupied", "reserved", "cleaning"] as TableStatus[]).map((status) => {
          const s = STATUS_STYLES[status]
          const value = stats[status as keyof typeof stats] as number
          const active = statusFilter === status
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(active ? "all" : status)}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                active ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${s.dot}`} />
                <span className="text-sm font-medium">{s.label}</span>
              </span>
              <span className="text-lg font-semibold tabular-nums">{value}</span>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by table label or zone..."
              className="h-9 pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={zoneFilter} onValueChange={(v) => v && setZoneFilter(v)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All zones</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || zoneFilter !== "all" || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("")
                setZoneFilter("all")
                setStatusFilter("all")
              }}
            >
              <Filter className="mr-1 size-3" />
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tables grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Grid3x3 className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium">No tables found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || zoneFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Start by adding your first table"}
            </p>
            {!search && zoneFilter === "all" && statusFilter === "all" && (
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setEditDialog({ open: true, table: null })}
              >
                <Plus className="mr-2 size-4" />
                Add Table
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              waiters={waiters}
              pending={pending}
              onEdit={() => setEditDialog({ open: true, table })}
              onDelete={() => setDeleteId(table.id)}
              onStatusChange={(s) => onStatusChange(table.id, s)}
              onAssignWaiter={(w) => onAssignWaiter(table.id, w)}
              onRegenerateQR={() => onRegenerateQR(table.id)}
            />
          ))}
        </div>
      )}

      {/* Edit/create dialog */}
      <TableFormDialog
        open={editDialog.open}
        table={editDialog.table}
        waiters={waiters}
        onClose={() => setEditDialog({ open: false, table: null })}
        onSaved={() => {
          setEditDialog({ open: false, table: null })
          router.refresh()
        }}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete table?</DialogTitle>
            <DialogDescription>
              This will also remove any QR codes linked to this table. Active orders on this table will lose their table reference.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              <Trash2 className="mr-2 size-3.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Table card
// ============================================================
function TableCard({
  table,
  waiters,
  pending,
  onEdit,
  onDelete,
  onStatusChange,
  onAssignWaiter,
  onRegenerateQR,
}: {
  table: TableWithWaiter
  waiters: Profile[]
  pending: boolean
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: TableStatus) => void
  onAssignWaiter: (waiterId: string | null) => void
  onRegenerateQR: () => void
}) {
  const s = STATUS_STYLES[table.status]
  return (
    <Card className={`overflow-hidden transition-all hover:shadow-sm ${s.border}`}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Armchair className="size-4" />
            </div>
            <div>
              <div className="text-base font-semibold leading-none">{table.label}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3" />
                {table.seats} {table.seats === 1 ? "seat" : "seats"}
                {table.zone && <span>• {table.zone}</span>}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button size="icon-xs" variant="ghost" />}
            >
              <MoreVertical className="size-3.5" />
              <span className="sr-only">Menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit3 className="size-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRegenerateQR} disabled={pending}>
                <QrCode className="size-3.5" />
                Regenerate QR
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Badge variant="outline" className={`mb-3 ${s.className}`}>
          <span className={`mr-1.5 size-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </Badge>

        {table.notes && (
          <p className="mb-3 line-clamp-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
            {table.notes}
          </p>
        )}

        <div className="space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={table.status}
              onValueChange={(v) => onStatusChange(v as TableStatus)}
              disabled={pending}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Assigned Waiter</Label>
            <Select
              value={table.assigned_waiter ?? "none"}
              onValueChange={(v) => onAssignWaiter(v === "none" ? null : v)}
              disabled={pending}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue>
                  {table.assigned_waiter
                    ? waiters.find((w) => w.id === table.assigned_waiter)?.full_name ?? "— Unassigned —"
                    : "— Unassigned —"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Unassigned —</SelectItem>
                {waiters.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.full_name ?? w.email ?? "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Table form dialog
// ============================================================
function TableFormDialog({
  open,
  table,
  waiters,
  onClose,
  onSaved,
}: {
  open: boolean
  table: TableWithWaiter | null
  waiters: Profile[]
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = table
        ? await updateTableAction(table.id, fd)
        : await createTableAction(fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{table ? "Edit Table" : "New Table"}</DialogTitle>
          <DialogDescription>
            {table
              ? "Update table details. The QR code remains valid."
              : "A QR code will be auto-generated for new tables."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                name="label"
                required
                defaultValue={table?.label ?? ""}
                placeholder="e.g. A-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seats">Seats *</Label>
              <Input
                id="seats"
                name="seats"
                type="number"
                min="1"
                required
                defaultValue={table?.seats ?? 2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zone">Zone</Label>
              <Input
                id="zone"
                name="zone"
                defaultValue={table?.zone ?? ""}
                placeholder="e.g. Indoor"
              />
            </div>
            {table && (
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={table.status}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="cleaning">Cleaning</option>
                </select>
              </div>
            )}
            {table && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="assigned_waiter">Assigned Waiter</Label>
                <select
                  id="assigned_waiter"
                  name="assigned_waiter"
                  defaultValue={table.assigned_waiter ?? ""}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">— Unassigned —</option>
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.full_name ?? w.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={table?.notes ?? ""}
                placeholder="e.g. Window seat, near stage"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : table ? "Save Changes" : "Create Table"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
