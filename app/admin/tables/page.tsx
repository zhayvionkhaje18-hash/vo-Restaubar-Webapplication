import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getTables } from "@/lib/data/admin"
import { TablesManager } from "@/components/admin/tables-manager"

export const dynamic = "force-dynamic"

export default async function AdminTablesPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login?next=/admin/tables")
  if (profile.role !== "admin") redirect("/")

  const tables = await getTables()

  return <TablesManager tables={tables} />
}
