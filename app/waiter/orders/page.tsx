import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getWaiterOrders } from "@/app/actions/waiter"
import { WaiterOrdersClient } from "@/components/dashboard/waiter-orders-client"
import type { Profile } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function WaiterOrdersPage() {
  const session = await getSessionProfile()
  if (!session) {
    redirect("/login")
  }
  if (session.role !== "waiter") {
    redirect("/")
  }
  const profile = session as Profile

  const { orders } = await getWaiterOrders()

  return <WaiterOrdersClient profile={profile} initialOrders={orders ?? []} />
}