import { NextResponse } from "next/server"
import { getSessionProfile } from "@/lib/auth"
import {
  getDashboardStats,
  getRecentOrders,
  getTopSellingItems,
} from "@/lib/data/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const profile = await getSessionProfile()
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [stats, orders, topItems] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(8),
    getTopSellingItems(5),
  ])

  return NextResponse.json({ stats, orders, topItems })
}
