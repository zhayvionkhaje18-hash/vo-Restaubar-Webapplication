import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getActivityLogs } from "@/lib/data/admin"
import { ActivityManager } from "@/components/admin/activity-manager"

export const dynamic = "force-dynamic"

export default async function AdminActivityPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login?next=/admin/activity")
  if (profile.role !== "admin") redirect("/")

  const logs = await getActivityLogs(500)
  return <ActivityManager logs={logs} />
}
