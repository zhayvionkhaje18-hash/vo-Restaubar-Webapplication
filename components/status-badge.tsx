import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { OrderStatus, PaymentStatus, TableStatus, ReservationStatus } from "@/lib/types"

const orderStyles: Record<OrderStatus, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  confirmed: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/25",
  preparing: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  ready: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  served: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
  cancelled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
}

const paymentStyles: Record<PaymentStatus, string> = {
  unpaid: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
  pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
  refunded: "bg-muted text-muted-foreground border-border",
}

const tableStyles: Record<TableStatus, string> = {
  available: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
  occupied: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
  reserved: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  cleaning: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
}

const reservationStyles: Record<ReservationStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
  seated: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  completed: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:border-zinc-500/25",
  cancelled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
  no_show: "bg-muted text-muted-foreground border-border",
}

function label(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return <Badge variant="outline" className={cn("font-medium capitalize", orderStyles[status], className)}>{label(status)}</Badge>
}

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return <Badge variant="outline" className={cn("font-medium capitalize", paymentStyles[status], className)}>{label(status)}</Badge>
}

export function TableStatusBadge({ status, className }: { status: TableStatus; className?: string }) {
  return <Badge variant="outline" className={cn("font-medium capitalize", tableStyles[status], className)}>{label(status)}</Badge>
}

export function ReservationStatusBadge({ status, className }: { status: ReservationStatus; className?: string }) {
  return <Badge variant="outline" className={cn("font-medium capitalize", reservationStyles[status], className)}>{label(status)}</Badge>
}
