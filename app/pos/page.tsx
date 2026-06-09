import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { PosDashboard } from "@/components/dashboard/pos-dashboard"

export default async function PosPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")
  if (profile.role !== "pos") redirect("/")

  return <PosDashboard profile={profile} />
}