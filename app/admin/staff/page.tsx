import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getStaff, getTables } from "@/lib/data/admin"
import { StaffManager } from "@/components/admin/staff-manager"

export const dynamic = "force-dynamic"

export default async function AdminStaffPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login?next=/admin/staff")
  if (profile.role !== "admin") redirect("/")

  const [staff, tables] = await Promise.all([getStaff(), getTables()])
  // Waiters: count tables assigned
  const enriched = staff.map((s) => ({
    ...s,
    assigned_tables: tables.filter((t) => t.assigned_waiter === s.id).map((t) => t.label),
  }))

  return <StaffManager staff={enriched} currentUserId={profile.id} />
}
