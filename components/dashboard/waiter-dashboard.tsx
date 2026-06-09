"use client"

import { useState } from "react"
import { RefreshCw, CheckCircle2, Clock, Utensils, Bell, ClipboardList } from "lucide-react"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatTime } from "@/lib/constants"
import type { Profile } from "@/lib/types"

const NAV_ITEMS: NavItem[] = [
  { href: "/waiter", label: "My Tables", icon: "LayoutDashboard" },
  { href: "/waiter/orders", label: "Orders", icon: "ClipboardList" },
  { href: "/waiter/notifications", label: "Alerts", icon: "Bell" },
]

// Mock assigned tables
const MOCK_TABLES = [
  { id: "1", label: "A-1", seats: 4, status: "occupied", currentOrder: 2850 },
  { id: "2", label: "A-3", seats: 2, status: "occupied", currentOrder: 1560 },
  { id: "3", label: "B-2", seats: 6, status: "available", currentOrder: 0 },
]

// Mock order items for notifications
const MOCK_NOTIFICATIONS = [
  {
    id: "1",
    type: "new_order",
    table: "A-1",
    message: "New order received",
    time: new Date(),
    priority: "high",
  },
  {
    id: "2",
    type: "ready",
    table: "A-3",
    message: "Order #1045 is ready for pickup",
    time: new Date(Date.now() - 300000),
    priority: "medium",
  },
  {
    id: "3",
    type: "payment",
    table: "B-1",
    message: "Payment completed - ₱4,320",
    time: new Date(Date.now() - 600000),
    priority: "low",
  },
]

const STATUS_CONFIG = {
  available: { label: "Available", color: "bg-green-500", text: "text-green-500" },
  occupied: { label: "Occupied", color: "bg-orange-500", text: "text-orange-500" },
  reserved: { label: "Reserved", color: "bg-blue-500", text: "text-blue-500" },
  cleaning: { label: "Cleaning", color: "bg-gray-500", text: "text-gray-500" },
}

export function WaiterDashboard({ profile }: { profile: Profile }) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

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
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Tables Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_TABLES.map((table) => {
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

                  {table.status === "occupied" && (
                    <div className="mt-4 rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Current Order</span>
                        <span className="font-semibold text-primary">
                          {formatCurrency(table.currentOrder)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1" size="sm" asChild>
                      <a href={`/waiter/tables/${table.id}`}>View</a>
                    </Button>
                    {table.status === "available" && (
                      <Button variant="outline" size="sm">
                        Mark Occupied
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Notifications / Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4" />
              Recent Alerts
            </CardTitle>
            <Badge variant="secondary">{MOCK_NOTIFICATIONS.length} new</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MOCK_NOTIFICATIONS.map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-center gap-4 rounded-lg border p-3"
                >
                  <div
                    className={`flex size-10 items-center justify-center rounded-full ${
                      notif.priority === "high"
                        ? "bg-red-100 text-red-600"
                        : notif.priority === "medium"
                          ? "bg-yellow-100 text-yellow-600"
                          : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {notif.type === "new_order" && <ClipboardList className="size-5" />}
                    {notif.type === "ready" && <Utensils className="size-5" />}
                    {notif.type === "payment" && <CheckCircle2 className="size-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Table {notif.table}</div>
                    <div className="text-sm text-muted-foreground">{notif.message}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{formatTime(notif.time)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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