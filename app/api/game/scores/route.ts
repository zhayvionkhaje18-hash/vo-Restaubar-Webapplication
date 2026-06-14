import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const VALID_GAMES = new Set(["flappy_bird"])

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { game_type, score, customer_name, table_id, session_id } = body

    if (typeof score !== "number" || score < 0 || score > 99999) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 })
    }
    if (!game_type || !VALID_GAMES.has(game_type)) {
      return NextResponse.json({ error: "Unknown game" }, { status: 400 })
    }
    if (customer_name && typeof customer_name === "string" && customer_name.length > 60) {
      return NextResponse.json({ error: "Name too long" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("game_scores")
      .insert({
        game_type,
        score: Math.floor(score),
        customer_name: customer_name?.trim() || null,
        table_id: table_id || null,
        session_id: session_id || null,
      })
      .select("id, score, created_at")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ score: data })
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const game = url.searchParams.get("game") ?? "flappy_bird"
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 10)))
  const scope = url.searchParams.get("scope") ?? "all" // 'all' | 'table'
  const tableId = url.searchParams.get("table_id")

  if (!VALID_GAMES.has(game)) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 })
  }

  const supabase = await createClient()
  let query = supabase
    .from("game_scores")
    .select("id, score, customer_name, table_id, session_id, created_at, tables:table_id(label)")
    .eq("game_type", game)
    .order("score", { ascending: false })
    .limit(limit)

  if (scope === "table" && tableId) {
    query = query.eq("table_id", tableId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ scores: data ?? [] })
}
