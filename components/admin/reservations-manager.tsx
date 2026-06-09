"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Filter,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  XCircle,
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
import { formatDateTime, relativeTime } from "@/lib/constants"
import type { RestaurantTable, Reservation, ReservationStatus } from "@/lib/types"
import {
  createReservationAction,
  updateReservationStatusAction,
  deleteReservationAction,
} from "@/app/actions/admin"

type ReservationWithTable = Reservation & { tables: RestaurantTable | null }

const STATUS_STYLES: Record<ReservationStatus, { label: string; className: string; dot: string }> = {
  pending:   { label: "Pending",   className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",   dot: "bg-amber-500" },
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  seated:    { label: "Seated",    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",       dot: "bg-blue-500" },
  completed: { label: "Completed", className: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",         dot: "bg-zinc-500" },
  cancelled: { label: "Cancelled", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",         dot: "bg-rose-500" },
  no_show:   { label: "No Show",   className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",         dot: "bg-rose-500" },
}

export function ReservationsManager({
  reservations,
  tables,
}: {
  reservations: ReservationWithTable[]
  tables: RestaurantTable[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all")
  const [newDialog, setNewDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        r.customer_name.toLowerCase().includes(q) ||
        (r.customer_phone ?? "").toLowerCase().includes(q) ||
        (r.customer_email ?? "").toLowerCase().includes(q)
      )
    })
  }, [reservations, search, statusFilter])

  const grouped = useMemo(() => {
    const today: ReservationWithTable[] = []
    const upcoming: ReservationWithTable[] = []
    const past: ReservationWithTable[] = []
    const now = Date.now()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    for (const r of filtered) {
      const ts = new Date(r.reserved_at).getTime()
      if (ts >= todayStart.getTime() && ts <= todayEnd.getTime()) {
        today.push(r)
      } else if (ts > now) {
        upcoming.push(r)
      } else {
        past.push(r)
      }
    }
    return { today, upcoming, past }
  }, [filtered])

  const stats = useMemo(() => {
    return {
      total: reservations.length,
      today: reservations.filter((r) => {
        const t = new Date(r.reserved_at)
        const now = new Date()
        return (
          t.getFullYear() === now.getFullYear() &&
          t.getMonth() === now.getMonth() &&
          t.getDate() === now.getDate()
        )
      }).length,
      pending: reservations.filter((r) => r.status === "pending").length,
      confirmed: reservations.filter((r) => r.status === "confirmed").length,
    }
  }, [reservations])

  const onStatusChange = (id: string, status: ReservationStatus) => {
    startTransition(async () => {
      await updateReservationStatusAction(id, status)
      router.refresh()
    })
  }

  const onDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      await deleteReservationAction(deleteId)
      setDeleteId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations"
        description={`${stats.total} total • ${stats.today} today • ${stats.pending} pending confirmation`}
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Reservations" }]}
        actions={
          <Button size="sm" onClick={() => setNewDialog(true)}>
            <Plus className="mr-2 size-4" />
            New Reservation
          </Button>
        }
      />

      {/* Status summary */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(["pending", "confirmed", "seated", "no_show"] as ReservationStatus[]).map((status) => {
          const s = STATUS_STYLES[status]
          const value = reservations.filter((r) => r.status === status).length
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
              placeholder="Search by name, phone, or email..."
              className="h-9 pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {(search || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("")
                setStatusFilter("all")
              }}
            >
              <Filter className="mr-1 size-3" />
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reservations groups */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarClock className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium">No reservations found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first booking"}
            </p>
            {!search && statusFilter === "all" && (
              <Button size="sm" className="mt-4" onClick={() => setNewDialog(true)}>
                <Plus className="mr-2 size-4" />
                New Reservation
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.today.length > 0 && (
            <ReservationGroup
              title="Today"
              icon={Clock}
              reservations={grouped.today}
              onStatus={onStatusChange}
              onDelete={setDeleteId}
              pending={pending}
            />
          )}
          {grouped.upcoming.length > 0 && (
            <ReservationGroup
              title="Upcoming"
              icon={CalendarClock}
              reservations={grouped.upcoming}
              onStatus={onStatusChange}
              onDelete={setDeleteId}
              pending={pending}
            />
          )}
          {grouped.past.length > 0 && (
            <ReservationGroup
              title="Past"
              icon={CheckCircle2}
              reservations={grouped.past}
              onStatus={onStatusChange}
              onDelete={setDeleteId}
              pending={pending}
            />
          )}
        </div>
      )}

      {/* New reservation dialog */}
      <NewReservationDialog
        open={newDialog}
        tables={tables}
        onClose={() => setNewDialog(false)}
        onSaved={() => {
          setNewDialog(false)
          router.refresh()
        }}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel reservation?</DialogTitle>
            <DialogDescription>
              The reservation record will be permanently removed. The customer will need to be notified separately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Keep
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
// Group section
// ============================================================
function ReservationGroup({
  title,
  icon: Icon,
  reservations,
  onStatus,
  onDelete,
  pending,
}: {
  title: string
  icon: typeof CalendarClock
  reservations: ReservationWithTable[]
  onStatus: (id: string, status: ReservationStatus) => void
  onDelete: (id: string) => void
  pending: boolean
}) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="size-4" />
        {title} <span className="font-normal">({reservations.length})</span>
      </h3>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {reservations.map((r) => {
              const s = STATUS_STYLES[r.status]
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{r.customer_name}</span>
                      <Badge variant="outline" className={s.className}>
                        <span className={`mr-1.5 size-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        • {relativeTime(r.reserved_at)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDateTime(r.reserved_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {r.party_size} {r.party_size === 1 ? "guest" : "guests"}
                      </span>
                      {r.tables && (
                        <span className="flex items-center gap-1">
                          Table: <span className="font-medium text-foreground">{r.tables.label}</span>
                        </span>
                      )}
                      {r.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" />
                          {r.customer_phone}
                        </span>
                      )}
                      {r.customer_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" />
                          {r.customer_email}
                        </span>
                      )}
                    </div>
                    {r.notes && (
                      <p className="mt-1 line-clamp-1 text-xs italic text-muted-foreground">"{r.notes}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <Select
                      value={r.status}
                      onValueChange={(v) => onStatus(r.id, v as ReservationStatus)}
                      disabled={pending}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirm</SelectItem>
                        <SelectItem value="seated">Seated</SelectItem>
                        <SelectItem value="completed">Complete</SelectItem>
                        <SelectItem value="cancelled">Cancel</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button size="icon-sm" variant="ghost" />}
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(r.id)}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}

// ============================================================
// New reservation dialog
// ============================================================
function NewReservationDialog({
  open,
  tables,
  onClose,
  onSaved,
}: {
  open: boolean
  tables: RestaurantTable[]
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(19, 0, 0, 0)
  const defaultDateTime = tomorrow.toISOString().slice(0, 16)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createReservationAction(fd)
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
          <DialogTitle>New Reservation</DialogTitle>
          <DialogDescription>
            Create a new booking. The customer will be added to today's queue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="customer_name">Customer name *</Label>
              <Input id="customer_name" name="customer_name" required placeholder="e.g. Juan dela Cruz" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer_phone">Phone</Label>
              <Input id="customer_phone" name="customer_phone" type="tel" placeholder="0917 000 0000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer_email">Email</Label>
              <Input id="customer_email" name="customer_email" type="email" placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_size">Party size *</Label>
              <Input id="party_size" name="party_size" type="number" min="1" defaultValue="2" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reserved_at">Date & time *</Label>
              <Input
                id="reserved_at"
                name="reserved_at"
                type="datetime-local"
                defaultValue={defaultDateTime}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="table_id">Table (optional)</Label>
              <select
                id="table_id"
                name="table_id"
                defaultValue=""
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="">— Unassigned —</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.seats} seats{t.zone ? `, ${t.zone}` : ""})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} placeholder="Birthday, dietary needs, etc." />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <XCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Reservation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
