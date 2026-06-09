import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { ROLE_HOME } from "@/lib/constants"
import { StaffShell, type NavItem } from "@/components/staff-shell"
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3x3,
  Users,
  CalendarClock,
  ScanLine,
  History,
  ClipboardList,
} from "lucide-react"

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/tables", label: "Tables", icon: Grid3x3 },
  { href: "/admin/qr-codes", label: "QR Codes", icon: ScanLine },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarClock },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/activity", label: "Activity Log", icon: History },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login?next=/admin")
  if (profile.role !== "admin") redirect(ROLE_HOME[profile.role] ?? "/")

  return (
    <StaffShell profile={profile} items={NAV} title="Admin Console">
      {children}
    </StaffShell>
  )
}
