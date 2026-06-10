"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { ROLE_LABELS } from "@/lib/constants"
import { signOut } from "@/app/actions/auth"
import type { Profile } from "@/lib/types"
import {
  LogOut,
  Menu,
  Search,
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Grid3x3,
  Users,
  CalendarClock,
  ScanLine,
  History,
  Settings as SettingsIcon,
  Bell,
  ShoppingCart,
  Receipt,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  /** Icon name; resolved to a component via ICONS map. Use a string
   *  (not a component reference) so this type stays safe to pass from
   *  Server Components → Client Components (RSC serialization). */
  icon: keyof typeof ICONS
}

// Icon registry: server components reference icons by name, the client
// looks them up here. Add new icons to this map when you add new nav items.
const ICONS = {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Grid3x3,
  Users,
  CalendarClock,
  ScanLine,
  History,
  Settings: SettingsIcon,
  Bell,
  ShoppingCart,
  Receipt,
} as const satisfies Record<string, LucideIcon>

function initials(name?: string | null) {
  if (!name) return "U"
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {items.map((item) => {
        // Exact match OR subpath match (but not for /admin root to avoid double highlights)
        const isRootAdmin = item.href === "/admin"
        const active = pathname === item.href || (!isRootAdmin && pathname.startsWith(item.href + "/"))
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
            )}
            {(() => {
              const Icon = ICONS[item.icon]
              return (
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
                  )}
                />
              )
            })()}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter({ profile }: { profile: Profile }) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <Avatar className="size-8">
          <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
            {initials(profile.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-medium text-sidebar-foreground">{profile.full_name ?? "User"}</div>
          <div className="truncate text-xs text-sidebar-foreground/60">{ROLE_LABELS[profile.role]}</div>
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="size-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pb-1.5 pt-3 text-[0.65rem] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
      {children}
    </div>
  )
}

function LiveStatusPill() {
  return (
    <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 sm:inline-flex">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      Live
    </div>
  )
}

function Sidebar({
  items,
  profile,
  restaurantName,
  restaurantTagline,
  restaurantLogo,
}: {
  items: NavItem[]
  profile: Profile
  restaurantName?: string
  restaurantTagline?: string
  restaurantLogo?: string | null
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Brand
          variant="sidebar"
          name={restaurantName}
          tagline={restaurantTagline}
          logoUrl={restaurantLogo}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarSectionLabel>Workspace</SidebarSectionLabel>
        <NavLinks items={items} />
      </div>
      <SidebarFooter profile={profile} />
    </div>
  )
}

export function StaffShell({
  profile,
  items,
  title,
  children,
  restaurantName,
  restaurantTagline,
  restaurantLogo,
}: {
  profile: Profile
  items: NavItem[]
  title: string
  children: React.ReactNode
  restaurantName?: string
  restaurantTagline?: string
  restaurantLogo?: string | null
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Sidebar
          items={items}
          profile={profile}
          restaurantName={restaurantName}
          restaurantTagline={restaurantTagline}
          restaurantLogo={restaurantLogo}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Sidebar
                items={items}
                profile={profile}
                restaurantName={restaurantName}
                restaurantTagline={restaurantTagline}
                restaurantLogo={restaurantLogo}
              />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">{title}</h1>
            <LiveStatusPill />
          </div>

          <div className="hidden flex-1 md:flex md:max-w-md">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders, tables, menu..."
                className="h-9 pl-8 text-sm"
                aria-label="Global search"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 select-none rounded border border-border bg-muted px-1.5 font-mono text-[0.65rem] text-muted-foreground sm:inline-block">
                /
              </kbd>
            </div>
          </div>

          <Avatar className="size-8 lg:hidden">
            <AvatarFallback className="bg-muted text-xs">
              {initials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
