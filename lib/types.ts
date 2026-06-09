export type UserRole = "admin" | "pos" | "waiter"
export type TableStatus = "available" | "occupied" | "reserved" | "cleaning"
export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled"
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded"
export type PaymentMethod = "cash" | "card" | "gcash" | "maya" | "other"
export type ReservationStatus = "pending" | "confirmed" | "seated" | "cancelled" | "no_show"

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RestaurantTable {
  id: string
  label: string
  seats: number
  zone: string | null
  status: TableStatus
  assigned_waiter: string | null
  created_at: string
  updated_at: string
}

export interface TableQrCode {
  id: string
  table_id: string
  token: string
  image_url: string | null
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  is_alcoholic: boolean
  prep_minutes: number | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_number: number
  table_id: string | null
  session_token: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  subtotal: number
  tax: number
  total: number
  notes: string | null
  created_by: string | null
  served_by: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string | null
  name: string
  unit_price: number
  quantity: number
  notes: string | null
  status: OrderStatus
  created_at: string
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  amount_tendered: number | null
  change_due: number | null
  reference: string | null
  processed_by: string | null
  created_at: string
}

export interface Receipt {
  id: string
  order_id: string
  payment_id: string | null
  receipt_number: string
  pdf_url: string | null
  image_url: string | null
  total: number
  created_at: string
}

export interface Reservation {
  id: string
  customer_name: string
  customer_phone: string | null
  party_size: number
  reserved_at: string
  table_id: string | null
  status: ReservationStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  actor_id: string | null
  actor_name: string | null
  action: string
  entity: string | null
  detail: string | null
  created_at: string
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[]
  tables?: Pick<RestaurantTable, "label" | "zone"> | null
}
