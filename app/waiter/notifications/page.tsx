import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getWaiterNotifications } from "@/app/actions/waiter"
import { WaiterNotificationsClient } from "@/components/dashboard/waiter-notifications-client"

export const dynamic = "force-dynamic"

export default async function WaiterNotificationsPage() {
  const profile = await getSessionProfile()

  if (!profile) redirect("/login")
  if (profile.role !== "waiter") redirect("/")

  const result = await getWaiterNotifications()

  return (
    <WaiterNotificationsClient
      profile={profile!}
      notifications={result.notifications ?? []}
      pendingOrders={result.pendingOrders ?? []}
    />
  )
}