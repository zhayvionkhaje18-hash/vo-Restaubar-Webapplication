import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getWaiterOrders } from "@/app/actions/waiter"
import { WaiterOrdersClient } from "@/components/dashboard/waiter-orders-client"

export const dynamic = "force-dynamic"

export default async function WaiterOrdersPage() {
  const profile = await getSessionProfile()

  if (!profile) {
    redirect("/login")
    return
  }
  if (profile.role !== "waiter") {
    redirect("/")
    return
  }

  const { orders } = await getWaiterOrders()

  return <WaiterOrdersClient profile={profile} initialOrders={orders ?? []} />
}