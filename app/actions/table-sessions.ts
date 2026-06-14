"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ============================================================
// TABLE SESSION ACTIONS — customer-side (anonymous)
// ============================================================

export interface ActiveSession {
  id: string
  table_id: string
  customer_name: string
  token: string
  created_at: string
}

/**
 * Look up the table by QR token, return table info + any active session.
 * Called by customer page on load to decide:
 *  - if active session exists → show "join with access code" modal
 *  - if not → show "create session" modal
 */
export async function getTableSessionByQr(qrToken: string) {
  const supabase = await createClient()

  // Find table by QR token
  const { data: qrData, error: qrErr } = await supabase
    .from("table_qr_codes")
    .select("table_id, is_active")
    .eq("token", qrToken)
    .eq("is_active", true)
    .single()
  if (qrErr || !qrData) return { error: "Invalid QR code" }

  // Get table info
  const { data: table, error: tableErr } = await supabase
    .from("tables")
    .select("id, label, zone, table_code")
    .eq("id", qrData.table_id)
    .single()
  if (tableErr || !table) return { error: "Table not found" }

  // Get active session for this table
  const { data: session } = await supabase
    .from("table_sessions")
    .select("id, customer_name, created_at, status")
    .eq("table_id", table.id)
    .eq("status", "active")
    .maybeSingle()

  return {
    table,
    activeSession: session
      ? { id: session.id, customer_name: session.customer_name, created_at: session.created_at }
      : null,
  }
}

/**
 * Create a new table session (first customer).
 * Returns the session token to be stored in localStorage by the customer.
 */
export async function createTableSession(input: {
  table_id: string
  customer_name: string
  access_code: string
}) {
  const supabase = await createClient()

  if (!input.customer_name.trim()) return { error: "Customer name is required" }
  if (!/^\d{4,6}$/.test(input.access_code)) {
    return { error: "Access code must be 4-6 digits" }
  }

  // Check for existing active session
  const { data: existing } = await supabase
    .from("table_sessions")
    .select("id")
    .eq("table_id", input.table_id)
    .eq("status", "active")
    .maybeSingle()
  if (existing) return { error: "This table already has an active session. Please ask the host for the access code." }

  // Create session
  const { data: session, error } = await supabase
    .from("table_sessions")
    .insert({
      table_id: input.table_id,
      customer_name: input.customer_name.trim(),
      access_code: input.access_code,
      status: "active",
    })
    .select("id, token, customer_name, created_at")
    .single()
  if (error) return { error: error.message }

  // Mark table as occupied
  await supabase
    .from("tables")
    .update({ status: "occupied" })
    .eq("id", input.table_id)

  return { session }
}

/**
 * Join an existing table session using the access code.
 * Returns the session token to be stored in localStorage.
 */
export async function joinTableSession(input: {
  table_id: string
  access_code: string
}) {
  const supabase = await createClient()

  if (!/^\d{4,6}$/.test(input.access_code)) {
    return { error: "Invalid access code format" }
  }

  const { data: session, error } = await supabase
    .from("table_sessions")
    .select("id, token, customer_name, access_code, status")
    .eq("table_id", input.table_id)
    .eq("status", "active")
    .maybeSingle()
  if (error) return { error: error.message }
  if (!session) return { error: "No active session for this table" }
  if (session.access_code !== input.access_code) {
    return { error: "Incorrect access code. Please ask the host for the right code." }
  }

  return {
    session: {
      id: session.id,
      token: session.token,
      customer_name: session.customer_name,
    },
  }
}

/**
 * Get the session token by ID — used by customer to re-attach to an existing session.
 */
export async function getSessionById(sessionId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("table_sessions")
    .select("id, token, customer_name, table_id, status")
    .eq("id", sessionId)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: "Session not found" }
  return { session: data }
}

// ============================================================
// TABLE SESSION ACTIONS — staff (POS / Admin)
// ============================================================

/**
 * Process payment for an entire table session.
 * Marks all open orders as paid + closes the session + frees the table.
 * Used by POS "Process Payment" button.
 */
export async function processTableSessionPayment(input: {
  session_id: string
  method: "cash" | "card" | "gcash" | "maya"
  amount_tendered?: number | null
}) {
  const supabase = await createClient()
  const profile = await (await import("@/lib/auth")).getSessionProfile()
  if (!profile || (profile.role !== "pos" && profile.role !== "admin")) {
    return { error: "Unauthorized" }
  }

  // Get session + table_id
  const { data: session, error: sesErr } = await supabase
    .from("table_sessions")
    .select("id, table_id, status, customer_name")
    .eq("id", input.session_id)
    .single()
  if (sesErr || !session) return { error: "Session not found" }
  if (session.status !== "active") return { error: "Session is already closed" }

  // Get all unpaid orders for this session
  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id, total, subtotal, tax")
    .eq("session_id", input.session_id)
    .in("payment_status", ["unpaid", "pending"])
  if (ordersErr) return { error: ordersErr.message }
  if (!orders || orders.length === 0) return { error: "No unpaid orders for this session" }

  const grandTotal = orders.reduce((s, o) => s + Number(o.total), 0)
  const grandSubtotal = orders.reduce((s, o) => s + Number(o.subtotal), 0)
  const grandTax = orders.reduce((s, o) => s + Number(o.tax), 0)
  const change_due =
    input.method === "cash" && input.amount_tendered
      ? Math.max(0, input.amount_tendered - grandTotal)
      : null

  // Create one consolidated payment for the session
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      order_id: orders[0].id, // primary order (first one)
      amount: grandTotal,
      method: input.method,
      status: "paid",
      amount_tendered: input.amount_tendered ?? null,
      change_due,
      processed_by: profile.id,
    })
    .select()
    .single()
  if (payErr) return { error: payErr.message }

  // Mark all orders as paid + completed
  await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .in("id", orders.map((o) => o.id))

  // Create one consolidated receipt
  await supabase.from("receipts").insert({
    order_id: orders[0].id,
    payment_id: payment.id,
    subtotal: grandSubtotal,
    tax: grandTax,
    total: grandTotal,
  })

  // Close session
  await supabase
    .from("table_sessions")
    .update({
      status: "closed",
      closed_reason: "paid",
      closed_at: new Date().toISOString(),
      closed_by: profile.id,
    })
    .eq("id", input.session_id)

  // Free the table
  await supabase
    .from("tables")
    .update({ status: "available" })
    .eq("id", session.table_id)

  await supabase.rpc("log_activity", {
    p_action: "session.paid",
    p_entity: "table_session",
    p_entity_id: input.session_id,
    p_detail: {
      total: grandTotal,
      method: input.method,
      customer_name: session.customer_name,
      order_count: orders.length,
    },
  })

  revalidatePath("/pos")
  revalidatePath("/pos/orders")
  revalidatePath("/admin/orders")
  revalidatePath("/admin/tables")
  return { success: true, total: grandTotal }
}

/**
 * Cancel a table session (admin only).
 * Marks all open orders as cancelled + closes the session + frees the table.
 */
export async function cancelTableSession(input: {
  session_id: string
  reason?: string
}) {
  const supabase = await createClient()
  const profile = await (await import("@/lib/auth")).getSessionProfile()
  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized — admin only" }
  }

  // Get session
  const { data: session, error: sesErr } = await supabase
    .from("table_sessions")
    .select("id, table_id, status, customer_name")
    .eq("id", input.session_id)
    .single()
  if (sesErr || !session) return { error: "Session not found" }
  if (session.status !== "active") return { error: "Session is already closed" }

  // Get all unpaid orders
  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id")
    .eq("session_id", input.session_id)
    .in("payment_status", ["unpaid", "pending"])
  if (ordersErr) return { error: ordersErr.message }

  // Mark all open orders as cancelled
  if (orders && orders.length > 0) {
    await supabase
      .from("orders")
      .update({ status: "cancelled", payment_status: "unpaid" })
      .in("id", orders.map((o) => o.id))
  }

  // Close session
  await supabase
    .from("table_sessions")
    .update({
      status: "closed",
      closed_reason: "cancelled",
      closed_at: new Date().toISOString(),
      closed_by: profile.id,
    })
    .eq("id", input.session_id)

  // Free the table
  await supabase
    .from("tables")
    .update({ status: "available" })
    .eq("id", session.table_id)

  await supabase.rpc("log_activity", {
    p_action: "session.cancelled",
    p_entity: "table_session",
    p_entity_id: input.session_id,
    p_detail: {
      customer_name: session.customer_name,
      reason: input.reason,
      order_count: orders?.length ?? 0,
    },
  })

  revalidatePath("/admin/tables")
  revalidatePath("/pos")
  revalidatePath("/admin/orders")
  return { success: true }
}
