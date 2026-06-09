import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getCategories, getMenuItems } from "@/lib/data/admin"
import { MenuManager } from "@/components/admin/menu-manager"

export const dynamic = "force-dynamic"

export default async function AdminMenuPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login?next=/admin/menu")
  if (profile.role !== "admin") redirect("/")

  const [categories, items] = await Promise.all([getCategories(), getMenuItems()])

  return <MenuManager categories={categories} items={items} />
}
