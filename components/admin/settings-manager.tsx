"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Clock,
  ImageIcon,
  Mail,
  MapPin,
  Percent,
  Phone,
  Receipt,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { updateRestaurantSettingsAction } from "@/app/actions/admin"
import type { RestaurantSettings } from "@/lib/types"

const DEFAULT_SETTINGS: RestaurantSettings = {
  id: 1,
  name: "Lumière",
  tagline: "Restaurant & Bar",
  address: null,
  phone: null,
  email: null,
  tin: null,
  logo_url: null,
  currency: "₱",
  tax_rate: 12,
  service_charge: 0,
  receipt_footer: null,
  open_time: "10:00:00",
  close_time: "23:00:00",
  updated_at: new Date().toISOString(),
}

export function SettingsManager({ settings }: { settings: RestaurantSettings | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const s = settings ?? DEFAULT_SETTINGS

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateRestaurantSettingsAction(fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restaurant Settings"
        description="Configure your restaurant's identity, tax rates, and operating hours."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Settings" }]}
        actions={
          <Button type="submit" form="settings-form" size="sm" disabled={pending}>
            <Save className={`mr-2 size-4 ${pending ? "animate-pulse" : ""}`} />
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      {success && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
          Settings saved successfully.
        </div>
      )}

      <form id="settings-form" onSubmit={onSubmit} className="space-y-6">
        {/* Identity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <CardTitle>Identity</CardTitle>
            </div>
            <CardDescription>How your restaurant appears to customers and on receipts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Restaurant name *</Label>
                <Input id="name" name="name" required defaultValue={s.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tagline">Tagline</Label>
                <Input id="tagline" name="tagline" defaultValue={s.tagline ?? ""} placeholder="Restaurant & Bar" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logo_url">Logo URL</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-md border bg-muted">
                  {s.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logo_url} alt="Logo" className="size-full rounded-md object-cover" />
                  ) : (
                    <ImageIcon className="size-5 text-muted-foreground" />
                  )}
                </div>
                <Input
                  id="logo_url"
                  name="logo_url"
                  type="url"
                  defaultValue={s.logo_url ?? ""}
                  placeholder="https://..."
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Upload via Supabase Storage → restaurant bucket, paste the public URL</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              <CardTitle>Contact</CardTitle>
            </div>
            <CardDescription>Contact details shown on receipts and customer-facing pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="address" className="flex items-center gap-1.5">
                <MapPin className="size-3" />
                Address
              </Label>
              <Textarea
                id="address"
                name="address"
                rows={2}
                defaultValue={s.address ?? ""}
                placeholder="Street, City, ZIP"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="size-3" />
                  Phone
                </Label>
                <Input id="phone" name="phone" type="tel" defaultValue={s.phone ?? ""} placeholder="+63 2 1234 5678" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  <Mail className="size-3" />
                  Email
                </Label>
                <Input id="email" name="email" type="email" defaultValue={s.email ?? ""} placeholder="hello@restaurant.com" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tin" className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3" />
                  TIN / Tax ID
                </Label>
                <Input id="tin" name="tin" defaultValue={s.tin ?? ""} placeholder="000-000-000-000" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Percent className="size-4 text-muted-foreground" />
              <CardTitle>Financial</CardTitle>
            </div>
            <CardDescription>Currency and applicable charges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency symbol</Label>
                <Input id="currency" name="currency" defaultValue={s.currency} maxLength={4} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax_rate">Tax rate (%)</Label>
                <Input
                  id="tax_rate"
                  name="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={s.tax_rate}
                />
                <p className="text-xs text-muted-foreground">Applied to order subtotals</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service_charge">Service charge (%)</Label>
                <Input
                  id="service_charge"
                  name="service_charge"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={s.service_charge}
                />
                <p className="text-xs text-muted-foreground">Optional, for larger parties</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="receipt_footer" className="flex items-center gap-1.5">
                <Receipt className="size-3" />
                Receipt footer
              </Label>
              <Textarea
                id="receipt_footer"
                name="receipt_footer"
                rows={2}
                defaultValue={s.receipt_footer ?? ""}
                placeholder="e.g. Thank you for dining with us!"
              />
            </div>
          </CardContent>
        </Card>

        {/* Hours */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <CardTitle>Operating Hours</CardTitle>
            </div>
            <CardDescription>Restaurant open and close times</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="open_time">Open time</Label>
                <Input
                  id="open_time"
                  name="open_time"
                  type="time"
                  defaultValue={(s.open_time ?? "10:00:00").slice(0, 5)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="close_time">Close time</Label>
                <Input
                  id="close_time"
                  name="close_time"
                  type="time"
                  defaultValue={(s.close_time ?? "23:00:00").slice(0, 5)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Badge variant="outline" className="text-xs">
            <SettingsIcon className="mr-1 size-3" />
            Last updated {new Date(s.updated_at).toLocaleString("en-PH")}
          </Badge>
          <Button type="submit" size="sm" disabled={pending}>
            <Save className={`mr-2 size-4 ${pending ? "animate-pulse" : ""}`} />
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
