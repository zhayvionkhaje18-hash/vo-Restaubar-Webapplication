import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PosOrdersClient } from "@/components/dashboard/pos-orders-client"
import { ErrorBoundary } from "@/components/ui/error-boundary"

export default async function PosOrdersPage() {
  const profile = await getSessionProfile()

  if (!profile) {
    redirect("/login")
    return // prevent TS from complaining
  }
  if (profile.role !== "pos") {
    redirect("/")
    return
  }

  const supabase = await createClient()

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items(*),
      tables(label, zone)
    `
    )
    .in("status", ["pending", "confirmed", "preparing", "ready", "served"])
    .order("created_at", { ascending: false })
    .limit(50)

  // Filter out any orders with null status (defensive)
  const safeOrders = (orders ?? []).filter((o) => o.status !== null)

  return (
    <ErrorBoundary>
      <PosOrdersClient profile={profile} initialOrders={safeOrders} />
    </ErrorBoundary>
  )
}