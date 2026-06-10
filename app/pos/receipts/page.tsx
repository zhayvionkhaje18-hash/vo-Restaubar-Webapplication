import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PosReceiptsClient } from "@/components/dashboard/pos-receipts-client"

export default async function PosReceiptsPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")
  if (profile.role !== "pos") redirect("/")

  const supabase = await createClient()

  const { data: receipts } = await supabase
    .from("receipts")
    .select(
      `
      *,
      orders(
        order_number,
        total,
        subtotal,
        tax,
        created_at,
        tables(label, zone)
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(100)

  return <PosReceiptsClient profile={profile} initialReceipts={receipts ?? []} />
}