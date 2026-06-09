"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  Filter,
  History,
  Package,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateTime, relativeTime } from "@/lib/constants"
import type { ActivityLog } from "@/lib/types"

const ENTITY_ICONS: Record<string, LucideIcon> = {
  order: ShoppingCart,
  menu_item: UtensilsCrossed,
  category: UtensilsCrossed,
  table: Database,
  reservation: Activity,
  profile: Users,
  receipt: Receipt,
  payment: Receipt,
  qr: Settings,
}

function actionTone(action: string) {
  if (action.includes("deleted") || action.includes("cancelled")) return "destructive" as const
  if (action.includes("created")) return "default" as const
  if (action.includes("generated") || action.includes("logged")) return "secondary" as const
  return "outline" as const
}

export function ActivityManager({ logs }: { logs: ActivityLog[] }) {
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [actorFilter, setActorFilter] = useState<string>("all")
  const [expanded, setExpanded] = useState<string | null>(null)

  const entities = useMemo(() => {
    const s = new Set<string>()
    for (const l of logs) if (l.entity) s.add(l.entity)
    return Array.from(s).sort()
  }, [logs])

  const actions = useMemo(() => {
    const s = new Set<string>()
    for (const l of logs) s.add(l.action)
    return Array.from(s).sort()
  }, [logs])

  const actors = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of logs) {
      if (l.actor_id) m.set(l.actor_id, l.actor_name ?? "Unknown")
    }
    return Array.from(m.entries())
  }, [logs])

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (entityFilter !== "all" && l.entity !== entityFilter) return false
      if (actionFilter !== "all" && l.action !== actionFilter) return false
      if (actorFilter !== "all" && l.actor_id !== actorFilter) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        l.action.toLowerCase().includes(q) ||
        (l.actor_name ?? "").toLowerCase().includes(q) ||
        (l.detail ?? "").toLowerCase().includes(q)
      )
    })
  }, [logs, search, entityFilter, actionFilter, actorFilter])

  const grouped = useMemo(() => {
    const m = new Map<string, ActivityLog[]>()
    for (const log of filtered) {
      const day = new Date(log.created_at).toISOString().split("T")[0]
      if (!m.has(day)) m.set(day, [])
      m.get(day)!.push(log)
    }
    return Array.from(m.entries()).sort(([a], [b]) => (a < b ? 1 : -1))
  }, [filtered])

  const onExport = () => {
    const data = JSON.stringify(filtered, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description={`${filtered.length} of ${logs.length} events`}
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Activity" }]}
        actions={
          <Button size="sm" variant="outline" onClick={onExport} disabled={filtered.length === 0}>
            <Download className="mr-2 size-4" />
            Export JSON
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search actions, actors, details..."
              className="h-9 pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={entityFilter} onValueChange={(v) => v && setEntityFilter(v)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={(v) => v && setActionFilter(v)}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actorFilter} onValueChange={(v) => v && setActorFilter(v)}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              {actors.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || entityFilter !== "all" || actionFilter !== "all" || actorFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("")
                setEntityFilter("all")
                setActionFilter("all")
                setActorFilter("all")
              }}
            >
              <Filter className="mr-1 size-3" />
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <History className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Activity will appear here as staff make changes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => {
            const label = new Date(day).toLocaleDateString("en-PH", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })
            const isToday = new Date().toISOString().split("T")[0] === day
            const isYesterday =
              new Date(Date.now() - 86_400_000).toISOString().split("T")[0] === day
            return (
              <section key={day}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted">
                    <Package className="size-3" />
                  </span>
                  {isToday ? "Today" : isYesterday ? "Yesterday" : label}
                  <span className="font-normal">({items.length})</span>
                </h3>
                <Card>
                  <CardContent className="p-0">
                    <ul className="divide-y">
                      {items.map((log) => {
                        const Icon: LucideIcon = (log.entity ? ENTITY_ICONS[log.entity] : undefined) ?? Activity
                        const isOpen = expanded === log.id
                        return (
                          <li key={log.id} className="p-4">
                            <button
                              onClick={() => setExpanded(isOpen ? null : log.id)}
                              className="flex w-full items-start gap-3 text-left"
                            >
                              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                <Icon className="size-3.5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {log.actor_name ?? "System"}
                                  </span>
                                  <Badge variant={actionTone(log.action)} className="text-xs">
                                    {log.action}
                                  </Badge>
                                  {log.entity && (
                                    <span className="text-xs text-muted-foreground">
                                      on {log.entity}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{formatDateTime(log.created_at)}</span>
                                  <span>•</span>
                                  <span>{relativeTime(log.created_at)}</span>
                                </div>
                              </div>
                              {isOpen ? (
                                <ChevronDown className="size-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="size-4 text-muted-foreground" />
                              )}
                            </button>
                            {isOpen && log.detail && (
                              <pre className="mt-3 ml-10 max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                                {prettyJson(log.detail)}
                              </pre>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function prettyJson(detail: string) {
  try {
    const parsed = JSON.parse(detail)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return detail
  }
}
