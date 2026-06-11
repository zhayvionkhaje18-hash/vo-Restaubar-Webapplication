import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { WaiterDashboard } from "@/components/dashboard/waiter-dashboard"
import type { Profile } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function WaiterPage() {
  const session = await getSessionProfile()
  if (!session) {
    redirect("/login")
  }
  if (session.role !== "waiter") {
    redirect("/")
  }
  const profile = session as Profile

  return <WaiterDashboard profile={profile} />
}