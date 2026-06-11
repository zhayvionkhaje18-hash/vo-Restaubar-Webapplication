import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getWaiterNotifications } from "@/app/actions/waiter"
import { WaiterNotificationsClient } from "@/components/dashboard/waiter-notifications-client"
import type { Profile } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function WaiterNotificationsPage() {
  const session = await getSessionProfile()
  if (!session) {
    redirect("/login")
  }
  if (session.role !== "waiter") {
    redirect("/")
  }
  const profile = session as Profile

  const result = await getWaiterNotifications()

  return (
    <WaiterNotificationsClient
      profile={profile}
      notifications={result.notifications ?? []}
      pendingOrders={result.pendingOrders ?? []}
    />
  )
}