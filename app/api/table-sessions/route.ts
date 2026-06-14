import { NextResponse } from "next/server"
import {
  createTableSession,
  joinTableSession,
} from "@/app/actions/table-sessions"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "create") {
      const result = await createTableSession({
        table_id: body.table_id,
        customer_name: body.customer_name,
        access_code: body.access_code,
      })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ session: result.session })
    }

    if (action === "join") {
      const result = await joinTableSession({
        table_id: body.table_id,
        access_code: body.access_code,
      })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 401 })
      }
      return NextResponse.json({ session: result.session })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
