"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionProfile } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { OrderStatus } from "@/lib/types"

// ============================================================
// UPDATE ORDER STATUS (waiter action)
// ============================================================
export async function updateWaiterOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }
  if (profile.role !== "waiter") return { error: "Not authorized" }

  const patch: Record<string, unknown> = { status }
  if (status === "served") patch.served_by = profile.id

  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)

  if (error) return { error: error.message }

  await supabase.rpc("log_activity", {
    p_action: `order.${status}`,
    p_entity: "order",
    p_entity_id: orderId,
    p_detail: { waiter_id: profile.id, waiter_name: profile.full_name },
  })

  revalidatePath("/waiter")
  revalidatePath("/waiter/orders")
  return { success: true }
}

// ============================================================
// GET WAITER ORDERS (for orders page)
// ============================================================
export async function getWaiterOrders(status?: OrderStatus) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }
  if (profile.role !== "waiter") return { error: "Not authorized" }

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      tables(label, zone, assigned_waiter),
      order_items(*)
    `
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query
  if (error) return { error: error.message }

  // Filter to only orders relevant to this waiter (assigned to them or unassigned)
  const filtered = (data ?? []).filter((o) => {
    // Show all non-cancelled, non-completed orders that are waiting to be served
    if (o.status === "cancelled" || o.status === "completed") return false
    // Show orders from tables assigned to this waiter OR tables with no assignment
    const tableAssigned = o.tables?.assigned_waiter
    return !tableAssigned || tableAssigned === profile.id
  })

  return { orders: filtered }
}

// ============================================================
// GET WAITER TABLES
// ============================================================
export async function getWaiterTables() {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }
  if (profile.role !== "waiter") return { error: "Not authorized" }

  const { data, error } = await supabase
    .from("tables")
    .select(
      `
      *,
      orders(
        id,
        order_number,
        status,
        payment_status,
        total,
        created_at,
        order_items(count)
      )
    `
    )
    .or(`assigned_waiter.eq.${profile.id},assigned_waiter.is.null`)
    .order("label")

  if (error) return { error: error.message }
  return { tables: data }
}

// ============================================================
// GET TABLE DETAIL
// ============================================================
export async function getWaiterTableDetail(tableId: string) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }
  if (profile.role !== "waiter") return { error: "Not authorized" }

  const { data: table, error: tableErr } = await supabase
    .from("tables")
    .select("*")
    .eq("id", tableId)
    .single()
  if (tableErr) return { error: tableErr.message }

  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items(*)
    `
    )
    .eq("table_id", tableId)
    .in("status", ["pending", "confirmed", "preparing", "ready", "served"])
    .order("created_at", { ascending: false })
  if (ordersErr) return { error: ordersErr.message }

  return { table, orders: orders ?? [] }
}

// ============================================================
// ADD NOTE TO ORDER
// ============================================================
export async function addWaiterOrderNote(orderId: string, note: string) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("orders")
    .update({ notes: note })
    .eq("id", orderId)

  if (error) return { error: error.message }

  await supabase.rpc("log_activity", {
    p_action: "order.note_added",
    p_entity: "order",
    p_entity_id: orderId,
    p_detail: { note, added_by: profile?.full_name },
  })

  revalidatePath("/waiter")
  revalidatePath("/waiter/orders")
  return { success: true }
}

// ============================================================
// GET WAITER NOTIFICATIONS (activity logs for this waiter)
// ============================================================
export async function getWaiterNotifications(limit = 50) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }
  if (profile.role !== "waiter") return { error: "Not authorized" }

  // Get recent activity for orders from tables assigned to this waiter
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .ilike("action", "order.%")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return { error: error.message }

  // Also fetch any orders that need attention (pending/confirmed for this waiter's tables)
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("id, order_number, status, created_at, tables(label)")
    .in("status", ["pending", "confirmed"])
    .order("created_at", { ascending: true })
    .limit(20)

  return {
    notifications: data ?? [],
    pendingOrders: pendingOrders ?? [],
  }
}