import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PosTablesClient } from "@/components/dashboard/pos-tables-client"

export const dynamic = "force-dynamic"

export default async function PosTablesPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")
  if (profile.role !== "pos") redirect("/")

  const supabase = await createClient()

  // Get all tables
  const { data: tables } = await supabase
    .from("tables")
    .select("*")
    .order("label")

  // Get all active sessions
  const { data: sessions } = await supabase
    .from("table_sessions")
    .select("id, table_id, customer_name, created_at, status")
    .eq("status", "active")

  return (
    <PosTablesClient
      profile={profile}
      tables={tables ?? []}
      sessions={sessions ?? []}
    />
  )
}
