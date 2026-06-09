import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getTables } from "@/lib/data/admin"
import { QRCodesManager } from "@/components/admin/qr-codes-manager"

export const dynamic = "force-dynamic"

export default async function AdminQRCodesPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login?next=/admin/qr-codes")
  if (profile.role !== "admin") redirect("/")

  const tables = await getTables()
  return <QRCodesManager tables={tables} />
}
