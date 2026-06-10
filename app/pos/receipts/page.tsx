import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PosReceiptsClient } from "@/components/dashboard/pos-receipts-client"

export default async function PosReceiptsPage() {
  const profile = await getSessionProfile()

  if (!profile) {
    redirect("/login")
    return
  }
  if (profile.role !== "pos") {
    redirect("/")
    return
  }

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

  // Ensure subtotal/tax default to 0 if null
  const sanitized = (receipts ?? []).map((r) => ({
    ...r,
    subtotal: r.subtotal ?? 0,
    tax: r.tax ?? 0,
  }))

  return <PosReceiptsClient profile={profile} initialReceipts={sanitized} />
}