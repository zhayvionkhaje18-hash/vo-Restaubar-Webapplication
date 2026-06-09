import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getRestaurantSettings } from "@/lib/data/admin"
import { SettingsManager } from "@/components/admin/settings-manager"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login?next=/admin/settings")
  if (profile.role !== "admin") redirect("/")

  const settings = await getRestaurantSettings()
  return <SettingsManager settings={settings} />
}
