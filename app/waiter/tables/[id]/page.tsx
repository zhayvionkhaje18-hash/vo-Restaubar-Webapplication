import { redirect, notFound } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getWaiterTableDetail, getWaiterMenu } from "@/app/actions/waiter"
import { WaiterTableDetailClient } from "@/components/dashboard/waiter-table-detail-client"

export const dynamic = "force-dynamic"

export default async function WaiterTableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getSessionProfile()

  if (!profile) {
    redirect("/login")
    return
  }
  if (profile.role !== "waiter") {
    redirect("/")
    return
  }

  const [tableResult, menuData] = await Promise.all([
    getWaiterTableDetail(id),
    getWaiterMenu(),
  ])

  if (tableResult.error || !tableResult.table) notFound()

  return (
    <WaiterTableDetailClient
      profile={profile}
      table={tableResult.table}
      initialOrders={tableResult.orders}
      categories={menuData.categories}
      menuItems={menuData.menuItems}
    />
  )
}