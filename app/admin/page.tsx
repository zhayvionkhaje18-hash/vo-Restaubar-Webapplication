import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { AdminDashboardClient } from "@/components/dashboard/admin-dashboard-client"
import {
  getDashboardStats,
  getRecentOrders,
  getTopSellingItems,
} from "@/lib/data/admin"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")
  if (profile.role !== "admin") redirect("/")

  const [stats, orders, topItems] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(8),
    getTopSellingItems(5),
  ])

  return (
    <AdminDashboardClient
      profile={profile}
      initialStats={stats}
      initialOrders={orders}
      topItems={topItems}
    />
  )
}
