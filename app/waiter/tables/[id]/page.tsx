import { redirect, notFound } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getWaiterTableDetail } from "@/app/actions/waiter"
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

  const { table, orders, error } = await getWaiterTableDetail(id)
  if (error || !table) notFound()

  return <WaiterTableDetailClient profile={profile} table={table} initialOrders={orders} />
}