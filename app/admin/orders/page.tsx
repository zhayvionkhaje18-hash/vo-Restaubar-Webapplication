import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getOrders } from "@/lib/data/admin"
import { OrdersManager } from "@/components/admin/orders-manager"

export const dynamic = "force-dynamic"

export default async function AdminOrdersPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login?next=/admin/orders")
  if (profile.role !== "admin") redirect("/")

  const orders = await getOrders({ limit: 200 })

  return <OrdersManager orders={orders} />
}
