import { createClient } from "@/lib/supabase/server"
import type {
  Profile,
  RestaurantTable,
  Category,
  MenuItem,
  Order,
  OrderItem,
  OrderWithItems,
  Payment,
  Receipt,
  Reservation,
  ActivityLog,
  RestaurantSettings,
  TableStatus,
  OrderStatus,
  PaymentStatus,
  ReservationStatus,
} from "@/lib/types"

// ============================================================
// ADMIN: DASHBOARD STATS
// ============================================================
export interface DashboardStats {
  todayRevenue: number
  todayOrders: number
  activeTables: number
  totalTables: number
  avgOrderValue: number
  pendingOrders: number
  lowStockItems: number
  occupiedTables: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [ordersRes, tablesRes, pendingRes] = await Promise.all([
    supabase
      .from("orders")
      .select("total, status, payment_status")
      .gte("created_at", todayStart.toISOString()),
    supabase.from("tables").select("status"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ])

  const todayOrders = ordersRes.data ?? []
  const paidToday = todayOrders.filter((o) => o.payment_status === "paid")
  const todayRevenue = paidToday.reduce((sum, o) => sum + Number(o.total), 0)
  const tables = tablesRes.data ?? []
  const occupiedTables = tables.filter((t) => t.status === "occupied").length

  return {
    todayRevenue,
    todayOrders: todayOrders.length,
    activeTables: tables.length,
    totalTables: tables.length,
    avgOrderValue: paidToday.length > 0 ? todayRevenue / paidToday.length : 0,
    pendingOrders: pendingRes.count ?? 0,
    lowStockItems: 0,
    occupiedTables,
  }
}

// ============================================================
// ADMIN: RECENT ORDERS
// ============================================================
export async function getRecentOrders(limit = 10): Promise<OrderWithItems[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items(*),
      tables:table_id (label, zone)
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as OrderWithItems[]
}

// ============================================================
// ADMIN: TOP SELLING ITEMS
// ============================================================
export async function getTopSellingItems(limit = 5) {
  const supabase = await createClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from("order_items")
    .select(`
      menu_item_id,
      name,
      quantity,
      unit_price,
      orders!inner (created_at, payment_status)
    `)
    .gte("orders.created_at", todayStart.toISOString())
    .eq("orders.payment_status", "paid")

  if (error || !data) return []

  // Aggregate
  const map = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const item of data) {
    const existing = map.get(item.menu_item_id ?? item.name)
    if (existing) {
      existing.qty += item.quantity
      existing.revenue += item.quantity * Number(item.unit_price)
    } else {
      map.set(item.menu_item_id ?? item.name, {
        name: item.name,
        qty: item.quantity,
        revenue: item.quantity * Number(item.unit_price),
      })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit)
}

// ============================================================
// CATEGORIES
// ============================================================
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
  if (error) return []
  return (data ?? []) as Category[]
}

export async function getActiveCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
  if (error) return []
  return (data ?? []) as Category[]
}

export async function createCategory(input: { name: string; description?: string; sort_order?: number }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: input.name, description: input.description, sort_order: input.sort_order ?? 0 })
    .select()
    .single()
  return { data, error }
}

export async function updateCategory(id: string, input: Partial<Category>) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("categories").update(input).eq("id", id).select().single()
  return { data, error }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("categories").delete().eq("id", id)
  return { error }
}

// ============================================================
// MENU ITEMS
// ============================================================
export async function getMenuItems(): Promise<(MenuItem & { category: Category | null })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("menu_items")
    .select(`*, category:category_id (*)`)
    .order("name", { ascending: true })
  if (error) return []
  return (data ?? []) as (MenuItem & { category: Category | null })[]
}

export async function getAvailableMenuItems(): Promise<(MenuItem & { category: Category | null })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("menu_items")
    .select(`*, category:category_id (*)`)
    .eq("is_available", true)
    .order("name", { ascending: true })
  if (error) return []
  return (data ?? []) as (MenuItem & { category: Category | null })[]
}

export async function createMenuItem(input: Partial<MenuItem>) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("menu_items").insert(input).select().single()
  return { data, error }
}

export async function updateMenuItem(id: string, input: Partial<MenuItem>) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("menu_items").update(input).eq("id", id).select().single()
  return { data, error }
}

export async function deleteMenuItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("menu_items").delete().eq("id", id)
  return { error }
}

// ============================================================
// TABLES
// ============================================================
export async function getTables(): Promise<(RestaurantTable & { assigned_waiter_profile: Profile | null })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tables")
    .select(`*, assigned_waiter_profile:assigned_waiter (*)`)
    .order("label", { ascending: true })
  if (error) return []
  return (data ?? []) as (RestaurantTable & { assigned_waiter_profile: Profile | null })[]
}

export async function getAvailableTables(): Promise<RestaurantTable[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .eq("status", "available")
    .order("label", { ascending: true })
  if (error) return []
  return (data ?? []) as RestaurantTable[]
}

export async function createTable(input: Partial<RestaurantTable>) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tables").insert(input).select().single()
  return { data, error }
}

export async function updateTable(id: string, input: Partial<RestaurantTable>) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tables").update(input).eq("id", id).select().single()
  return { data, error }
}

export async function deleteTable(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("tables").delete().eq("id", id)
  return { error }
}

// ============================================================
// TABLE QR CODES
// ============================================================
export async function getTableQRCodes(tableId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("table_qr_codes")
    .select("*")
    .eq("table_id", tableId)
    .order("created_at", { ascending: false })
  if (error) return []
  return data ?? []
}

export async function generateTableQR(tableId: string) {
  const supabase = await createClient()
  // generate token via RPC
  const { data: tokenData } = await supabase.rpc("generate_qr_token")
  const token = (tokenData as string) ?? Math.random().toString(36).slice(2, 18)
  const { data, error } = await supabase
    .from("table_qr_codes")
    .insert({ table_id: tableId, token, is_active: true })
    .select()
    .single()
  return { data, error, token }
}

// ============================================================
// STAFF (PROFILES)
// ============================================================
export async function getStaff(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["admin", "pos", "waiter"])
    .order("created_at", { ascending: false })
  if (error) return []
  return (data ?? []) as Profile[]
}

export async function updateStaff(id: string, input: Partial<Profile>) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("profiles").update(input).eq("id", id).select().single()
  return { data, error }
}

export async function deactivateStaff(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ is_active: false }).eq("id", id)
  return { error }
}

export async function activateStaff(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ is_active: true }).eq("id", id)
  return { error }
}

// ============================================================
// ORDERS
// ============================================================
export async function getOrders(filter?: { status?: OrderStatus; payment_status?: PaymentStatus; limit?: number }) {
  const supabase = await createClient()
  let query = supabase
    .from("orders")
    .select(`
      *,
      order_items(*),
      tables:table_id (label, zone)
    `)
    .order("created_at", { ascending: false })

  if (filter?.status) query = query.eq("status", filter.status)
  if (filter?.payment_status) query = query.eq("payment_status", filter.payment_status)
  if (filter?.limit) query = query.limit(filter.limit)

  const { data, error } = await query
  if (error) return []
  return (data ?? []) as OrderWithItems[]
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("orders")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select()
    .single()
  return { data, error }
}

// ============================================================
// RESERVATIONS
// ============================================================
export async function getReservations(): Promise<(Reservation & { tables: RestaurantTable | null })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("reservations")
    .select(`*, tables:table_id (*)`)
    .order("reserved_at", { ascending: true })
  if (error) return []
  return (data ?? []) as (Reservation & { tables: RestaurantTable | null })[]
}

export async function createReservation(input: Partial<Reservation>) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("reservations").insert(input).select().single()
  return { data, error }
}

export async function updateReservation(id: string, input: Partial<Reservation>) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("reservations").update(input).eq("id", id).select().single()
  return { data, error }
}

export async function deleteReservation(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("reservations").delete().eq("id", id)
  return { error }
}

// ============================================================
// ACTIVITY LOGS
// ============================================================
export async function getActivityLogs(limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []) as ActivityLog[]
}

// ============================================================
// REVENUE ANALYTICS (last 7 days)
// ============================================================
export async function getRevenueTrend(days = 7) {
  const supabase = await createClient()
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from("orders")
    .select("total, created_at, payment_status")
    .gte("created_at", start.toISOString())
    .eq("payment_status", "paid")

  if (error || !data) return []

  // Group by day
  const dayMap = new Map<string, number>()
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    dayMap.set(key, 0)
  }
  for (const o of data) {
    const key = new Date(o.created_at).toISOString().split("T")[0]
    dayMap.set(key, (dayMap.get(key) ?? 0) + Number(o.total))
  }
  return Array.from(dayMap.entries()).map(([date, total]) => ({ date, total }))
}

// ============================================================
// RESTAURANT SETTINGS
// ============================================================
export async function getRestaurantSettings(): Promise<RestaurantSettings | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()
  if (error) return null
  return (data as RestaurantSettings) ?? null
}
