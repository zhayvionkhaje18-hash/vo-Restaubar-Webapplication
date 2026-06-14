"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertTriangle,
  Clock,
  Loader2,
  UtensilsCrossed,
  X,
  Info,
} from "lucide-react"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import type { OrderWithItems } from "@/lib/types"
import { cancelPosOrder } from "@/app/actions/pos"

interface CancelOrderModalProps {
  order: OrderWithItems | null
  open: boolean
  onClose: () => void
  onSuccess: (orderId: string) => void
}

export function CancelOrderModal({
  order,
  open,
  onClose,
  onSuccess,
}: CancelOrderModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    if (!order) return
    setError(null)
    startTransition(async () => {
      const result = await cancelPosOrder(order.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      onSuccess(order.id)
      onClose()
    })
  }

  if (!order) return null

  const itemCount = order.order_items?.length ?? 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/20">
              <AlertTriangle className="size-5 text-red-600 dark:text-red-500" />
            </div>
            <div className="flex-1">
              <DialogTitle>Cancel Order?</DialogTitle>
              <DialogDescription>
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary Card */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">Order #{order.order_number}</h3>
                  <Badge variant="outline" className="text-xs">
                    {order.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {order.tables?.label && (
                    <div className="flex items-center gap-1.5">
                      <UtensilsCrossed className="size-3.5" />
                      <span>
                        {order.tables.label}
                        {order.tables.zone ? ` (${order.tables.zone})` : ""}
                      </span>
                    </div>
                  )}
                  {order.customer_name && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">
                        {order.customer_name}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    <span>{formatDateTime(order.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {itemCount} Item{itemCount !== 1 ? "s" : ""}
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {order.order_items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="font-medium text-muted-foreground">
                        {item.quantity}×
                      </span>{" "}
                      {item.name}
                      {item.notes && (
                        <span className="block text-xs text-muted-foreground truncate">
                          {item.notes}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {formatCurrency(Number(item.unit_price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Total Amount</span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {formatCurrency(Number(order.total))}
              </span>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-sm">
              <strong className="font-semibold">Warning:</strong> Cancelling this
              order will permanently remove it from the system. This action cannot
              be reversed.
            </AlertDescription>
          </Alert>

          {/* Info box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 p-3">
            <div className="flex gap-2">
              <Info className="size-4 text-blue-600 dark:text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm text-blue-900 dark:text-blue-200">
                <p className="font-medium">What happens next:</p>
                <ul className="space-y-0.5 text-xs text-blue-800 dark:text-blue-300">
                  <li>• Order status will be marked as "Cancelled"</li>
                  <li>• Kitchen will be notified to stop preparation</li>
                  <li>• Table will remain available for new orders</li>
                  <li>• Order history will be preserved for records</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={pending}
            className="flex-1 sm:flex-none"
          >
            Keep Order
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
            className="flex-1 sm:flex-none"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <X className="mr-2 size-4" />
                Yes, Cancel Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
