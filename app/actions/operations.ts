"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionProfile } from "@/lib/auth"
import { revalidatePath } from "next/cache"

async function logActivity(action: string, entity: string, detail: string) {
  const supabase = await createClient()
  const profile = await getSessionProfile()
  await supabase.from("activity_logs").insert({
    actor_id: profile?.id ?? null,
    actor_name: profile?.full_name ?? "System",
    action,
    entity,
    detail,
  })
}

/* ----------------------------- MENU ----------------------------- */
export async function upsertMenuItem(input: {
  id?: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  is_available: boolean
  is_alcoholic: boolean
  prep_minutes: number
}) {
  const supabase = await createClient()
  if (input.id) {
    const { error } = await supabase.from("menu_items").update(input).eq("id", input.id)
    if (error) return { error: error.message }
    await logActivity("update", "menu_item", `Updated "${input.name}"`)
  } else {
    const { error } = await supabase.from("menu_items").insert(input)
    if (error) return { error: error.message }
    await logActivity("create", "menu_item", `Added "${input.name}"`)
  }
  revalidatePath("/admin/menu")
  revalidatePath("/menu")
  return { error: null }
}

export async function deleteMenuItem(id: string, name: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("menu_items").delete().eq("id", id)
  if (error) return { error: error.message }
  await logActivity("delete", "menu_item", `Removed "${name}"`)
  revalidatePath("/admin/menu")
  return { error: null }
}

export async function toggleMenuAvailability(id: string, is_available: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from("menu_items").update({ is_available }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/menu")
  return { error: null }
}

export async function upsertCategory(input: { id?: string; name: string; description: string | null; sort_order: number }) {
  const supabase = await createClient()
  if (input.id) {
    const { error } = await supabase.from("categories").update(input).eq("id", input.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from("categories").insert(input)
    if (error) return { error: error.message }
  }
  revalidatePath("/admin/menu")
  return { error: null }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/menu")
  return { error: null }
}

/* ----------------------------- TABLES ----------------------------- */
export async function upsertTable(input: { id?: string; label: string; seats: number; zone: string; status?: string }) {
  const supabase = await createClient()
  if (input.id) {
    const { error } = await supabase.from("tables").update(input).eq("id", input.id)
    if (error) return { error: error.message }
  } else {
    const { data, error } = await supabase.from("tables").insert(input).select("id").single()
    if (error) return { error: error.message }
    // create a QR code for the new table
    if (data) await supabase.from("table_qr_codes").insert({ table_id: data.id })
    await logActivity("create", "table", `Added table "${input.label}"`)
  }
  revalidatePath("/admin/tables")
  return { error: null }
}

export async function deleteTable(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("tables").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/tables")
  return { error: null }
}

export async function setTableStatus(id: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("tables").update({ status }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/tables")
  revalidatePath("/waiter")
  return { error: null }
}

export async function assignWaiter(tableId: string, waiterId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase.from("tables").update({ assigned_waiter: waiterId }).eq("id", tableId)
  if (error) return { error: error.message }
  revalidatePath("/admin/tables")
  return { error: null }
}

/* ----------------------------- STAFF ----------------------------- */
export async function updateStaffRole(id: string, role: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/staff")
  return { error: null }
}

export async function toggleStaffActive(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ is_active }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/staff")
  return { error: null }
}

/* ----------------------------- RESERVATIONS ----------------------------- */
export async function upsertReservation(input: {
  id?: string
  customer_name: string
  customer_phone: string | null
  party_size: number
  reserved_at: string
  table_id: string | null
  status?: string
  notes: string | null
}) {
  const supabase = await createClient()
  if (input.id) {
    const { error } = await supabase.from("reservations").update(input).eq("id", input.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from("reservations").insert(input)
    if (error) return { error: error.message }
    await logActivity("create", "reservation", `Booking for ${input.customer_name}`)
  }
  revalidatePath("/admin/reservations")
  return { error: null }
}

export async function setReservationStatus(id: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("reservations").update({ status }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/reservations")
  return { error: null }
}

export async function deleteReservation(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("reservations").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/reservations")
  return { error: null }
}

/* ----------------------------- ORDERS ----------------------------- */
export async function setOrderStatus(id: string, status: string) {
  const supabase = await createClient()
  const profile = await getSessionProfile()
  const patch: Record<string, unknown> = { status }
  if (status === "served") patch.served_by = profile?.id ?? null
  const { error } = await supabase.from("orders").update(patch).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/pos")
  revalidatePath("/waiter")
  return { error: null }
}

export async function setOrderItemStatus(id: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("order_items").update({ status }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/pos")
  revalidatePath("/waiter")
  return { error: null }
}

/* ----------------------------- PAYMENTS ----------------------------- */
export async function processPayment(input: {
  order_id: string
  amount: number
  method: string
  amount_tendered?: number | null
  reference?: string | null
}) {
  const supabase = await createClient()
  const profile = await getSessionProfile()

  const change_due =
    input.amount_tendered != null ? Math.max(0, input.amount_tendered - input.amount) : null

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      order_id: input.order_id,
      amount: input.amount,
      method: input.method,
      status: "paid",
      amount_tendered: input.amount_tendered ?? null,
      change_due,
      reference: input.reference ?? null,
      processed_by: profile?.id ?? null,
    })
    .select("id")
    .single()
  if (payErr) return { error: payErr.message }

  const { error: ordErr } = await supabase
    .from("orders")
    .update({ payment_status: "paid", status: "completed" })
    .eq("id", input.order_id)
  if (ordErr) return { error: ordErr.message }

  const { data: receipt, error: rcptErr } = await supabase
    .from("receipts")
    .insert({ order_id: input.order_id, payment_id: payment?.id ?? null, total: input.amount })
    .select("id, receipt_number")
    .single()
  if (rcptErr) return { error: rcptErr.message }

  // free up the table
  const { data: order } = await supabase.from("orders").select("table_id").eq("id", input.order_id).single()
  if (order?.table_id) {
    await supabase.from("tables").update({ status: "unavailable" }).eq("id", order.table_id)
  }

  await logActivity("payment", "order", `Collected payment via ${input.method}`)
  revalidatePath("/pos")
  revalidatePath("/admin")
  return { error: null, receipt }
}
