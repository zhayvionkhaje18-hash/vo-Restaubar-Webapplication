"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionProfile } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { TAX_RATE } from "@/lib/constants"
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
// ASSIST / CLAIM ORDER (waiter picks up a customer order)
// Assigns the order's table to this waiter
// ============================================================
export async function assistWaiterOrder(orderId: string) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }
  if (profile.role !== "waiter") return { error: "Not authorized" }

  // Get the order to find the table_id
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, table_id")
    .eq("id", orderId)
    .single()

  if (orderErr) return { error: orderErr.message }

  // Assign the table to this waiter
  if (order.table_id) {
    const { error: tableErr } = await supabase
      .from("tables")
      .update({ assigned_waiter: profile.id })
      .eq("id", order.table_id)

    if (tableErr) return { error: tableErr.message }
  }

  await supabase.rpc("log_activity", {
    p_action: "order.assisted",
    p_entity: "order",
    p_entity_id: orderId,
    p_detail: { waiter_id: profile.id, waiter_name: profile.full_name, action: "assisted_customer" },
  })

  revalidatePath("/waiter")
  revalidatePath("/waiter/orders")
  return { success: true }
}

// ============================================================
// CONFIRM ORDER TO KITCHEN
// After assist + customer review, finalize the order
// ============================================================
export async function confirmWaiterOrder(orderId: string) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }
  if (profile.role !== "waiter") return { error: "Not authorized" }

  const { error } = await supabase
    .from("orders")
    .update({ status: "confirmed" as OrderStatus })
    .eq("id", orderId)

  if (error) return { error: error.message }

  // Mark table as occupied
  const { data: order } = await supabase
    .from("orders")
    .select("table_id")
    .eq("id", orderId)
    .single()

  if (order?.table_id) {
    await supabase
      .from("tables")
      .update({ status: "occupied", assigned_waiter: profile.id })
      .eq("id", order.table_id)
  }

  await supabase.rpc("log_activity", {
    p_action: "order.confirmed",
    p_entity: "order",
    p_entity_id: orderId,
    p_detail: { waiter_id: profile.id, waiter_name: profile.full_name, action: "confirmed_to_kitchen" },
  })

  revalidatePath("/waiter")
  revalidatePath("/waiter/orders")
  return { success: true }
}

// ============================================================
// RELEASE ORDER (waiter releases a claimed order back to pool)
// ============================================================
export async function releaseWaiterOrder(orderId: string) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }
  if (profile.role !== "waiter") return { error: "Not authorized" }

  const { data: order } = await supabase
    .from("orders")
    .select("table_id")
    .eq("id", orderId)
    .single()

  if (order?.table_id) {
    await supabase
      .from("tables")
      .update({ assigned_waiter: null })
      .eq("id", order.table_id)
  }

  await supabase.rpc("log_activity", {
    p_action: "order.released",
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

  // Show ALL non-cancelled, non-completed orders to ALL waiters
  // Each waiter can assist / claim any order
  const filtered = (data ?? []).filter((o) => {
    if (o.status === "cancelled" || o.status === "completed") return false
    return true
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

// ============================================================
// GET WAITER MENU (categories + menu items for adding to orders)
// ============================================================
export async function getWaiterMenu() {
  const supabase = await createClient()

  const [categories, menuItems] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("name"),
  ])

  return {
    categories: categories.data ?? [],
    menuItems: menuItems.data ?? [],
  }
}

// ============================================================
// ADD ITEM TO ORDER
// ============================================================
export async function addWaiterOrderItem(input: {
  order_id: string
  menu_item_id: string
  name: string
  price: number
  quantity: number
  notes?: string
}) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }
  if (profile.role !== "waiter") return { error: "Not authorized" }

  // Insert the item
  const { error: insertErr } = await supabase.from("order_items").insert({
    order_id: input.order_id,
    menu_item_id: input.menu_item_id || null,
    name: input.name,
    unit_price: input.price,
    quantity: input.quantity,
    notes: input.notes ?? null,
    status: "pending" as OrderStatus,
  })

  if (insertErr) return { error: insertErr.message }

  // Recalculate order totals
  await recalculateOrderTotals(supabase, input.order_id)

  await supabase.rpc("log_activity", {
    p_action: "order.item_added",
    p_entity: "order",
    p_entity_id: input.order_id,
    p_detail: { item: input.name, qty: input.quantity, price: input.price, added_by: profile.full_name },
  })

  revalidatePath("/waiter")
  revalidatePath("/waiter/orders")
  revalidatePath("/waiter/tables")
  return { success: true }
}

// ============================================================
// UPDATE ORDER ITEM (quantity / notes)
// ============================================================
export async function updateWaiterOrderItem(input: {
  item_id: string
  quantity: number
  notes?: string
}) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }
  if (profile.role !== "waiter") return { error: "Not authorized" }

  // Get the order_id so we can recalculate totals after
  const { data: item } = await supabase
    .from("order_items")
    .select("order_id, quantity")
    .eq("id", input.item_id)
    .single()
  if (!item) return { error: "Item not found" }

  if (input.quantity <= 0) {
    // Delete the item if quantity is 0 or less
    const { error } = await supabase.from("order_items").delete().eq("id", input.item_id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from("order_items")
      .update({ quantity: input.quantity, notes: input.notes ?? null })
      .eq("id", input.item_id)
    if (error) return { error: error.message }
  }

  await recalculateOrderTotals(supabase, item.order_id)

  await supabase.rpc("log_activity", {
    p_action: "order.item_updated",
    p_entity: "order",
    p_entity_id: item.order_id,
    p_detail: { item_id: input.item_id, qty: input.quantity, updated_by: profile.full_name },
  })

  revalidatePath("/waiter")
  revalidatePath("/waiter/orders")
  revalidatePath("/waiter/tables")
  return { success: true }
}

// ============================================================
// DELETE ORDER ITEM
// ============================================================
export async function deleteWaiterOrderItem(itemId: string) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!profile) return { error: "Not authenticated" }
  if (profile.role !== "waiter") return { error: "Not authorized" }

  // Get order_id before deleting
  const { data: item } = await supabase
    .from("order_items")
    .select("order_id, name")
    .eq("id", itemId)
    .single()
  if (!item) return { error: "Item not found" }

  const { error } = await supabase.from("order_items").delete().eq("id", itemId)
  if (error) return { error: error.message }

  await recalculateOrderTotals(supabase, item.order_id)

  await supabase.rpc("log_activity", {
    p_action: "order.item_removed",
    p_entity: "order",
    p_entity_id: item.order_id,
    p_detail: { item: item.name, removed_by: profile.full_name },
  })

  revalidatePath("/waiter")
  revalidatePath("/waiter/orders")
  revalidatePath("/waiter/tables")
  return { success: true }
}

// ============================================================
// RECALCULATE ORDER TOTALS (subtotal, tax, total)
// ============================================================
async function recalculateOrderTotals(supabase: Awaited<ReturnType<typeof createClient>>, orderId: string) {
  const { data: items } = await supabase
    .from("order_items")
    .select("unit_price, quantity")
    .eq("order_id", orderId)

  if (!items?.length) {
    await supabase
      .from("orders")
      .update({ subtotal: 0, tax: 0, total: 0 })
      .eq("id", orderId)
    return
  }

  const subtotal = items.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0)
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100

  await supabase
    .from("orders")
    .update({ subtotal, tax, total })
    .eq("id", orderId)
}