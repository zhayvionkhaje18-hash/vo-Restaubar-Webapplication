import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getRestaurantSettings } from "@/lib/data/admin"
import { ROLE_HOME } from "@/lib/constants"
import { StaffShell, type NavItem } from "@/components/staff-shell"

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/orders", label: "Orders", icon: "ClipboardList" },
  { href: "/admin/menu", label: "Menu", icon: "UtensilsCrossed" },
  { href: "/admin/tables", label: "Tables", icon: "Grid3x3" },
  { href: "/admin/qr-codes", label: "QR Codes", icon: "ScanLine" },
  { href: "/admin/reservations", label: "Reservations", icon: "CalendarClock" },
  { href: "/admin/staff", label: "Staff", icon: "Users" },
  { href: "/admin/activity", label: "Activity Log", icon: "History" },
  { href: "/admin/settings", label: "Settings", icon: "Settings" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [profile, settings] = await Promise.all([
    getSessionProfile(),
    getRestaurantSettings(),
  ])
  if (!profile) redirect("/login?next=/admin")
  if (profile.role !== "admin") redirect(ROLE_HOME[profile.role] ?? "/")

  return (
    <StaffShell
      profile={profile}
      items={NAV}
      title="Admin Console"
      restaurantName={settings?.name}
      restaurantTagline={settings?.tagline}
      restaurantLogo={settings?.logo_url}
    >
      {children}
    </StaffShell>
  )
}
