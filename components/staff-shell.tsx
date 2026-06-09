"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { ROLE_LABELS } from "@/lib/constants"
import { signOut } from "@/app/actions/auth"
import type { Profile } from "@/lib/types"
import { LogOut, Menu, type LucideIcon } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

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
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
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

export function StaffShell({
  profile,
  items,
  title,
  children,
}: {
  profile: Profile
  items: NavItem[]
  title: string
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="px-5 py-4">
          <Brand variant="sidebar" />
        </div>
        <div className="mt-2 flex-1 overflow-y-auto">
          <NavLinks items={items} />
        </div>
        <SidebarFooter profile={profile} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="px-5 py-4">
                <Brand variant="sidebar" />
              </div>
              <div className="mt-2 flex-1">
                <NavLinks items={items} onNavigate={() => setMobileOpen(false)} />
              </div>
              <SidebarFooter profile={profile} />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
