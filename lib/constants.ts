export const TAX_RATE = 0.12 // 12% VAT
export const CURRENCY = "₱"
export const RESTAURANT_NAME = "Lumière"
export const RESTAURANT_TAGLINE = "Restaurant & Bar"

export function formatCurrency(amount: number): string {
  return `${CURRENCY}${Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true })
}

export function relativeTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  pos: "Cashier / POS",
  waiter: "Waiter",
}

export const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  pos: "/pos",
  waiter: "/waiter",
}

export function computeTotals(subtotal: number) {
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 }
}
