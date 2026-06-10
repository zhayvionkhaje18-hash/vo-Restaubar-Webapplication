"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionProfile } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { OrderStatus, PaymentMethod } from "@/lib/types"
import { TAX_RATE } from "@/lib/constants"

// ============================================================
// CREATE ORDER (for POS terminal)
// ============================================================
export async function createPosOrder(input: {
  table_id: string | null
  customer_name?: string | null
  items: { menu_item_id: string; name: string; price: number; quantity: number; notes?: string }[]
  notes?: string | null
}) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  if (!input.items.length) return { error: "Order must have at least one item" }

  const subtotal = input.items.reduce((s, i) => s + i.price * i.quantity, 0)
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100

  // Create order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      table_id: input.table_id,
      customer_name: input.customer_name ?? null,
      status: "pending",
      payment_status: "unpaid",
      subtotal,
      tax,
      total,
      notes: input.notes ?? null,
      created_by: profile?.id ?? null,
    })
    .select()
    .single()
  if (orderErr) return { error: orderErr.message }

  // Insert order items
  const { error: itemsErr } = await supabase.from("order_items").insert(
    input.items.map((i) => ({
      order_id: order.id,
      menu_item_id: i.menu_item_id || null,
      name: i.name,
      unit_price: i.price,
      quantity: i.quantity,
      notes: i.notes ?? null,
      status: "pending" as OrderStatus,
    }))
  )
  if (itemsErr) return { error: itemsErr.message }

  // Mark table occupied
  if (input.table_id) {
    await supabase.from("tables").update({ status: "occupied" }).eq("id", input.table_id)
  }

  // Log
  await supabase.rpc("log_activity", {
    p_action: "order.created",
    p_entity: "order",
    p_entity_id: order.id,
    p_detail: { total, item_count: input.items.length, table: input.table_id },
  })

  revalidatePath("/pos")
  revalidatePath("/pos/orders")
  return { success: true, order_id: order.id }
}

// ============================================================
// UPDATE ORDER STATUS (POS / kitchen)
// ============================================================
export async function updatePosOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  const patch: Record<string, unknown> = { status }
  if (status === "served") patch.served_by = profile?.id ?? null
  if (status === "completed") patch.completed_at = new Date().toISOString()

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId)
  if (error) return { error: error.message }

  // Free table on completion
  if (status === "completed") {
    const { data: order } = await supabase.from("orders").select("table_id").eq("id", orderId).single()
    if (order?.table_id) {
      await supabase.from("tables").update({ status: "unavailable" }).eq("id", order.table_id)
    }
  }

  await supabase.rpc("log_activity", {
    p_action: `order.${status}`,
    p_entity: "order",
    p_entity_id: orderId,
  })
  revalidatePath("/pos")
  revalidatePath("/pos/orders")
  return { success: true }
}

// ============================================================
// UPDATE ORDER ITEM STATUS
// ============================================================
export async function updatePosOrderItemStatus(itemId: string, status: OrderStatus) {
  const supabase = await createClient()
  const { error } = await supabase.from("order_items").update({ status }).eq("id", itemId)
  if (error) return { error: error.message }
  revalidatePath("/pos")
  revalidatePath("/pos/orders")
  return { success: true }
}

// ============================================================
// CANCEL ORDER
// ============================================================
export async function cancelPosOrder(orderId: string) {
  const supabase = await createClient()

  // Free the table first
  const { data: order } = await supabase.from("orders").select("table_id").eq("id", orderId).single()
  if (order?.table_id) {
    await supabase.from("tables").update({ status: "available" }).eq("id", order.table_id)
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
  if (error) return { error: error.message }

  await supabase.rpc("log_activity", { p_action: "order.cancelled", p_entity: "order", p_entity_id: orderId })
  revalidatePath("/pos")
  revalidatePath("/pos/orders")
  return { success: true }
}

// ============================================================
// PROCESS PAYMENT
// ============================================================
export async function processPosPayment(input: {
  order_id: string
  method: PaymentMethod
  amount_tendered?: number | null
  reference?: string | null
}) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  // Get order total
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("total, table_id")
    .eq("id", input.order_id)
    .single()
  if (orderErr) return { error: orderErr.message }
  if (!order) return { error: "Order not found" }

  const total = Number(order.total)
  const change_due =
    input.method === "cash" && input.amount_tendered
      ? Math.max(0, input.amount_tendered - total)
      : null

  // Insert payment
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      order_id: input.order_id,
      amount: total,
      method: input.method,
      status: "paid",
      amount_tendered: input.amount_tendered ?? null,
      change_due,
      reference: input.reference ?? null,
      processed_by: profile?.id ?? null,
    })
    .select()
    .single()
  if (payErr) return { error: payErr.message }

  // Update order
  const { error: updateErr } = await supabase
    .from("orders")
    .update({ payment_status: "paid", status: "completed", completed_at: new Date().toISOString() })
    .eq("id", input.order_id)
  if (updateErr) return { error: updateErr.message }

  // Free table
  if (order.table_id) {
    await supabase.from("tables").update({ status: "available" }).eq("id", order.table_id)
  }

  // Create receipt — fetch order totals first
  const { data: orderForReceipt } = await supabase
    .from("orders")
    .select("subtotal, tax, total")
    .eq("id", input.order_id)
    .single()
  await supabase.from("receipts").insert({
    order_id: input.order_id,
    payment_id: payment.id,
    subtotal: orderForReceipt?.subtotal ?? total,
    tax: orderForReceipt?.tax ?? 0,
    total,
  })

  await supabase.rpc("log_activity", {
    p_action: "payment.completed",
    p_entity: "order",
    p_entity_id: input.order_id,
    p_detail: { total, method: input.method, change: change_due },
  })

  revalidatePath("/pos")
  revalidatePath("/pos/orders")
  revalidatePath("/pos/receipts")
  return { success: true, change_due }
}

// ============================================================
// GET POS DATA (for dashboard loading)
// ============================================================
export async function getPosData() {
  const supabase = await createClient()

  const [categories, menuItems, tables] = await Promise.all([
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
    supabase
      .from("tables")
      .select("*")
      .in("status", ["available", "occupied"])
      .order("label"),
  ])

  return {
    categories: categories.data ?? [],
    menuItems: menuItems.data ?? [],
    tables: tables.data ?? [],
  }
}

// ============================================================
// GET POS ORDERS
// ============================================================
export async function getPosOrders(status?: OrderStatus) {
  const supabase = await createClient()

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      order_items(*),
      tables(label, zone)
    `
    )
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query
  if (error) return { error: error.message }
  return { orders: data }
}

// ============================================================
// GET POS RECEIPTS
// ============================================================
export async function getPosReceipts() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("receipts")
    .select(
      `
      *,
      orders(order_number, total, created_at, tables(label))
    `
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) return { error: error.message }
  return { receipts: data }
}