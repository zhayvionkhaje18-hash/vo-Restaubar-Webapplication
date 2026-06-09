"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  OrderStatus,
  PaymentMethod,
  ReservationStatus,
} from "@/lib/types"
import { TAX_RATE } from "@/lib/constants"

// ============================================================
// CATEGORIES
// ============================================================
export async function createCategoryAction(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get("name") as string
  const description = (formData.get("description") as string) || null
  const sort_order = parseInt((formData.get("sort_order") as string) || "0")

  if (!name) return { error: "Name is required" }

  const { error } = await supabase
    .from("categories")
    .insert({ name, description, sort_order })
  if (error) return { error: error.message }

  await supabase.rpc("log_activity", {
    p_action: "category.created",
    p_entity: "category",
    p_detail: { name },
  })
  revalidatePath("/admin/menu")
  return { success: true }
}

export async function updateCategoryAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get("name") as string
  const description = (formData.get("description") as string) || null
  const sort_order = parseInt((formData.get("sort_order") as string) || "0")
  const is_active = formData.get("is_active") === "true"

  const { error } = await supabase
    .from("categories")
    .update({ name, description, sort_order, is_active })
    .eq("id", id)
  if (error) return { error: error.message }

  await supabase.rpc("log_activity", { p_action: "category.updated", p_entity: "category", p_entity_id: id })
  revalidatePath("/admin/menu")
  return { success: true }
}

export async function deleteCategoryAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) return { error: error.message }
  await supabase.rpc("log_activity", { p_action: "category.deleted", p_entity: "category", p_entity_id: id })
  revalidatePath("/admin/menu")
  return { success: true }
}

// ============================================================
// MENU ITEMS
// ============================================================
export async function createMenuItemAction(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get("name") as string
  const description = (formData.get("description") as string) || null
  const price = parseFloat(formData.get("price") as string)
  const category_id = (formData.get("category_id") as string) || null
  const prep_minutes = parseInt((formData.get("prep_minutes") as string) || "15")
  const is_alcoholic = formData.get("is_alcoholic") === "on"
  const is_available = formData.get("is_available") === "on"
  const image_url = (formData.get("image_url") as string) || null

  if (!name || isNaN(price)) return { error: "Name and price are required" }

  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      name, description, price, category_id, prep_minutes,
      is_alcoholic, is_available, image_url,
    })
    .select()
    .single()
  if (error) return { error: error.message }

  await supabase.rpc("log_activity", {
    p_action: "menu.created",
    p_entity: "menu_item",
    p_entity_id: data.id,
    p_detail: { name, price },
  })
  revalidatePath("/admin/menu")
  return { success: true, data }
}

export async function updateMenuItemAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get("name") as string
  const description = (formData.get("description") as string) || null
  const price = parseFloat(formData.get("price") as string)
  const category_id = (formData.get("category_id") as string) || null
  const prep_minutes = parseInt((formData.get("prep_minutes") as string) || "15")
  const is_alcoholic = formData.get("is_alcoholic") === "on"
  const is_available = formData.get("is_available") === "on"
  const image_url = (formData.get("image_url") as string) || null

  const { error } = await supabase
    .from("menu_items")
    .update({
      name, description, price, category_id, prep_minutes,
      is_alcoholic, is_available, image_url,
    })
    .eq("id", id)
  if (error) return { error: error.message }

  await supabase.rpc("log_activity", { p_action: "menu.updated", p_entity: "menu_item", p_entity_id: id })
  revalidatePath("/admin/menu")
  return { success: true }
}

export async function deleteMenuItemAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("menu_items").delete().eq("id", id)
  if (error) return { error: error.message }
  await supabase.rpc("log_activity", { p_action: "menu.deleted", p_entity: "menu_item", p_entity_id: id })
  revalidatePath("/admin/menu")
  return { success: true }
}

export async function toggleMenuItemAvailabilityAction(id: string, is_available: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from("menu_items").update({ is_available }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/menu")
  return { success: true }
}

// ============================================================
// TABLES
// ============================================================
export async function createTableAction(formData: FormData) {
  const supabase = await createClient()
  const label = formData.get("label") as string
  const seats = parseInt(formData.get("seats") as string)
  const zone = (formData.get("zone") as string) || null
  const notes = (formData.get("notes") as string) || null

  if (!label || isNaN(seats)) return { error: "Label and seats are required" }

  const { data, error } = await supabase
    .from("tables")
    .insert({ label, seats, zone, notes, status: "available" })
    .select()
    .single()
  if (error) return { error: error.message }

  // Auto-generate QR code
  await supabase.rpc("generate_qr_token").then(async (res) => {
    const token = (res.data as string) ?? Math.random().toString(36).slice(2, 18)
    await supabase.from("table_qr_codes").insert({ table_id: data.id, token, is_active: true })
  })

  await supabase.rpc("log_activity", { p_action: "table.created", p_entity: "table", p_entity_id: data.id, p_detail: { label } })
  revalidatePath("/admin/tables")
  return { success: true, data }
}

export async function updateTableAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const label = formData.get("label") as string
  const seats = parseInt(formData.get("seats") as string)
  const zone = (formData.get("zone") as string) || null
  const status = (formData.get("status") as string) || "available"
  const assigned_waiter = (formData.get("assigned_waiter") as string) || null
  const notes = (formData.get("notes") as string) || null

  const { error } = await supabase
    .from("tables")
    .update({ label, seats, zone, status, assigned_waiter, notes })
    .eq("id", id)
  if (error) return { error: error.message }

  await supabase.rpc("log_activity", { p_action: "table.updated", p_entity: "table", p_entity_id: id })
  revalidatePath("/admin/tables")
  return { success: true }
}

export async function deleteTableAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("tables").delete().eq("id", id)
  if (error) return { error: error.message }
  await supabase.rpc("log_activity", { p_action: "table.deleted", p_entity: "table", p_entity_id: id })
  revalidatePath("/admin/tables")
  return { success: true }
}

export async function updateTableStatusAction(id: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("tables").update({ status }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/tables")
  return { success: true }
}

export async function assignTableToWaiterAction(tableId: string, waiterId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tables")
    .update({ assigned_waiter: waiterId })
    .eq("id", tableId)
  if (error) return { error: error.message }
  revalidatePath("/admin/tables")
  return { success: true }
}

// ============================================================
// TABLE QR CODES
// ============================================================
export async function generateTableQRAction(tableId: string) {
  const supabase = await createClient()
  // Deactivate old QRs
  await supabase.from("table_qr_codes").update({ is_active: false }).eq("table_id", tableId)
  // Create new
  const { data: tokenData } = await supabase.rpc("generate_qr_token")
  const token = (tokenData as string) ?? Math.random().toString(36).slice(2, 18)
  const { data, error } = await supabase
    .from("table_qr_codes")
    .insert({ table_id: tableId, token, is_active: true })
    .select()
    .single()
  if (error) return { error: error.message }
  await supabase.rpc("log_activity", { p_action: "qr.generated", p_entity: "table", p_entity_id: tableId })
  revalidatePath("/admin/tables")
  return { success: true, data }
}

// ============================================================
// STAFF
// ============================================================
export async function updateStaffAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const full_name = (formData.get("full_name") as string) || null
  const phone = (formData.get("phone") as string) || null
  const role = formData.get("role") as string
  const is_active = formData.get("is_active") === "true"

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone, role, is_active })
    .eq("id", id)
  if (error) return { error: error.message }
  await supabase.rpc("log_activity", { p_action: "staff.updated", p_entity: "profile", p_entity_id: id })
  revalidatePath("/admin/staff")
  return { success: true }
}

export async function toggleStaffStatusAction(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ is_active }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/staff")
  return { success: true }
}

// ============================================================
// ORDERS
// ============================================================
export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("orders")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", orderId)
  if (error) return { error: error.message }
  await supabase.rpc("log_activity", { p_action: `order.${status}`, p_entity: "order", p_entity_id: orderId })
  revalidatePath("/admin/orders")
  return { success: true }
}

// ============================================================
// PAYMENTS (POS)
// ============================================================
export async function createOrderWithPaymentAction(input: {
  table_id: string | null
  items: { menu_item_id: string; name: string; price: number; quantity: number; notes?: string }[]
  payment_method: PaymentMethod
  amount_tendered?: number
  customer_name?: string
  session_token?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const subtotal = input.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100
  const change_due = input.payment_method === "cash" && input.amount_tendered
    ? Math.max(0, input.amount_tendered - total)
    : null

  // 1. Create order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      table_id: input.table_id,
      customer_name: input.customer_name ?? null,
      session_token: input.session_token ?? null,
      status: "pending",
      payment_status: input.payment_method === "cash" ? "pending" : "pending",
      subtotal, tax, total,
      created_by: user?.id ?? null,
    })
    .select()
    .single()
  if (orderErr) return { error: orderErr.message }

  // 2. Insert order items
  if (input.items.length > 0) {
    const { error: itemsErr } = await supabase.from("order_items").insert(
      input.items.map((i) => ({
        order_id: order.id,
        menu_item_id: i.menu_item_id,
        name: i.name,
        unit_price: i.price,
        quantity: i.quantity,
        notes: i.notes ?? null,
        status: "pending",
      }))
    )
    if (itemsErr) return { error: itemsErr.message }
  }

  // 3. Process payment
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      order_id: order.id,
      amount: total,
      method: input.payment_method,
      status: input.payment_method === "cash" ? "pending" : "paid",
      amount_tendered: input.amount_tendered ?? null,
      change_due,
      processed_by: user?.id ?? null,
    })
    .select()
    .single()
  if (payErr) return { error: payErr.message }

  // 4. Mark order paid if non-cash
  if (input.payment_method !== "cash") {
    await supabase.from("orders").update({ payment_status: "paid" }).eq("id", order.id)
  }

  // 5. Mark table occupied
  if (input.table_id) {
    await supabase.from("tables").update({ status: "occupied" }).eq("id", input.table_id)
  }

  // 6. Create receipt
  await supabase.from("receipts").insert({
    order_id: order.id,
    payment_id: payment.id,
    subtotal, tax, total,
  })

  // 7. Log
  await supabase.rpc("log_activity", {
    p_action: "order.created",
    p_entity: "order",
    p_entity_id: order.id,
    p_detail: { total, method: input.payment_method, item_count: input.items.length },
  })

  revalidatePath("/pos")
  revalidatePath("/admin/orders")
  return { success: true, order_id: order.id, total }
}

// ============================================================
// RESERVATIONS
// ============================================================
export async function createReservationAction(formData: FormData) {
  const supabase = await createClient()
  const customer_name = formData.get("customer_name") as string
  const customer_phone = (formData.get("customer_phone") as string) || null
  const customer_email = (formData.get("customer_email") as string) || null
  const party_size = parseInt(formData.get("party_size") as string)
  const reserved_at = formData.get("reserved_at") as string
  const table_id = (formData.get("table_id") as string) || null
  const notes = (formData.get("notes") as string) || null

  if (!customer_name || isNaN(party_size) || !reserved_at) {
    return { error: "Customer name, party size, and date are required" }
  }

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      customer_name, customer_phone, customer_email, party_size,
      reserved_at, table_id, notes, status: "pending",
    })
    .select()
    .single()
  if (error) return { error: error.message }
  await supabase.rpc("log_activity", { p_action: "reservation.created", p_entity: "reservation", p_entity_id: data.id })
  revalidatePath("/admin/reservations")
  return { success: true, data }
}

export async function updateReservationStatusAction(id: string, status: ReservationStatus) {
  const supabase = await createClient()
  const { error } = await supabase.from("reservations").update({ status }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/reservations")
  return { success: true }
}

export async function deleteReservationAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("reservations").delete().eq("id", id)
  if (error) return { error: error.message }
  await supabase.rpc("log_activity", { p_action: "reservation.deleted", p_entity: "reservation", p_entity_id: id })
  revalidatePath("/admin/reservations")
  return { success: true }
}

// ============================================================
// RESTAURANT SETTINGS
// ============================================================
export async function updateRestaurantSettingsAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // Admin check
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || (profile as { role: string }).role !== "admin") {
    return { error: "Admin access required" }
  }

  const name = (formData.get("name") as string)?.trim()
  const tagline = (formData.get("tagline") as string)?.trim() || null
  const address = (formData.get("address") as string)?.trim() || null
  const phone = (formData.get("phone") as string)?.trim() || null
  const email = (formData.get("email") as string)?.trim() || null
  const tin = (formData.get("tin") as string)?.trim() || null
  const logo_url = (formData.get("logo_url") as string)?.trim() || null
  const currency = (formData.get("currency") as string)?.trim() || "₱"
  const tax_rate = parseFloat(formData.get("tax_rate") as string) || 0
  const service_charge = parseFloat(formData.get("service_charge") as string) || 0
  const receipt_footer = (formData.get("receipt_footer") as string)?.trim() || null
  const open_time = (formData.get("open_time") as string)?.trim() || null
  const close_time = (formData.get("close_time") as string)?.trim() || null

  if (!name) return { error: "Restaurant name is required" }

  const { error } = await supabase
    .from("restaurant_settings")
    .update({
      name,
      tagline,
      address,
      phone,
      email,
      tin,
      logo_url,
      currency,
      tax_rate,
      service_charge,
      receipt_footer,
      open_time,
      close_time,
    })
    .eq("id", 1)

  if (error) return { error: error.message }
  await supabase.rpc("log_activity", {
    p_action: "settings.updated",
    p_entity: "restaurant_settings",
    p_entity_id: null,
  })
  revalidatePath("/admin/settings")
  revalidatePath("/admin")
  return { success: true }
}
