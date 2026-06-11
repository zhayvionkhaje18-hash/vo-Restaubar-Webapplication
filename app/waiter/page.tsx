import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { WaiterDashboard } from "@/components/dashboard/waiter-dashboard"

export const dynamic = "force-dynamic"

export default async function WaiterPage() {
  const profile = await getSessionProfile()

  if (!profile) {
    redirect("/login")
  }
  if (profile.role !== "waiter") {
    redirect("/")
  }

  return <WaiterDashboard profile={profile} />
}