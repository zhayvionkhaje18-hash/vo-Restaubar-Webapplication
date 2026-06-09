import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getReservations, getTables } from "@/lib/data/admin"
import { ReservationsManager } from "@/components/admin/reservations-manager"

export const dynamic = "force-dynamic"

export default async function AdminReservationsPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login?next=/admin/reservations")
  if (profile.role !== "admin") redirect("/")

  const [reservations, tables] = await Promise.all([getReservations(), getTables()])

  return <ReservationsManager reservations={reservations} tables={tables} />
}
