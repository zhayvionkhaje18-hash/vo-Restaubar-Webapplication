import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSessionProfile } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const profile = await getSessionProfile()
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("table_id")
  if (!tableId) {
    return NextResponse.json({ error: "table_id required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("table_qr_codes")
    .select("*")
    .eq("table_id", tableId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ qr: data })
}
