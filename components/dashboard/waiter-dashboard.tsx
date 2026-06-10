"use client"

import { useState, useEffect } from "react"
import { RefreshCw, CheckCircle2, Clock, Utensils, Bell, ClipboardList, AlertCircle } from "lucide-react"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatTime } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import type { Profile, Order, RestaurantTable } from "@/lib/types"

const NAV_ITEMS: NavItem[] = [
  { href: "/waiter", label: "My Tables", icon: "LayoutDashboard" },
  { href: "/waiter/orders", label: "Orders", icon: "ClipboardList" },
  { href: "/waiter/notifications", label: "Alerts", icon: "Bell" },
]

const STATUS_CONFIG = {
  available: { label: "Available", color: "bg-green-500", text: "text-green-500" },
  occupied: { label: "Occupied", color: "bg-orange-500", text: "text-orange-500" },
  reserved: { label: "Reserved", color: "bg-blue-500", text: "text-blue-500" },
  cleaning: { label: "Cleaning", color: "bg-gray-500", text: "text-gray-500" },
}

interface PendingOrder extends Order {
  table_label?: string
}

export function WaiterDashboard({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [refreshing, setRefreshing] = useState(false)
  const [tables, setTables] = useState<(RestaurantTable & { currentOrder?: number })[]>([])
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    
    // Fetch tables assigned to this waiter (or all tables if no assignment)
    const { data: tablesData } = await supabase
      .from("tables")
      .select("*")
      .or(`assigned_waiter.eq.${profile.id},assigned_waiter.is.null,status.neq.available`)
      .order("label")

    // Get pending orders
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, tables(label)")
      .in("status", ["pending", "confirmed"])
      .order("created_at", { ascending: true })

    setTables(tablesData ?? [])
    setPendingOrders((ordersData ?? []) as PendingOrder[])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [profile.id])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData().then(() => setRefreshing(false))
  }

  async function handleConfirmOrder(orderId: string) {
    setConfirmingOrder(orderId)
    const { error } = await supabase
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", orderId)

    if (!error) {
      // Log activity
      await supabase.rpc("log_activity", {
        p_action: "order.confirmed",
        p_entity: "order",
        p_entity_id: orderId,
        p_detail: JSON.stringify({ confirmed_by: profile.full_name })
      })
      loadData()
    }
    setConfirmingOrder(null)
  }

  async function handleStartPreparing(orderId: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: "preparing" })
      .eq("id", orderId)

    if (!error) {
      await supabase.rpc("log_activity", {
        p_action: "order.preparing",
        p_entity: "order",
        p_entity_id: orderId,
        p_detail: JSON.stringify({ started_by: profile.full_name })
      })
      loadData()
    }
  }

  async function handleMarkServed(orderId: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: "served" })
      .eq("id", orderId)

    if (!error) {
      await supabase.rpc("log_activity", {
        p_action: "order.served",
        p_entity: "order",
        p_entity_id: orderId,
        p_detail: JSON.stringify({ served_by: profile.full_name })
      })
      loadData()
    }
  }

  const pendingCount = pendingOrders.filter(o => o.status === "pending").length

  return (
    <StaffShell profile={profile} items={NAV_ITEMS} title="Waiter Console">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">My Assigned Tables</h2>
            <p className="text-sm text-muted-foreground">
              {profile.full_name || "Staff"} • {new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing || loading}>
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Pending Orders Alert */}
        {pendingCount > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <AlertCircle className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800">{pendingCount} Pending Order{pendingCount > 1 ? "s" : ""}</h3>
                <p className="text-sm text-orange-600">Go to table to confirm customer orders</p>
              </div>
              <Badge variant="destructive" className="text-lg px-3">{pendingCount}</Badge>
            </CardContent>
          </Card>
        )}

        {/* Pending Orders List */}
        {pendingOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="size-4" />
                Orders Requiring Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingOrders.map((order) => (
                <div key={order.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">#{order.order_number}</span>
                        <Badge variant={order.status === "pending" ? "destructive" : "secondary"}>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Table: <strong>{order.tables?.label ?? "Unknown"}</strong>
                        {order.customer_name && ` • Customer: ${order.customer_name}`}
                      </p>
                      <p className="text-lg font-bold text-primary mt-2">
                        ₱{order.total?.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {formatTime(new Date(order.created_at))}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {order.status === "pending" && (
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleConfirmOrder(order.id)}
                        disabled={confirmingOrder === order.id}
                      >
                        <CheckCircle2 className="mr-2 size-4" />
                        {confirmingOrder === order.id ? "Confirming..." : "Confirm Order"}
                      </Button>
                    )}
                    {order.status === "confirmed" && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleStartPreparing(order.id)}
                      >
                        <Utensils className="mr-2 size-4" />
                        Start Preparing
                      </Button>
                    )}
                    {order.status === "preparing" && (
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleMarkServed(order.id)}
                      >
                        <CheckCircle2 className="mr-2 size-4" />
                        Mark Served
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tables Grid */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Tables Overview</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => {
              const statusConfig = STATUS_CONFIG[table.status as keyof typeof STATUS_CONFIG]
              return (
                <Card key={table.id} className="overflow-hidden">
                  <div className={`h-1.5 ${statusConfig.color}`} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold">{table.label}</h3>
                        <p className="text-sm text-muted-foreground">{table.seats} seats</p>
                      </div>
                      <Badge variant="secondary" className={statusConfig.text}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {table.zone && (
                      <p className="mt-1 text-xs text-muted-foreground">{table.zone}</p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Button className="flex-1" size="sm" asChild>
                        <a href={`/waiter/tables/${table.id}`}>View</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <ClipboardList className="size-6" />
              </div>
              <div>
                <h3 className="font-medium">Take New Order</h3>
                <p className="text-sm text-muted-foreground">Select table and add items</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <h3 className="font-medium">Mark Order Served</h3>
                <p className="text-sm text-muted-foreground">Confirm items delivered</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StaffShell>
  )
}